-- Merchant Audit Log
-- Tracks critical changes to merchant configuration and security settings

CREATE TABLE IF NOT EXISTS merchant_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    action TEXT NOT NULL, -- e.g., 'TOKEN_ROTATED', 'STATUS_CHANGED', 'CONFIG_UPDATED'
    previous_value TEXT,
    new_value TEXT,
    changed_by TEXT, -- User ID or 'SYSTEM'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_audit_merchant_id ON merchant_audit_log(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_audit_created_at ON merchant_audit_log(created_at);
