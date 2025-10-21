-- Migration number: 0005 	 2025-10-21T03:15:51.013Z

-- Drop all indexes on is_complete before dropping the column
DROP INDEX IF EXISTS idx_entries_is_complete;
DROP INDEX IF EXISTS idx_entries_complete_sort;
DROP INDEX IF EXISTS idx_entries_complete_updated;

-- Drop is_complete column from entries table
ALTER TABLE entries DROP COLUMN is_complete;

-- Rename entry_reviews table to entry_statuses
ALTER TABLE entry_reviews RENAME TO entry_statuses;

-- Create new table with updated status constraint
CREATE TABLE IF NOT EXISTS entry_statuses_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'needs_work', 'approved')),
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table, converting old statuses to new ones
-- approved -> approved, needs_work -> needs_work
INSERT INTO entry_statuses_new (id, entry_id, user_id, status, reviewed_at)
SELECT id, entry_id, user_id, status, reviewed_at
FROM entry_statuses;

-- Drop old table
DROP TABLE entry_statuses;

-- Rename new table
ALTER TABLE entry_statuses_new RENAME TO entry_statuses;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_statuses_entry ON entry_statuses(entry_id);
CREATE INDEX IF NOT EXISTS idx_statuses_user ON entry_statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_status ON entry_statuses(status);
CREATE INDEX IF NOT EXISTS idx_statuses_reviewed_at ON entry_statuses(reviewed_at);
