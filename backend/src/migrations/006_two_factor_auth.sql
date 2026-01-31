-- ============================================
-- Seekers AI Platform - Two-Factor Authentication
-- Version: 6.0.0
-- ============================================

-- ============================================
-- Add 2FA columns to users table
-- ============================================
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
    ADD COLUMN IF NOT EXISTS two_factor_temp_secret VARCHAR(255),
    ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB;

-- ============================================
-- Add 2FA columns to admin_users table
-- ============================================
ALTER TABLE admin_users 
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
    ADD COLUMN IF NOT EXISTS two_factor_temp_secret VARCHAR(255),
    ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB;

-- ============================================
-- Indexes for faster 2FA lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_two_factor ON users(two_factor_enabled) WHERE two_factor_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_admin_users_two_factor ON admin_users(two_factor_enabled) WHERE two_factor_enabled = TRUE;

-- ============================================
-- Comments
-- ============================================
COMMENT ON COLUMN users.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret key (base32 encoded)';
COMMENT ON COLUMN users.two_factor_temp_secret IS 'Temporary secret during 2FA setup';
COMMENT ON COLUMN users.two_factor_backup_codes IS 'Array of backup codes for recovery';
COMMENT ON COLUMN admin_users.two_factor_enabled IS 'Whether 2FA is enabled for this admin';
COMMENT ON COLUMN admin_users.two_factor_secret IS 'TOTP secret key (base32 encoded)';
