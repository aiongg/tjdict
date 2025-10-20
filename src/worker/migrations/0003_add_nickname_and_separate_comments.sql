-- Migration number: 0003 	 2025-10-20T03:41:07.619Z

-- Add nickname field to users table
ALTER TABLE users ADD COLUMN nickname TEXT;

-- Create entry_comments table
CREATE TABLE IF NOT EXISTS entry_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_entry ON entry_comments(entry_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON entry_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON entry_comments(created_at);

-- Modify entry_reviews table
-- Step 1: Create new table without constraints
CREATE TABLE IF NOT EXISTS entry_reviews_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('approved', 'needs_work')),
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy data from old table (excluding comment column and pending status)
INSERT INTO entry_reviews_new (id, entry_id, user_id, status, reviewed_at)
SELECT id, entry_id, user_id, status, reviewed_at
FROM entry_reviews
WHERE status IN ('approved', 'needs_work');

-- Step 3: Drop old table
DROP TABLE entry_reviews;

-- Step 4: Rename new table
ALTER TABLE entry_reviews_new RENAME TO entry_reviews;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_reviews_entry ON entry_reviews(entry_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON entry_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON entry_reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_at ON entry_reviews(reviewed_at);
