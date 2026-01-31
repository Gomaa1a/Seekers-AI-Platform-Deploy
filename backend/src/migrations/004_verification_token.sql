-- ============================================
-- Migration: Add verification_token to users table
-- Version: 004
-- Description: Adds verification_token column for email verification flow
-- ============================================

-- Add verification_token column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;

-- Add index for password reset token if not exists
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
