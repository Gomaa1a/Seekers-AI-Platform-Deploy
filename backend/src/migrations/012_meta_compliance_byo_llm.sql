-- Migration 012: Meta App Review compliance + Bring-Your-Own-LLM
--
-- 1) meta_tokens.meta_user_id — required to honor Meta's deauthorize and
--    data-deletion callbacks (they identify the user only by Meta user ID).
-- 2) meta_deletion_requests — persisted confirmation codes so the
--    /api/meta/deletion-status endpoint reports real status, not a stub.
-- 3) ai_agents BYO-LLM columns — an organization can plug in its own LLM
--    API key (Anthropic / OpenAI / Gemini / any OpenAI-compatible endpoint)
--    instead of the platform's shared key.

-- ============================================
-- 1. Map Meta user -> organization
-- ============================================
ALTER TABLE meta_tokens ADD COLUMN IF NOT EXISTS meta_user_id VARCHAR(100);
ALTER TABLE meta_tokens ADD COLUMN IF NOT EXISTS meta_user_name VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_meta_tokens_meta_user ON meta_tokens(meta_user_id);

-- ============================================
-- 2. Data deletion requests (Meta callback compliance)
-- ============================================
CREATE TABLE IF NOT EXISTS meta_deletion_requests (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    confirmation_code VARCHAR(100) NOT NULL UNIQUE,
    meta_user_id      VARCHAR(100) NOT NULL,
    organization_id   UUID REFERENCES organizations(id) ON DELETE SET NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'completed', 'failed')),
    details           TEXT,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_meta_deletion_code ON meta_deletion_requests(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_meta_deletion_user ON meta_deletion_requests(meta_user_id);

-- ============================================
-- 3. Bring-Your-Own-LLM on agents
-- ============================================
-- llm_provider:
--   'platform'  -> use the platform's configured Claude/Gemini keys (default)
--   'anthropic' -> client's own Anthropic key
--   'openai'    -> client's own OpenAI key
--   'gemini'    -> client's own Google Gemini key
--   'custom'    -> any OpenAI-compatible endpoint (llm_base_url required)
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS llm_provider VARCHAR(30) NOT NULL DEFAULT 'platform';
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS llm_model VARCHAR(120);
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS llm_api_key_encrypted TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS llm_base_url TEXT;

ALTER TABLE ai_agents DROP CONSTRAINT IF EXISTS ai_agents_llm_provider_check;
ALTER TABLE ai_agents ADD CONSTRAINT ai_agents_llm_provider_check
    CHECK (llm_provider IN ('platform', 'anthropic', 'openai', 'gemini', 'custom'));

COMMENT ON COLUMN ai_agents.llm_api_key_encrypted IS 'Client-owned LLM API key, AES-256-GCM encrypted with ENCRYPTION_KEY. Never returned by the API.';
