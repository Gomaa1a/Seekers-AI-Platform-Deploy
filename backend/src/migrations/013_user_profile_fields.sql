-- 013: profile fields editable from the user profile page (PUT /api/auth/me)
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(64);
