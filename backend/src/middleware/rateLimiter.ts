import rateLimit from 'express-rate-limit';
import { config, logger } from '../config';
import { Request, Response } from 'express';

/**
 * Default rate limiter for API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs, // 15 minutes
  max: config.security.rateLimitMaxRequests, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
    });
  },
  keyGenerator: (req: Request): string => {
    // Use user ID if authenticated, otherwise IP
    const authReq = req as any;
    return authReq.user?.userId || authReq.admin?.adminId || req.ip || 'unknown';
  },
});

/**
 * Stricter rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.app.isProduction ? 10 : 100, // 10 in production, 100 in development
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      email: req.body?.email,
    });
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again in 15 minutes.',
    });
  },
});

/**
 * Rate limiter for admin endpoints
 */
export const adminLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitAdminMax, // Higher limit for admins
  message: {
    success: false,
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const authReq = req as any;
    return authReq.admin?.adminId || req.ip || 'unknown';
  },
});

/**
 * Rate limiter for webhook endpoints (higher limit)
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 webhooks per minute
  message: 'Webhook rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.error('Webhook rate limit exceeded', {
      ip: req.ip,
    });
    res.status(429).send('Too many webhooks');
  },
});

/**
 * Rate limiter for password reset
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: {
    success: false,
    error: 'Too many password reset attempts. Please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for Meta OAuth (prevent abuse)
 */
export const oauthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 OAuth attempts per hour
  message: {
    success: false,
    error: 'Too many OAuth attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default apiLimiter;
