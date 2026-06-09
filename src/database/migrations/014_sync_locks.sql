-- Migration: Add sync_locks table for distributed locking
CREATE TABLE IF NOT EXISTS sync_locks (
    lock_name TEXT PRIMARY KEY,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_by TEXT
);

-- Optional: Comment for documentation
COMMENT ON TABLE sync_locks IS 'Used to prevent overlapping execution of distributed cron jobs';
