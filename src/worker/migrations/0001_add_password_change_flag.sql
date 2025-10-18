-- Migration number: 0001 	 2025-10-18T01:32:50.000Z
-- Add requires_password_change field
ALTER TABLE users ADD COLUMN requires_password_change INTEGER DEFAULT 0;

-- Add index for users requiring password change
CREATE INDEX IF NOT EXISTS idx_users_requires_password_change ON users(requires_password_change);
