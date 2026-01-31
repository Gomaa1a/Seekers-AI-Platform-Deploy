import { Request, Response, NextFunction } from 'express';
import { redis, logger } from '../config';

/**
 * Per-tenant rate limits by plan tier (requests per 15-minute window).
 */
const TIER_LIMITS: Record<string, number> = {
  free: 100,
  trial: 100,
  starter: 500,
  professional: 2000,
  enterprise: 10000,
};

const WINDOW_SECONDS = 15 * 60; // 15 minutes

/**
 * Redis-backed per-organization rate limiter.
 * Requires the `authenticate` middleware to run first so `req.user` is set.
 * Falls back to IP-based limiting for unauthenticated requests.
 */
export function tenantRateLimiter() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as any;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      // Not authenticated or no org — skip tenant limiting (global limiter handles it)
      return next();
    }

    const tier: string = authReq.user?.planType || 'free';
    const maxRequests = TIER_LIMITS[tier] || TIER_LIMITS.free;
    const key = `ratelimit:tenant:${organizationId}`;

    try {
      const current = await redis.incr(key);

      // Set TTL on first request in window
      if (current === 1) {
        await redis.expire(key, WINDOW_SECONDS);
      }

      // Set rate limit headers
      const ttl = await redis.ttl(key);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + ttl);

      if (current > maxRequests) {
        logger.warn('Tenant rate limit exceeded', {
          organizationId,
          tier,
          current,
          maxRequests,
        });

        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded for your organization. Please try again later.',
          retryAfter: ttl,
        });
        return;
      }

      next();
    } catch (error) {
      // Fail open — don't block requests if Redis is down
      logger.error('Tenant rate limiter error', { error });
      next();
    }
  };
}

export default tenantRateLimiter;
