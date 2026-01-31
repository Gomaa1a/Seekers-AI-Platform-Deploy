import { Request, Response, NextFunction } from 'express';
import { billingService } from './billing.service';
import { logger } from '../config';
import { UsageMetric } from '../types';

/**
 * Middleware factory: checks usage limit before allowing the request through.
 * Usage: router.post('/conversations', checkUsageLimit('conversations'), handler)
 */
export function checkUsageLimit(metric: UsageMetric) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = (req as any).user?.organizationId;
      if (!organizationId) {
        next();
        return;
      }

      const { allowed, current, limit } = await billingService.checkLimit(organizationId, metric);

      if (!allowed) {
        res.status(429).json({
          success: false,
          message: `Usage limit reached for ${metric}. Current: ${current}, Limit: ${limit}. Please upgrade your plan.`,
          error: 'USAGE_LIMIT_EXCEEDED',
          data: { metric, current, limit },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Usage limit check failed', { error, metric });
      // Fail open - don't block if metering is down
      next();
    }
  };
}

/**
 * Middleware: increments usage counter after successful response.
 * Usage: router.post('/conversations', trackUsage('conversations'), handler)
 */
export function trackUsage(metric: UsageMetric, countFn?: (req: Request) => number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Hook into response finish to track only successful requests
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const organizationId = (req as any).user?.organizationId;
        if (organizationId) {
          const count = countFn ? countFn(req) : 1;
          billingService.incrementUsage(organizationId, metric, count).catch((err) => {
            logger.error('Failed to track usage', { error: err, metric, organizationId });
          });
        }
      }
      return originalEnd.apply(res, args);
    } as any;

    next();
  };
}
