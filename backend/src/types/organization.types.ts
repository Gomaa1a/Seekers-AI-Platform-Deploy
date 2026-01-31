// ============================================
// Organization Types
// ============================================

export type SubscriptionTier = 'trial' | 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'pending' | 'active' | 'suspended' | 'cancelled';

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  industry: string | null;
  website: string | null;
  logo_url: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  subscription_starts_at: Date;
  subscription_ends_at: Date | null;
  onboarding_completed: boolean;
  meta_connected: boolean;
  knowledge_base_added: boolean;
  workflow_requested: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  settings: Record<string, any>;
  assigned_admin_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOrganizationInput {
  name: string;
  ownerId: string;
  industry?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  domain?: string;
  logoUrl?: string;
  timezone?: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationInput {
  name?: string;
  industry?: string;
  website?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  settings?: Record<string, any>;
  domain?: string;
  timezone?: string;
  status?: SubscriptionStatus;
  planType?: SubscriptionTier;
  n8n_base_webhook_url?: string | null;
}

// ============================================
// Pricing Model Types
// ============================================

export type PricingType = 'custom' | 'standard' | 'enterprise';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface PricingModel {
  id: string;
  organization_id: string;
  pricing_type: PricingType;
  setup_fee: number;
  monthly_fee: number;
  currency: string;
  max_conversations_per_month: number | null;
  max_connected_pages: number | null;
  max_workflows: number | null;
  max_knowledge_bases: number | null;
  features_enabled: Record<string, boolean>;
  contract_start_date: Date | null;
  contract_end_date: Date | null;
  payment_status: PaymentStatus;
  billing_cycle: BillingCycle;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Activity Log Types
// ============================================

export type ActivityUserType = 'client' | 'admin';
export type ActivityAction = 
  | 'login' 
  | 'logout' 
  | 'register'
  | 'page_connected' 
  | 'page_disconnected'
  | 'instagram_connected'
  | 'instagram_disconnected'
  | 'kb_created' 
  | 'kb_updated' 
  | 'kb_deleted'
  | 'workflow_requested'
  | 'workflow_assigned'
  | 'workflow_activated'
  | 'addon_requested'
  | 'addon_configured'
  | 'settings_updated'
  | 'meta_connected'
  | 'meta_disconnected';

export interface ActivityLog {
  id: string;
  user_type: ActivityUserType;
  user_id: string | null;
  admin_id: string | null;
  organization_id: string | null;
  action: ActivityAction;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface CreateActivityLogInput {
  userType: ActivityUserType;
  userId?: string;
  adminId?: string;
  organizationId?: string;
  action: ActivityAction;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}
