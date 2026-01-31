/**
 * Usage Limit Enforcement Middleware
 * Comprehensive middleware for enforcing subscription limits
 */

import { Request, Response, NextFunction } from 'express';
import { billingService, notificationService } from '../services';
import { logger } from '../config';
import { UsageMetric } from '../types';

/**
 * Check usage limit for a specific metric before allowing the request
 */
export function enforceUsageLimit(metric: UsageMetric) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = (req as any).user?.organizationId;
      if (!organizationId) {
        next();
        return;
      }

      const { allowed, current, limit } = await billingService.checkLimit(organizationId, metric);

      if (!allowed) {
        // Notify user about limit reached
        await notificationService.notifyClient(organizationId, {
          type: 'usage_limit',
          title: 'Usage Limit Reached',
          message: `You've reached your ${metric} limit. Current: ${current}/${limit}. Upgrade to continue.`,
          metadata: { metric, current, limit },
        });

        res.status(429).json({
          success: false,
          message: `Usage limit reached for ${metric}. Current: ${current}, Limit: ${limit}. Please upgrade your plan.`,
          error: 'USAGE_LIMIT_EXCEEDED',
          data: { metric, current, limit },
        });
        return;
      }

      // Warn when approaching limit (80%)
      if (current >= limit * 0.8) {
        // Add warning header
        res.setHeader('X-Usage-Warning', `${metric}: ${current}/${limit} (${Math.round((current / limit) * 100)}%)`);
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
 * Check resource limit before allowing creation of new resources
 */
export function enforceResourceLimit(resourceType: 'facebook_pages' | 'instagram_accounts' | 'knowledge_bases' | 'workflows') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = (req as any).user?.organizationId;
      if (!organizationId) {
        next();
        return;
      }

      const summary = await billingService.getUsageSummary(organizationId);
      const resource = summary[resourceType];

      if (resource.used >= resource.limit) {
        res.status(403).json({
          success: false,
          message: `You have reached your maximum ${resourceType.replace('_', ' ')} limit (${resource.limit}). Please upgrade your plan to add more.`,
          error: 'RESOURCE_LIMIT_EXCEEDED',
          data: { 
            resourceType, 
            current: resource.used, 
            limit: resource.limit 
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Resource limit check failed', { error, resourceType });
      next();
    }
  };
}

/**
 * Check if organization has access to a premium feature
 */
export function enforcePremiumFeature(feature: 'dedicated_webhook' | 'priority_support' | 'custom_branding' | 'api_access' | 'analytics_advanced') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = (req as any).user?.organizationId;
      if (!organizationId) {
        next();
        return;
      }

      const subscription = await billingService.getSubscription(organizationId);
      
      if (!subscription || !subscription.plan[feature]) {
        res.status(403).json({
          success: false,
          message: `This feature requires a premium plan. Please upgrade to access ${feature.replace('_', ' ')}.`,
          error: 'PREMIUM_FEATURE_REQUIRED',
          data: { feature, requiredPlan: 'starter' },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Premium feature check failed', { error, feature });
      next();
    }
  };
}

/**
 * Check if subscription is active
 */
export async function enforceActiveSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      next();
      return;
    }

    const subscription = await billingService.getSubscription(organizationId);
    
    if (!subscription) {
      // No subscription - let them use free tier
      next();
      return;
    }

    const invalidStatuses = ['suspended', 'cancelled', 'expired'];
    if (invalidStatuses.includes(subscription.status)) {
      res.status(403).json({
        success: false,
        message: `Your subscription is ${subscription.status}. Please renew to continue using the service.`,
        error: 'SUBSCRIPTION_INACTIVE',
        data: { status: subscription.status },
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Subscription status check failed', { error });
    next();
  }
}

/**
 * Warn user when usage is approaching limit
 */
export async function usageWarningMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      next();
      return;
    }

    const summary = await billingService.getUsageSummary(organizationId);
    const warnings: string[] = [];

    // Check each metric
    for (const [key, value] of Object.entries(summary)) {
      if (value.limit > 0) {
        const percentage = (value.used / value.limit) * 100;
        if (percentage >= 80) {
          warnings.push(`${key}: ${Math.round(percentage)}%`);
        }
      }
    }

    if (warnings.length > 0) {
      res.setHeader('X-Usage-Warnings', warnings.join(', '));
    }

    next();
  } catch (error) {
    logger.error('Usage warning check failed', { error });
    next();
  }
}

/**
 * Track usage after successful response
 */
export function trackUsageOnSuccess(metric: UsageMetric, countFn?: (req: Request) => number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
