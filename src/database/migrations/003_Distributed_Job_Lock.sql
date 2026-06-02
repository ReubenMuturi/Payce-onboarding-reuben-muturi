-- =============================================
-- 003_Distributed_Job_Lock.sql
-- Implements PostgreSQL Advisory Locks to ensure
-- only one instance of a background job runs at a time.
-- =============================================

-- We use an arbitrary 64-bit integer as the lock key for the reconciliation job.
-- This is an "advisory" lock, meaning it does not lock rows, but is a global flag in the DB.

CREATE OR REPLACE FUNCTION acquire_reconciliation_lock()
RETURNS boolean AS $$
BEGIN
    -- Use pg_try_advisory_lock to attempt to acquire the lock without blocking.
    -- 123456789 is the unique ID for this specific job.
    RETURN pg_try_advisory_lock(123456789);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_reconciliation_lock()
RETURNS boolean AS $$
BEGIN
    -- Release the lock so other instances (or the next run) can acquire it.
    RETURN pg_advisory_unlock(123456789);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION acquire_reconciliation_lock IS 'Attempts to acquire a distributed lock for the payment reconciliation job. Returns true if successful.';
COMMENT ON FUNCTION release_reconciliation_lock IS 'Releases the distributed lock for the payment reconciliation job.';
