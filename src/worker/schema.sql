
DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL CHECK (email LIKE '%_@_%._%'),  -- Basic email format validation
    password_hash TEXT NOT NULL,  -- Store hashed passwords
    password_salt TEXT NOT NULL,  -- Salt for password hashing
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'editor', 'admin')),  -- Permissions via roles
    totp_secret TEXT,  -- Base32 encoded TOTP secret
    totp_enabled INTEGER DEFAULT 0,  -- Whether 2FA is active (0 = disabled, 1 = enabled)
    totp_backup_codes TEXT,  -- JSON array of backup codes
    is_active INTEGER DEFAULT 1,  -- Account status (0 = inactive, 1 = active)
    last_login DATETIME,  -- Track last login time
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for active users queries
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
