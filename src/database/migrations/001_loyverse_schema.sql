-- ================================================
-- Loyverse Core Registry
-- Migration: 001_loyverse_core.sql
-- ================================================

-- 1. Merchant Status Enum
DO $$ BEGIN
    CREATE TYPE merchant_status AS ENUM ('Active', 'Suspended', 'Pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Merchants Table
-- This is the central registry for all Loyverse integrations
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    api_token TEXT NOT NULL,
    webhook_secret TEXT,
    business_type TEXT,
    status merchant_status DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup of active merchants (used by Cron jobs)
CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);

-- Initial Seed for Testing
INSERT INTO merchants (name, api_token, business_type, status)
VALUES ('Test Merchant', 'test-token-123', 'Restaurant', 'Active')
ON CONFLICT DO NOTHING;
