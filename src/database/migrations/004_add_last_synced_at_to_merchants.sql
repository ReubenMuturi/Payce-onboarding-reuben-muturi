-- ================================================
-- Add last_synced_at column to merchants table
-- Migration: 004_add_last_synced_at_to_merchants.sql
-- ================================================

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Note: We leave existing rows with NULL last_synced_at.
-- The sync job will update this timestamp after a successful sync.