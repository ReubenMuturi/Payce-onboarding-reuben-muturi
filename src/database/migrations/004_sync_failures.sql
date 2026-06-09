-- Create sync_failures table to track failed resource synchronizations (Dead Letter Queue)
CREATE TABLE IF NOT EXISTS loyverse_sync_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('item', 'category')),
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RETRYING', 'FAILED', 'RESOLVED')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT uk_merchant_resource_type UNIQUE (merchant_id, resource_id, resource_type)
);

-- Index for the retry worker to efficiently find pending failures
CREATE INDEX IF NOT EXISTS idx_loyverse_sync_failures_status_merchant
ON loyverse_sync_failures (status, merchant_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_loyverse_sync_failures_modtime
    BEFORE UPDATE ON loyverse_sync_failures
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
