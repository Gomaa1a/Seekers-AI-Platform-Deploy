-- ============================================
-- Seekers AI Platform - Enterprise SaaS Tables
-- Version: 2.0.0
-- ============================================

-- ============================================
-- Subscription Plans Table
-- ============================================
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE CHECK (slug IN ('free', 'starter', 'professional', 'enterprise')),
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_yearly VARCHAR(255),

    -- Feature limits
    max_conversations_per_month INTEGER NOT NULL DEFAULT 100,
    max_facebook_pages INTEGER NOT NULL DEFAULT 1,
    max_instagram_accounts INTEGER NOT NULL DEFAULT 1,
    max_knowledge_bases INTEGER NOT NULL DEFAULT 1,
    max_workflows INTEGER NOT NULL DEFAULT 1,
    max_addon_requests INTEGER NOT NULL DEFAULT 0,

    -- Feature flags
    dedicated_webhook BOOLEAN NOT NULL DEFAULT FALSE,
    priority_support BOOLEAN NOT NULL DEFAULT FALSE,
    custom_branding BOOLEAN NOT NULL DEFAULT FALSE,
    api_access BOOLEAN NOT NULL DEFAULT FALSE,
    analytics_advanced BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_slug ON subscription_plans(slug);

-- ============================================
-- Subscriptions Table
-- ============================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),

    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'past_due', 'suspended', 'cancelled', 'expired')),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),

    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- ============================================
-- Payments Table
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),

    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),

    description TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================
-- Usage Records Table
-- ============================================
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    metric VARCHAR(100) NOT NULL CHECK (metric IN ('conversations', 'messages', 'webhook_calls', 'api_calls')),
    count INTEGER NOT NULL DEFAULT 1,

    -- Period tracking (monthly buckets)
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, metric, period_start)
);

CREATE INDEX idx_usage_records_org ON usage_records(organization_id);
CREATE INDEX idx_usage_records_period ON usage_records(period_start, period_end);
CREATE INDEX idx_usage_records_metric ON usage_records(metric);

-- ============================================
-- Workflow Connections Table
-- ============================================
CREATE TABLE workflow_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES n8n_workflows(id) ON DELETE CASCADE,
    facebook_page_id UUID REFERENCES facebook_pages(id) ON DELETE CASCADE,
    instagram_account_id UUID REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CHECK (facebook_page_id IS NOT NULL OR instagram_account_id IS NOT NULL),
    UNIQUE(workflow_id, facebook_page_id),
    UNIQUE(workflow_id, instagram_account_id)
);

CREATE INDEX idx_workflow_connections_workflow ON workflow_connections(workflow_id);
CREATE INDEX idx_workflow_connections_page ON workflow_connections(facebook_page_id);
CREATE INDEX idx_workflow_connections_ig ON workflow_connections(instagram_account_id);

-- ============================================
-- Add n8n base webhook URL to organizations
-- ============================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS n8n_base_webhook_url TEXT;

-- ============================================
-- Apply updated_at triggers
-- ============================================
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_records_updated_at BEFORE UPDATE ON usage_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Seed Default Plans
-- ============================================
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly,
    max_conversations_per_month, max_facebook_pages, max_instagram_accounts,
    max_knowledge_bases, max_workflows, max_addon_requests,
    dedicated_webhook, priority_support, custom_branding, api_access, analytics_advanced,
    sort_order)
VALUES
    ('Free', 'free', 'Get started with basic AI automation', 0, 0,
     100, 1, 1, 1, 1, 0,
     FALSE, FALSE, FALSE, FALSE, FALSE, 0),
    ('Starter', 'starter', 'For growing businesses', 29.00, 290.00,
     500, 3, 3, 3, 3, 2,
     TRUE, FALSE, FALSE, FALSE, FALSE, 1),
    ('Professional', 'professional', 'For established businesses', 79.00, 790.00,
     2000, 10, 10, 10, 10, 10,
     TRUE, TRUE, TRUE, TRUE, TRUE, 2),
    ('Enterprise', 'enterprise', 'Custom solutions for large organizations', 199.00, 1990.00,
     999999, 999, 999, 999, 999, 999,
     TRUE, TRUE, TRUE, TRUE, TRUE, 3);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE subscription_plans IS 'Available subscription tiers with feature limits';
COMMENT ON TABLE subscriptions IS 'Active subscriptions linking organizations to plans';
COMMENT ON TABLE payments IS 'Payment history and invoice records';
COMMENT ON TABLE usage_records IS 'Monthly usage tracking per organization per metric';
COMMENT ON TABLE workflow_connections IS 'Links n8n workflows to specific pages/accounts';
