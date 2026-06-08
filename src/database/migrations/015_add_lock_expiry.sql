-- Migration: Add expiration to sync locks to prevent "Zombie Locks"
-- This allows other instances to take over a lock if the previous owner crashed.

ALTER TABLE sync_locks
ADD COLUMN expires_at TIMESTAMPTZ;

COMMENT ON COLUMN sync_locks.expires_at IS 'The timestamp after which the lock is considered stale and can be overwritten';
