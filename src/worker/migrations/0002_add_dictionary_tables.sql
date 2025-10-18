-- Migration number: 0002 	 2025-10-18T02:56:15.506Z

-- Dictionary entries table
CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    head TEXT NOT NULL,
    sort_key TEXT NOT NULL,
    entry_data TEXT NOT NULL,
    is_complete INTEGER DEFAULT 0,
    source_file TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_entries_head ON entries(head);
CREATE INDEX IF NOT EXISTS idx_entries_sort_key ON entries(sort_key);
CREATE INDEX IF NOT EXISTS idx_entries_is_complete ON entries(is_complete);
CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON entries(updated_at);

-- User reviews table (per-user, per-entry)
CREATE TABLE IF NOT EXISTS entry_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'needs_work')),
    comment TEXT,
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entry_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_entry ON entry_reviews(entry_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON entry_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON entry_reviews(status);
