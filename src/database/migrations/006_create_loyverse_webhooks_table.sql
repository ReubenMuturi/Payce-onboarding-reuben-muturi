-- ================================================
-- Loyverse Webhook Audit Log Table
-- Migration: 006_create_loyverse_webhooks_table.sql
-- ================================================

CREATE TABLE IF NOT EXISTS loyverse_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    resource_id UUID,
    payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_loyverse_webhooks_merchant ON loyverse_webhooks(merchant_id);
CREATE INDEX IF NOT EXISTS idx_loyverse_webhooks_processed ON loyverse_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_loyverse_webhooks_created_at ON loyverse_webhooks(created_at);