// src/integrations/loyverse/loyverse.types.ts
export interface LoyverseCategory {
    id: string;
    name: string;
    color?: string;
    created_at: string;
    updated_at?: string;
    deleted_at?: string;
}

export interface LoyverseVariant {
    variant_id: string;
    item_id: string;
    sku?: string;
    barcode?: string;
    option1_value?: string;
    option2_value?: string;
    option3_value?: string;
    default_price?: number;
    cost?: number;
    created_at: string;
    updated_at?: string;
    deleted_at?: string;
}

export interface LoyverseItem {
    id: string;
    item_name: string;
    handle?: string;
    category_id?: string;
    image_url?: string;
    color?: string;
    track_stock?: boolean;
    is_composite?: boolean;
    created_at: string;
    updated_at?: string;
    deleted_at?: string;
    variants: LoyverseVariant[];
}

export interface LoyverseSyncResult {
    success: boolean;
    itemsCount: number;
    categoriesCount: number;
    syncedAt: string;
    message?: string;
}