-- =============================================
-- 007_loyverse_sync_lock.sql
-- Implements PostgreSQL Advisory Locks to ensure
-- only one instance of the Loyverse sync job runs at a time.
-- =============================================

-- We use an arbitrary 64-bit integer as the lock key for the Loyverse sync job.
-- This is an "advisory" lock, meaning it does not lock rows, but is a global flag in the DB.

CREATE OR REPLACE FUNCTION acquire_loyverse_sync_lock()
RETURNS boolean AS $$
BEGIN
    -- Use pg_try_advisory_lock to attempt to acquire the lock without blocking.
    -- 987654321 is the unique ID for this specific job.
    RETURN pg_try_advisory_lock(987654321);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_loyverse_sync_lock()
RETURNS boolean AS $$
BEGIN
    -- Release the lock so other instances (or the next run) can acquire it.
    RETURN pg_advisory_unlock(987654321);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION acquire_loyverse_sync_lock IS 'Attempts to acquire a distributed lock for the Loyverse sync job. Returns true if successful.';
COMMENT ON FUNCTION release_loyverse_sync_lock IS 'Releases the distributed lock for the Loyverse sync job.';