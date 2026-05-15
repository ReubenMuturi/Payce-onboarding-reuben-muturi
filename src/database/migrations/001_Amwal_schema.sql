-- =============================================
-- 001_Amwal_schema.sql - Improved Version
-- Safe to run multiple times
-- =============================================

-- 1. Bills Table (Add missing columns if table exists)
CREATE TABLE IF NOT EXISTS bills (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id INTEGER,
    table_id INTEGER,
    total_amount NUMERIC(12,3) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12,3) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PAID', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    );

-- Add merchant_id column if it doesn't exist
ALTER TABLE bills
    ADD COLUMN IF NOT EXISTS merchant_id INTEGER;

-- Add table_id column if it doesn't exist
ALTER TABLE bills
    ADD COLUMN IF NOT EXISTS table_id INTEGER;

-- 2. Bill Payments Table
CREATE TABLE IF NOT EXISTS bill_payments (
                                             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    amount NUMERIC(12,3) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    gateway TEXT NOT NULL DEFAULT 'AMWAL',
    idempotency_key TEXT UNIQUE,
    merchant_reference TEXT UNIQUE,
    request_datetime TIMESTAMPTZ,
    gateway_response JSONB,
    user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    );

-- 3. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_bills_merchant ON bills(merchant_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bill_payments_bill_id ON bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_merchant_ref ON bill_payments(merchant_reference);
CREATE INDEX IF NOT EXISTS idx_bill_payments_status ON bill_payments(status);

-- 4. Helper Function
CREATE OR REPLACE FUNCTION increment_paid_amount(
    p_bill_id UUID,
    p_amount NUMERIC(12,3)
)
RETURNS void AS $$
BEGIN
UPDATE bills
SET paid_amount = paid_amount + p_amount,
    updated_at = NOW()
WHERE id = p_bill_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Timestamp Trigger Function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_update_bills_timestamp ON bills;
CREATE TRIGGER trigger_update_bills_timestamp
    BEFORE UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_update_bill_payments_timestamp ON bill_payments;
CREATE TRIGGER trigger_update_bill_payments_timestamp
    BEFORE UPDATE ON bill_payments
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Comments
COMMENT ON TABLE bills IS 'Main bills table for restaurant orders';
COMMENT ON TABLE bill_payments IS 'Payment records linked to Amwal Pay';
