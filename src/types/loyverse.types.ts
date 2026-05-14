export interface LoyverseItem {
    id: string;
    item_name: string;
    handle?: string;
    category_id?: string;
    image_url?: string;
    color?: string;
    track_stock?: boolean;
    is_composite?: boolean;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
    variants?: LoyverseVariant[];
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
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
}

export interface LoyverseCategory {
    id: string;
    name: string;
    handle?: string;
    sort_order?: number;
    created_at?: string;
    updated_at?: string;
}

export interface SyncResult {
    success: boolean;
    itemsCount: number;
    categoriesCount: number;
    modifiersCount?: number;
    syncedAt: string;
}