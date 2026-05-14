-- ================================================
-- Loyverse Menu Sync Schema
-- Migration: 001_loyverse_schema.sql
-- ================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- 1. Categories
CREATE TABLE IF NOT EXISTS loyverse_categories (
                                                   id UUID PRIMARY KEY,
                                                   name TEXT NOT NULL,
                                                   handle TEXT,
                                                   sort_order INTEGER,
                                                   created_at TIMESTAMPTZ,
                                                   updated_at TIMESTAMPTZ
);

-- 2. Items
CREATE TABLE IF NOT EXISTS loyverse_items (
                                              id UUID PRIMARY KEY,
                                              name TEXT NOT NULL,
                                              handle TEXT,
                                              category_id UUID REFERENCES loyverse_categories(id),
    image_url TEXT,
    color TEXT,
    track_stock BOOLEAN DEFAULT false,
    is_composite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
    );

-- 3. Variants (Contains pricing)
CREATE TABLE IF NOT EXISTS loyverse_variants (
                                                 variant_id UUID PRIMARY KEY,
                                                 item_id UUID REFERENCES loyverse_items(id) ON DELETE CASCADE,
    sku TEXT,
    barcode TEXT,
    option1_value TEXT,
    option2_value TEXT,
    option3_value TEXT,
    default_price NUMERIC(10,3) NOT NULL,
    cost NUMERIC(10,3),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
    );

-- 4. Webhooks Log
CREATE TABLE IF NOT EXISTS loyverse_webhooks (
                                                 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    resource_id TEXT,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
    );

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_loyverse_items_category ON loyverse_items(category_id);
CREATE INDEX IF NOT EXISTS idx_loyverse_items_deleted ON loyverse_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_loyverse_variants_item ON loyverse_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_loyverse_webhooks_event ON loyverse_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_loyverse_webhooks_created ON loyverse_webhooks(created_at);

-- ==================== COMMENTS ====================
COMMENT ON TABLE loyverse_items IS 'Main menu items synced from Loyverse POS';
COMMENT ON TABLE loyverse_variants IS 'Variants with pricing information';