-- ============================================
-- Seekers AI Platform - Platform Settings & Free Tier Trial
-- Version: 5.0.0
-- ============================================

-- ============================================
-- Platform Settings Table (Global Admin Settings)
-- ============================================
CREATE TABLE platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Apply updated_at trigger
CREATE TRIGGER update_platform_settings_updated_at 
    BEFORE UPDATE ON platform_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Seed Default Platform Settings
-- ============================================
INSERT INTO platform_settings (key, value, description) VALUES
    ('free_tier_webhook_url', '"https://n8n.yourdomain.com/webhook/free-tier"', 'Base n8n webhook URL for free tier users (auto-connected on social connect)'),
    ('free_tier_trial_hours', '24', 'Number of hours for free tier trial before auto-disconnect'),
    ('maintenance_mode', 'false', 'When enabled, clients cannot submit new requests'),
    ('meta_app_id', '""', 'Meta App ID for OAuth'),
    ('meta_app_secret', '""', 'Meta App Secret (stored encrypted in env, this is display only)'),
    ('pricing_tiers', '{"free": 0, "starter": 29, "professional": 79, "enterprise": 199}', 'Pricing tiers for display purposes');

-- ============================================
-- Add trial tracking columns to organizations
-- ============================================
ALTER TABLE organizations 
    ADD COLUMN IF NOT EXISTS free_tier_trial_started_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS free_tier_trial_ends_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS free_tier_auto_connected BOOLEAN DEFAULT FALSE;

-- ============================================
-- Free Tier Connections Log (audit trail)
-- ============================================
CREATE TABLE free_tier_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    webhook_url TEXT NOT NULL,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    disconnected_at TIMESTAMP WITH TIME ZONE,
    disconnection_reason VARCHAR(50) CHECK (disconnection_reason IN ('trial_expired', 'manual', 'upgraded', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_free_tier_connections_org ON free_tier_connections(organization_id);
CREATE INDEX idx_free_tier_connections_user ON free_tier_connections(user_id);
CREATE INDEX idx_free_tier_connections_active ON free_tier_connections(disconnected_at) WHERE disconnected_at IS NULL;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE platform_settings IS 'Global platform configuration settings managed by admins';
COMMENT ON TABLE free_tier_connections IS 'Audit log of free tier auto-connections and disconnections';
COMMENT ON COLUMN organizations.free_tier_trial_started_at IS 'When the free tier 24h trial started';
COMMENT ON COLUMN organizations.free_tier_trial_ends_at IS 'When the free tier 24h trial expires';
COMMENT ON COLUMN organizations.free_tier_auto_connected IS 'Whether this org is currently auto-connected to free tier webhook';
