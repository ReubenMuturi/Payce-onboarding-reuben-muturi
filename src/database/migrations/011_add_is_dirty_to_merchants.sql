-- ================================================
-- Migration: Add is_dirty flag to merchants table
-- Migration: 011_add_is_dirty_to_merchants.sql
-- ================================================

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS is_dirty BOOLEAN DEFAULT FALSE;

-- Index to optimize the sync job's prioritisation of "dirty" merchants
CREATE INDEX IF NOT EXISTS idx_merchants_is_dirty_status
ON merchants (is_dirty, status)
WHERE is_dirty = TRUE;
