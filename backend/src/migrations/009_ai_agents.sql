-- Migration 009: ai_agents (self-serve AI Agent model)
-- Powers the self-serve "Create AI Agent" flow (Mojeeb-style):
-- create agent -> add knowledge -> connect a channel -> go live.
-- Unlike workflow_requests (admin builds it in n8n), an organization owns and
-- activates these agents directly.

CREATE TABLE IF NOT EXISTS ai_agents (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name               VARCHAR(255) NOT NULL,
    description        TEXT,
    -- Persona / behaviour
    business_type      VARCHAR(100),
    tone               VARCHAR(50) NOT NULL DEFAULT 'friendly'
                          CHECK (tone IN ('friendly', 'professional', 'casual', 'formal', 'empathetic')),
    greeting           TEXT,
    language           VARCHAR(20) NOT NULL DEFAULT 'auto',
    -- Channel it answers on
    channel            VARCHAR(30) NOT NULL DEFAULT 'web'
                          CHECK (channel IN ('web', 'facebook', 'instagram', 'whatsapp')),
    channel_connected  BOOLEAN NOT NULL DEFAULT FALSE,
    -- Knowledge: free-text the agent is trained on (self-contained),
    -- with an optional link to a full knowledge base
    knowledge          TEXT,
    knowledge_base_id  UUID REFERENCES knowledge_bases(id) ON DELETE SET NULL,
    -- Lifecycle
    status             VARCHAR(20) NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'active', 'paused')),
    -- Signature capabilities (Mojeeb-style toggles)
    emotion_detection  BOOLEAN NOT NULL DEFAULT TRUE,
    lead_extraction    BOOLEAN NOT NULL DEFAULT TRUE,
    human_handoff      BOOLEAN NOT NULL DEFAULT TRUE,
    -- Stats
    message_count      INTEGER NOT NULL DEFAULT 0,
    activated_at       TIMESTAMP WITH TIME ZONE,
    created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_org ON ai_agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);

-- keep updated_at fresh (reuses the shared trigger fn from 001_initial_schema)
DROP TRIGGER IF EXISTS update_ai_agents_updated_at ON ai_agents;
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
