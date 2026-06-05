-- ================================================
-- Migration: Add RPC for atomic resource buffering in debounce table
-- Migration: 010_append_resource_to_debounce_rpc.sql
-- ================================================

CREATE OR REPLACE FUNCTION append_resource_to_debounce(
    p_merchant_id UUID,
    p_resource_id UUID,
    p_expires_in_seconds INTEGER
) RETURNS VOID AS $$
BEGIN
    INSERT INTO loyverse_webhook_debounce (merchant_id, resource_ids, expires_at)
    VALUES (
        p_merchant_id,
        ARRAY[p_resource_id]::UUID[],
        NOW() + (p_expires_in_seconds || ' seconds')::INTERVAL
    )
    ON CONFLICT (merchant_id) DO UPDATE
    SET
        resource_ids = array_append(loyverse_webhook_debounce.resource_ids, p_resource_id),
        expires_at = NOW() + (p_expires_in_seconds || ' seconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql;
