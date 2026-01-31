// ============================================
// Subscription & Billing Types
// ============================================

export type PlanSlug = 'free' | 'starter' | 'professional' | 'enterprise';
export type SubStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
export type SubBillingCycle = 'monthly' | 'yearly';
export type SubPaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type UsageMetric = 'conversations' | 'messages' | 'webhook_calls' | 'api_calls';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: PlanSlug;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  max_conversations_per_month: number;
  max_facebook_pages: number;
  max_instagram_accounts: number;
  max_knowledge_bases: number;
  max_workflows: number;
  max_addon_requests: number;
  dedicated_webhook: boolean;
  priority_support: boolean;
  custom_branding: boolean;
  api_access: boolean;
  analytics_advanced: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubStatus;
  billing_cycle: SubBillingCycle;
  current_period_start: Date | null;
  current_period_end: Date | null;
  trial_ends_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  amount: number;
  currency: string;
  status: SubPaymentStatus;
  description: string | null;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface UsageRecord {
  id: string;
  organization_id: string;
  metric: UsageMetric;
  count: number;
  period_start: Date;
  period_end: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PlanLimits {
  max_conversations_per_month: number;
  max_facebook_pages: number;
  max_instagram_accounts: number;
  max_knowledge_bases: number;
  max_workflows: number;
  max_addon_requests: number;
  dedicated_webhook: boolean;
}

export interface UsageSummary {
  conversations: { used: number; limit: number };
  facebook_pages: { used: number; limit: number };
  instagram_accounts: { used: number; limit: number };
  knowledge_bases: { used: number; limit: number };
  workflows: { used: number; limit: number };
}
