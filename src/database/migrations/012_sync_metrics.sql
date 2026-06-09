-- Sync Metrics Table
-- Records the operational performance of the Loyverse synchronization engine

CREATE TABLE IF NOT EXISTS sync_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    sync_type TEXT NOT NULL, -- 'FULL' or 'DELTA'
    items_synced INTEGER DEFAULT 0,
    categories_synced INTEGER DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'SUCCESS' or 'FAILED'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance analysis
CREATE INDEX IF NOT EXISTS idx_sync_metrics_merchant_id ON sync_metrics(merchant_id);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_created_at ON sync_metrics(created_at);
