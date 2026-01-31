-- ============================================
-- Migration 003: Knowledge Base Attachments
-- ============================================

CREATE TABLE kb_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    gcs_path VARCHAR(512) NOT NULL,
    gcs_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kb_attachments_kb ON kb_attachments(knowledge_base_id);
CREATE INDEX idx_kb_attachments_org ON kb_attachments(organization_id);
