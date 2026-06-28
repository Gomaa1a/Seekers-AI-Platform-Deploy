-- Migration 010: multi-channel agents
-- An AI agent can now answer on more than one channel at once
-- (e.g. Facebook + Instagram). The legacy single `channel` column is kept
-- as the "primary" channel for backward compatibility and display.

ALTER TABLE ai_agents
  ADD COLUMN IF NOT EXISTS channels TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: seed the array from the existing primary channel so already
-- connected agents keep working.
UPDATE ai_agents
   SET channels = ARRAY[channel]
 WHERE channel_connected = TRUE
   AND (channels IS NULL OR array_length(channels, 1) IS NULL);
