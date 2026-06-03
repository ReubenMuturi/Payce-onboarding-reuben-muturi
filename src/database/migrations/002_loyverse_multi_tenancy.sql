-- ================================================
-- Loyverse Synchronized Schema
-- Migration: 002_loyverse_schema.sql
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- 1. Categories
-- Using Composite PK (merchant_id, id) for strict tenant isolation
CREATE TABLE IF NOT EXISTS loyverse_categories (
    merchant_id UUID NOT NULL,
    id UUID NOT NULL,
    name TEXT NOT NULL,
    handle TEXT,
    sort_order INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    PRIMARY KEY (merchant_id, id),
    CONSTRAINT fk_categories_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 2. Items
CREATE TABLE IF NOT EXISTS loyverse_items (
    merchant_id UUID NOT NULL,
    id UUID NOT NULL,
    name TEXT NOT NULL,
    handle TEXT,
    category_id UUID,
    image_url TEXT,
    color TEXT,
    track_stock BOOLEAN DEFAULT false,
    is_composite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (merchant_id, id),
    CONSTRAINT fk_items_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    CONSTRAINT fk_items_category FOREIGN KEY (merchant_id, category_id) REFERENCES loyverse_categories(merchant_id, id)
);

-- 3. Variants (Pricing and SKUs)
CREATE TABLE IF NOT EXISTS loyverse_variants (
    merchant_id UUID NOT NULL,
    variant_id UUID NOT NULL,
    item_id UUID NOT NULL,
    sku TEXT,
    barcode TEXT,
    option1_value TEXT,
    option2_value TEXT,
    option3_value TEXT,
    default_price NUMERIC(10,3) NOT NULL,
    cost NUMERIC(10,3),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (merchant_id, variant_id),
    CONSTRAINT fk_variants_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    CONSTRAINT fk_variants_item FOREIGN KEY (merchant_id, item_id) REFERENCES loyverse_items(merchant_id, id) ON DELETE CASCADE
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_loyverse_items_category ON loyverse_items(category_id);
CREATE INDEX IF NOT EXISTS idx_loyverse_items_deleted ON loyverse_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_loyverse_variants_item ON loyverse_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_loyverse_tenant_items ON loyverse_items(merchant_id);
CREATE INDEX IF NOT EXISTS idx_loyverse_tenant_variants ON loyverse_variants(merchant_id);
CREATE INDEX IF NOT EXISTS idx_loyverse_tenant_categories ON loyverse_categories(merchant_id);

-- ==================== COMMENTS ====================
COMMENT ON TABLE loyverse_items IS 'Main menu items synced from Loyverse POS with multi-tenant partitioning';
COMMENT ON TABLE loyverse_variants IS 'Pricing variants partitioned by merchant';
