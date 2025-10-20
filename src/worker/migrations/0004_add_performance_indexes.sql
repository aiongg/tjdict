-- Migration number: 0004 	 2025-10-20T12:00:00.000Z
-- Performance optimization: Add composite indexes for common query patterns

-- Composite index for "needs review" filter (user_id, entry_id lookup)
-- This optimizes: WHERE NOT EXISTS (SELECT 1 FROM entry_reviews WHERE user_id = ? AND entry_id = ?)
CREATE INDEX IF NOT EXISTS idx_reviews_user_entry ON entry_reviews(user_id, entry_id);

-- Composite indexes for filtering + sorting patterns
-- This optimizes: WHERE is_complete = ? ORDER BY sort_key
CREATE INDEX IF NOT EXISTS idx_entries_complete_sort ON entries(is_complete, sort_key);

-- This optimizes: WHERE is_complete = ? ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_entries_complete_updated ON entries(is_complete, updated_at);

-- Composite index for latest review per user query pattern
-- This optimizes: SELECT * FROM entry_reviews WHERE entry_id = ? AND user_id = ? ORDER BY reviewed_at DESC
CREATE INDEX IF NOT EXISTS idx_reviews_entry_user_date ON entry_reviews(entry_id, user_id, reviewed_at DESC);

-- Foreign key indexes (best practice, even if rarely used)
CREATE INDEX IF NOT EXISTS idx_entries_created_by ON entries(created_by);
CREATE INDEX IF NOT EXISTS idx_entries_updated_by ON entries(updated_by);

-- Update statistics for query planner optimization
-- This helps SQLite choose the most efficient query plans
ANALYZE;
