-- ================================================
-- Loyverse Webhook Debounce State Table
-- Migration: 005_create_loyverse_webhook_debounce_table.sql
-- ================================================

CREATE TABLE IF NOT EXISTS loyverse_webhook_debounce (
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    resource_ids UUID[] NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (merchant_id)
);

-- Index for efficiently finding expired debounce windows
CREATE INDEX IF NOT EXISTS idx_loyverse_webhook_debounce_expires_at ON loyverse_webhook_debounce(expires_at);