-- ============================================
-- Seekers AI Platform - Schema Fixes
-- Version: 7.0.0
-- Ensures all missing columns from previous migrations exist
-- ============================================

-- From migration 002: n8n_base_webhook_url
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS n8n_base_webhook_url TEXT;

-- Ensure all indexes exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan_type);
