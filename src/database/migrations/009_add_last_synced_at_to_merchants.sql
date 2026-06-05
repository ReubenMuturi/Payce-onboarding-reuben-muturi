-- ================================================
-- Migration: Add last_synced_at to merchants table
-- Migration: 009_add_last_synced_at_to_merchants.sql
-- ================================================

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Index to optimize dynamic scheduling queries
CREATE INDEX IF NOT EXISTS idx_merchants_last_synced_at ON merchants(last_synced_at);
