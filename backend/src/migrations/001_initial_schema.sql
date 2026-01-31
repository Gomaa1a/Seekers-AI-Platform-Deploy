-- ============================================
-- Seekers AI Platform - Initial Database Schema
-- Version: 1.0.0
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Admin Users Table
-- ============================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'support')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- ============================================
-- Users Table (Clients)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_verification')),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- ============================================
-- Organizations Table
-- ============================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    logo_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'trial')),
    plan_type VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'professional', 'enterprise')),
    settings JSONB DEFAULT '{}',
    
    -- Onboarding tracking
    facebook_connected BOOLEAN DEFAULT FALSE,
    instagram_connected BOOLEAN DEFAULT FALSE,
    knowledge_base_added BOOLEAN DEFAULT FALSE,
    workflow_requested BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_organizations_owner ON organizations(owner_id);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_plan ON organizations(plan_type);

-- ============================================
-- Meta Tokens Table (User-level access tokens)
-- ============================================
CREATE TABLE meta_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    access_token_encrypted TEXT NOT NULL,
    token_type VARCHAR(50) DEFAULT 'long_lived',
    expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

CREATE INDEX idx_meta_tokens_org ON meta_tokens(organization_id);

-- ============================================
-- Facebook Pages Table
-- ============================================
CREATE TABLE facebook_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    page_id VARCHAR(100) NOT NULL UNIQUE,
    page_name VARCHAR(255) NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    category VARCHAR(255),
    picture_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    webhook_subscribed BOOLEAN DEFAULT FALSE,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_facebook_pages_org ON facebook_pages(organization_id);
CREATE INDEX idx_facebook_pages_page_id ON facebook_pages(page_id);

-- ============================================
-- Instagram Accounts Table
-- ============================================
CREATE TABLE instagram_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    instagram_id VARCHAR(100) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    facebook_page_id UUID REFERENCES facebook_pages(id) ON DELETE SET NULL,
    profile_picture_url TEXT,
    followers_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    webhook_subscribed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_instagram_accounts_org ON instagram_accounts(organization_id);
CREATE INDEX idx_instagram_accounts_ig_id ON instagram_accounts(instagram_id);

-- ============================================
-- Knowledge Bases Table
-- ============================================
CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('chatbot', 'comments')),
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_knowledge_bases_org ON knowledge_bases(organization_id);
CREATE INDEX idx_knowledge_bases_type ON knowledge_bases(type);

-- ============================================
-- Knowledge Base History Table (Version History)
-- ============================================
CREATE TABLE knowledge_base_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    version INTEGER NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kb_history_kb ON knowledge_base_history(knowledge_base_id);

-- ============================================
-- Workflow Requests Table
-- ============================================
CREATE TABLE workflow_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('chatbot', 'comment_reply', 'both', 'custom')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    platforms JSONB DEFAULT '["facebook", "instagram"]',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'in_progress', 'completed', 'rejected')),
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    rejection_reason TEXT,
    estimated_completion DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workflow_requests_org ON workflow_requests(organization_id);
CREATE INDEX idx_workflow_requests_status ON workflow_requests(status);
CREATE INDEX idx_workflow_requests_assigned ON workflow_requests(assigned_to);

-- ============================================
-- Addon Requests Table
-- ============================================
CREATE TABLE addon_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_request_id UUID REFERENCES workflow_requests(id) ON DELETE SET NULL,
    addon_type VARCHAR(50) NOT NULL CHECK (addon_type IN ('google_sheets', 'whatsapp_notification', 'email_notification', 'crm_sync', 'custom_webhook', 'other')),
    addon_name VARCHAR(255) NOT NULL,
    description TEXT,
    configuration JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'configuring', 'configured', 'active', 'inactive')),
    configured_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    configured_at TIMESTAMP WITH TIME ZONE,
    setup_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_addon_requests_org ON addon_requests(organization_id);
CREATE INDEX idx_addon_requests_status ON addon_requests(status);
CREATE INDEX idx_addon_requests_type ON addon_requests(addon_type);

-- ============================================
-- n8n Workflows Table
-- ============================================
CREATE TABLE n8n_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_request_id UUID REFERENCES workflow_requests(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('facebook', 'instagram', 'both')),
    workflow_type VARCHAR(50) NOT NULL CHECK (workflow_type IN ('chatbot', 'comment_reply', 'custom')),
    webhook_url TEXT NOT NULL,
    n8n_workflow_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    configuration JSONB DEFAULT '{}',
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_n8n_workflows_org ON n8n_workflows(organization_id);
CREATE INDEX idx_n8n_workflows_platform ON n8n_workflows(platform);
CREATE INDEX idx_n8n_workflows_type ON n8n_workflows(workflow_type);

-- ============================================
-- Conversations Table
-- ============================================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('facebook', 'instagram')),
    platform_conversation_id VARCHAR(255) NOT NULL,
    page_id UUID,
    customer_id VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    customer_profile_pic TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated', 'archived')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(platform, platform_conversation_id)
);

CREATE INDEX idx_conversations_org ON conversations(organization_id);
CREATE INDEX idx_conversations_platform ON conversations(platform);
CREATE INDEX idx_conversations_customer ON conversations(customer_id);
CREATE INDEX idx_conversations_status ON conversations(status);

-- ============================================
-- Messages Table
-- ============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    platform_message_id VARCHAR(255),
    direction VARCHAR(50) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'sticker', 'template', 'quick_reply')),
    content TEXT,
    attachments JSONB DEFAULT '[]',
    handled_by VARCHAR(50) CHECK (handled_by IN ('ai', 'human')),
    response_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_direction ON messages(direction);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ============================================
-- Webhook Logs Table
-- ============================================
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_url TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES n8n_workflows(id) ON DELETE SET NULL,
    event_type VARCHAR(100),
    status VARCHAR(50) CHECK (status IN ('success', 'failed', 'pending', 'retrying')),
    request_payload JSONB,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_org ON webhook_logs(organization_id);
CREATE INDEX idx_webhook_logs_workflow ON webhook_logs(workflow_id);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at);

-- ============================================
-- Notifications Table
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('client', 'admin')),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, user_type);
CREATE INDEX idx_notifications_read ON notifications(user_id, read_at);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================
-- Analytics Events Table
-- ============================================
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_org ON analytics_events(organization_id);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);

-- ============================================
-- Session Table (for token management)
-- ============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('client', 'admin')),
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id, user_type);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- Audit Logs Table
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_type VARCHAR(50) CHECK (user_type IN ('client', 'admin', 'system')),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meta_tokens_updated_at BEFORE UPDATE ON meta_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_facebook_pages_updated_at BEFORE UPDATE ON facebook_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instagram_accounts_updated_at BEFORE UPDATE ON instagram_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_bases_updated_at BEFORE UPDATE ON knowledge_bases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_requests_updated_at BEFORE UPDATE ON workflow_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addon_requests_updated_at BEFORE UPDATE ON addon_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_n8n_workflows_updated_at BEFORE UPDATE ON n8n_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Insert Default Superadmin
-- ============================================
-- Password: Admin@123 (change immediately in production!)
INSERT INTO admin_users (email, password_hash, first_name, last_name, role, status)
VALUES (
    'admin@seekers.ai',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4k.VZLrU4gvmjm5G', -- bcrypt hash of 'Admin@123'
    'Super',
    'Admin',
    'superadmin',
    'active'
);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE admin_users IS 'Seekers staff/admin users with role-based access';
COMMENT ON TABLE users IS 'Client users who own organizations';
COMMENT ON TABLE organizations IS 'Client organizations/companies';
COMMENT ON TABLE meta_tokens IS 'User-level Meta access tokens for OAuth';
COMMENT ON TABLE facebook_pages IS 'Connected Facebook pages for each organization';
COMMENT ON TABLE instagram_accounts IS 'Connected Instagram business accounts';
COMMENT ON TABLE knowledge_bases IS 'Knowledge bases for AI chatbot and comment replies';
COMMENT ON TABLE workflow_requests IS 'Workflow requests from clients pending admin action';
COMMENT ON TABLE addon_requests IS 'Add-on integration requests from clients';
COMMENT ON TABLE n8n_workflows IS 'Active n8n workflows created by admins for clients';
COMMENT ON TABLE conversations IS 'Messenger/Instagram DM conversations';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON TABLE webhook_logs IS 'Log of webhook deliveries to n8n';
COMMENT ON TABLE notifications IS 'In-app notifications for clients and admins';
