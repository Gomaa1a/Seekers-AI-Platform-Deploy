-- Migration 011: AI-generated agent persona
-- Stores a polished, AI-written system prompt for the agent. When present it
-- replaces the default templated persona; the standard guardrails + knowledge
-- base are always appended on top at runtime.

ALTER TABLE ai_agents
  ADD COLUMN IF NOT EXISTS system_prompt TEXT;
