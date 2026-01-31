import { db, redis, logger } from '../config';
import {
  SubscriptionPlan,
  Subscription,
  Payment,
  UsageRecord,
  UsageSummary,
  PlanLimits,
  PlanSlug,
  UsageMetric,
} from '../types';

export class BillingService {
  // ============================================
  // Plans
  // ============================================

  async getAllPlans(): Promise<SubscriptionPlan[]> {
    return db.queryAll<SubscriptionPlan>(
      'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order ASC'
    );
  }

  async getPlanBySlug(slug: PlanSlug): Promise<SubscriptionPlan | null> {
    return db.queryOne<SubscriptionPlan>(
      'SELECT * FROM subscription_plans WHERE slug = $1 AND is_active = true',
      [slug]
    );
  }

  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    return db.queryOne<SubscriptionPlan>(
      'SELECT * FROM subscription_plans WHERE id = $1',
      [planId]
    );
  }

  // ============================================
  // Subscriptions
  // ============================================

  async getSubscription(organizationId: string): Promise<(Subscription & { plan: SubscriptionPlan }) | null> {
    const result = await db.queryOne<Subscription & SubscriptionPlan & { plan_name: string }>(
      `SELECT s.*, sp.name as plan_name, sp.slug, sp.price_monthly, sp.price_yearly,
              sp.max_conversations_per_month, sp.max_facebook_pages, sp.max_instagram_accounts,
              sp.max_knowledge_bases, sp.max_workflows, sp.max_addon_requests,
              sp.dedicated_webhook, sp.priority_support, sp.custom_branding, sp.api_access, sp.analytics_advanced
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.organization_id = $1`,
      [organizationId]
    );

    if (!result) return null;

    return {
      ...result,
      plan: {
        id: result.plan_id,
        name: result.plan_name,
        slug: result.slug,
        price_monthly: result.price_monthly,
        price_yearly: result.price_yearly,
        max_conversations_per_month: result.max_conversations_per_month,
        max_facebook_pages: result.max_facebook_pages,
        max_instagram_accounts: result.max_instagram_accounts,
        max_knowledge_bases: result.max_knowledge_bases,
        max_workflows: result.max_workflows,
        max_addon_requests: result.max_addon_requests,
        dedicated_webhook: result.dedicated_webhook,
        priority_support: result.priority_support,
        custom_branding: result.custom_branding,
        api_access: result.api_access,
        analytics_advanced: result.analytics_advanced,
      } as SubscriptionPlan,
    };
  }

  async createFreeSubscription(organizationId: string): Promise<Subscription> {
    const freePlan = await this.getPlanBySlug('free');
    if (!freePlan) throw new Error('Free plan not found');

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return db.queryOne<Subscription>(
      `INSERT INTO subscriptions (organization_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
       VALUES ($1, $2, 'active', 'monthly', $3, $4)
       RETURNING *`,
      [organizationId, freePlan.id, now, periodEnd]
    ) as Promise<Subscription>;
  }

  async updateSubscription(
    organizationId: string,
    data: {
      planId?: string;
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      status?: string;
      billingCycle?: string;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      trialEndsAt?: Date;
    }
  ): Promise<Subscription> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.planId) { fields.push(`plan_id = $${idx++}`); values.push(data.planId); }
    if (data.stripeCustomerId) { fields.push(`stripe_customer_id = $${idx++}`); values.push(data.stripeCustomerId); }
    if (data.stripeSubscriptionId) { fields.push(`stripe_subscription_id = $${idx++}`); values.push(data.stripeSubscriptionId); }
    if (data.status) { fields.push(`status = $${idx++}`); values.push(data.status); }
    if (data.billingCycle) { fields.push(`billing_cycle = $${idx++}`); values.push(data.billingCycle); }
    if (data.currentPeriodStart) { fields.push(`current_period_start = $${idx++}`); values.push(data.currentPeriodStart); }
    if (data.currentPeriodEnd) { fields.push(`current_period_end = $${idx++}`); values.push(data.currentPeriodEnd); }
    if (data.trialEndsAt) { fields.push(`trial_ends_at = $${idx++}`); values.push(data.trialEndsAt); }

    values.push(organizationId);

    return db.queryOne<Subscription>(
      `UPDATE subscriptions SET ${fields.join(', ')} WHERE organization_id = $${idx} RETURNING *`,
      values
    ) as Promise<Subscription>;
  }

  async cancelSubscription(organizationId: string): Promise<Subscription> {
    return db.queryOne<Subscription>(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE organization_id = $1 RETURNING *`,
      [organizationId]
    ) as Promise<Subscription>;
  }

  // ============================================
  // Plan Limits
  // ============================================

  async getPlanLimits(organizationId: string): Promise<PlanLimits> {
    const cacheKey = `plan_limits:${organizationId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const sub = await this.getSubscription(organizationId);
    if (!sub) {
      const freePlan = await this.getPlanBySlug('free');
      if (!freePlan) throw new Error('Free plan not configured');
      return {
        max_conversations_per_month: freePlan.max_conversations_per_month,
        max_facebook_pages: freePlan.max_facebook_pages,
        max_instagram_accounts: freePlan.max_instagram_accounts,
        max_knowledge_bases: freePlan.max_knowledge_bases,
        max_workflows: freePlan.max_workflows,
        max_addon_requests: freePlan.max_addon_requests,
        dedicated_webhook: freePlan.dedicated_webhook,
      };
    }

    const limits: PlanLimits = {
      max_conversations_per_month: sub.plan.max_conversations_per_month,
      max_facebook_pages: sub.plan.max_facebook_pages,
      max_instagram_accounts: sub.plan.max_instagram_accounts,
      max_knowledge_bases: sub.plan.max_knowledge_bases,
      max_workflows: sub.plan.max_workflows,
      max_addon_requests: sub.plan.max_addon_requests,
      dedicated_webhook: sub.plan.dedicated_webhook,
    };

    await redis.set(cacheKey, JSON.stringify(limits), 'EX', 300); // 5 min cache
    return limits;
  }

  // ============================================
  // Usage Tracking
  // ============================================

  async incrementUsage(organizationId: string, metric: UsageMetric, count: number = 1): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await db.query(
      `INSERT INTO usage_records (organization_id, metric, count, period_start, period_end)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (organization_id, metric, period_start)
       DO UPDATE SET count = usage_records.count + $3, updated_at = NOW()`,
      [organizationId, metric, count, periodStart, periodEnd]
    );
  }

  async getUsage(organizationId: string, metric: UsageMetric): Promise<number> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await db.queryOne<{ count: number }>(
      `SELECT count FROM usage_records
       WHERE organization_id = $1 AND metric = $2 AND period_start = $3`,
      [organizationId, metric, periodStart]
    );

    return result?.count || 0;
  }

  async getUsageSummary(organizationId: string): Promise<UsageSummary> {
    const limits = await this.getPlanLimits(organizationId);
    const conversationUsage = await this.getUsage(organizationId, 'conversations');

    // Count current resources
    const counts = await db.queryOne<{
      fb_pages: string;
      ig_accounts: string;
      kbs: string;
      workflows: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM facebook_pages WHERE organization_id = $1 AND is_active = true) as fb_pages,
         (SELECT COUNT(*) FROM instagram_accounts WHERE organization_id = $1 AND is_active = true) as ig_accounts,
         (SELECT COUNT(*) FROM knowledge_bases WHERE organization_id = $1 AND is_active = true) as kbs,
         (SELECT COUNT(*) FROM n8n_workflows WHERE organization_id = $1 AND is_active = true) as workflows`,
      [organizationId]
    );

    return {
      conversations: { used: conversationUsage, limit: limits.max_conversations_per_month },
      facebook_pages: { used: parseInt(counts?.fb_pages || '0'), limit: limits.max_facebook_pages },
      instagram_accounts: { used: parseInt(counts?.ig_accounts || '0'), limit: limits.max_instagram_accounts },
      knowledge_bases: { used: parseInt(counts?.kbs || '0'), limit: limits.max_knowledge_bases },
      workflows: { used: parseInt(counts?.workflows || '0'), limit: limits.max_workflows },
    };
  }

  async checkLimit(organizationId: string, metric: UsageMetric): Promise<{ allowed: boolean; current: number; limit: number }> {
    const limits = await this.getPlanLimits(organizationId);
    const current = await this.getUsage(organizationId, metric);

    const limitMap: Record<UsageMetric, number> = {
      conversations: limits.max_conversations_per_month,
      messages: limits.max_conversations_per_month * 100, // rough estimate
      webhook_calls: limits.max_conversations_per_month * 10,
      api_calls: limits.max_conversations_per_month * 50,
    };

    const limit = limitMap[metric];
    return { allowed: current < limit, current, limit };
  }

  // ============================================
  // Payments
  // ============================================

  async getPayments(organizationId: string, limit: number = 20, offset: number = 0): Promise<Payment[]> {
    return db.queryAll<Payment>(
      `SELECT * FROM payments WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset]
    );
  }

  async recordPayment(data: {
    organizationId: string;
    subscriptionId?: string;
    stripePaymentIntentId?: string;
    stripeInvoiceId?: string;
    amount: number;
    currency?: string;
    status: string;
    description?: string;
  }): Promise<Payment> {
    return db.queryOne<Payment>(
      `INSERT INTO payments (organization_id, subscription_id, stripe_payment_intent_id, stripe_invoice_id, amount, currency, status, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.organizationId,
        data.subscriptionId || null,
        data.stripePaymentIntentId || null,
        data.stripeInvoiceId || null,
        data.amount,
        data.currency || 'USD',
        data.status,
        data.description || null,
      ]
    ) as Promise<Payment>;
  }

  // ============================================
  // Stripe Webhook Handlers
  // ============================================

  async handleStripeEvent(event: { type: string; data: { object: any } }): Promise<void> {
    const { type, data } = event;

    logger.info('Processing Stripe event', { type });

    switch (type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = data.object;
        const orgSub = await db.queryOne<Subscription>(
          'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
          [sub.id]
        );
        if (orgSub) {
          await this.updateSubscription(orgSub.organization_id, {
            status: sub.status === 'active' ? 'active' : sub.status === 'trialing' ? 'trialing' : 'past_due',
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = data.object;
        const orgSub = await db.queryOne<Subscription>(
          'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
          [sub.id]
        );
        if (orgSub) {
          await this.updateSubscription(orgSub.organization_id, { status: 'cancelled' });
          // Downgrade to free plan
          const freePlan = await this.getPlanBySlug('free');
          if (freePlan) {
            await this.updateSubscription(orgSub.organization_id, { planId: freePlan.id, status: 'active' });
          }
          // Invalidate cache
          await redis.del(`plan_limits:${orgSub.organization_id}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = data.object;
        if (invoice.subscription) {
          const orgSub = await db.queryOne<Subscription>(
            'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
            [invoice.subscription]
          );
          if (orgSub) {
            await this.recordPayment({
              organizationId: orgSub.organization_id,
              subscriptionId: orgSub.id,
              stripeInvoiceId: invoice.id,
              stripePaymentIntentId: invoice.payment_intent,
              amount: invoice.amount_paid / 100,
              currency: invoice.currency.toUpperCase(),
              status: 'succeeded',
              description: `Invoice ${invoice.number}`,
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = data.object;
        if (invoice.subscription) {
          const orgSub = await db.queryOne<Subscription>(
            'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
            [invoice.subscription]
          );
          if (orgSub) {
            await this.updateSubscription(orgSub.organization_id, { status: 'past_due' });
            await this.recordPayment({
              organizationId: orgSub.organization_id,
              subscriptionId: orgSub.id,
              stripeInvoiceId: invoice.id,
              amount: invoice.amount_due / 100,
              currency: invoice.currency.toUpperCase(),
              status: 'failed',
              description: `Failed payment for invoice ${invoice.number}`,
            });
          }
        }
        break;
      }

      default:
        logger.debug('Unhandled Stripe event', { type });
    }
  }
}

export const billingService = new BillingService();
export default billingService;
