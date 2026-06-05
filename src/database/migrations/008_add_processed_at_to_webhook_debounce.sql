-- ================================================
-- Add processed_at column to loyverse_webhook_debounce table
-- Migration: 008_add_processed_at_to_webhook_debounce.sql
-- ================================================

ALTER TABLE loyverse_webhook_debounce
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Index to help find unprocessed expired rows
CREATE INDEX IF NOT EXISTS idx_loyverse_webhook_debounce_unprocessed ON loyverse_webhook_debounce(processed_at)
WHERE processed_at IS NULL;