-- ================================================
-- Loyverse Webhook Audit Log
-- Migration: 003_loyverse_webhooks.sql
-- ================================================

CREATE TABLE IF NOT EXISTS loyverse_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    resource_id TEXT,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_webhooks_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- Indexes for audit and monitoring
CREATE INDEX IF NOT EXISTS idx_loyverse_webhooks_merchant ON loyverse_webhooks(merchant_id);
CREATE INDEX IF NOT EXISTS idx_loyverse_webhooks_event ON loyverse_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_loyverse_webhooks_created ON loyverse_webhooks(created_at);

COMMENT ON TABLE loyverse_webhooks IS 'Audit log for incoming Loyverse webhooks to ensure synchronization reliability';
