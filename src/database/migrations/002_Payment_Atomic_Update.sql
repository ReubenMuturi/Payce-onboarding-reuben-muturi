-- =============================================
-- 002_Payment_Atomic_Update.sql
-- Ensures data integrity by wrapping payment
-- and bill updates in a single atomic transaction.
-- =============================================

CREATE OR REPLACE FUNCTION process_payment_update(
    p_payment_id UUID,
    p_new_status TEXT,
    p_gateway_response JSONB
) RETURNS void AS $$
DECLARE
    v_bill_id UUID;
    v_amount NUMERIC;
    v_current_status TEXT;
BEGIN
    -- 1. Lock the payment record to prevent concurrent webhook processing (Race Condition protection)
    SELECT bill_id, amount, status INTO v_bill_id, v_amount, v_current_status
    FROM bill_payments
    WHERE id = p_payment_id
    FOR UPDATE;

    -- 2. IDEMPOTENCY: If the payment is already marked SUCCESS, do nothing
    IF v_current_status = 'SUCCESS' THEN
        RETURN;
    END IF;

    -- 3. Update the payment record status and response
    UPDATE bill_payments
    SET status = p_new_status,
        gateway_response = p_gateway_response,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- 4. If the payment is successful, update the bill atomically
    IF p_new_status = 'SUCCESS' THEN
        UPDATE bills
        SET
            paid_amount = paid_amount + v_amount,
            -- Only mark as PAID if the total amount is covered, otherwise keep as OPEN (Partial Payment support)
            status = CASE
                WHEN (paid_amount + v_amount) >= total_amount THEN 'PAID'
                ELSE 'OPEN'
            END,
            updated_at = NOW()
        WHERE id = v_bill_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_payment_update IS 'Atomically updates payment status and bill balance to prevent data inconsistency during scaling.';
