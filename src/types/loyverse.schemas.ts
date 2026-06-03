import { z } from 'zod';

/**
 * Zod schemas for Loyverse API responses.
 * These provide runtime validation to ensure the API contract is respected.
 */

export const LoyverseVariantSchema = z.object({
    variant_id: z.string().uuid(),
    item_id: z.string().uuid(),
    sku: z.string().nullable().optional(),
    reference_variant_id: z.string().nullable().optional(),
    option1_value: z.string().nullable().optional(),
    option2_value: z.string().nullable().optional(),
    option3_value: z.string().nullable().optional(),
    barcode: z.string().nullable().optional(),
    cost: z.number().nullable().default(0),
    purchase_cost: z.number().nullable().default(0),
    default_pricing_type: z.string().optional(),
    default_price: z.number().nullable().optional(),
    stores: z.array(z.object({
        store_id: z.string(),
        pricing_type: z.string(),
        price: z.number(),
        available_for_sale: z.boolean(),
        optimal_stock: z.number().nullable().optional(),
        low_stock: z.number().nullable().optional(),
    })).optional(),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
    deleted_at: z.string().datetime().nullable().optional(),
});

export const LoyverseItemSchema = z.object({
    id: z.string().uuid(),
    handle: z.string().nullable().optional(),
    item_name: z.string(),
    reference_id: z.string().nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
    track_stock: z.boolean().default(false),
    sold_by_weight: z.boolean().default(false),
    is_composite: z.boolean().default(false),
    use_production: z.boolean().default(false),
    components: z.array(z.object({
        variant_id: z.string().uuid(),
        quantity: z.number()
    })).optional(),
    primary_supplier_id: z.string().uuid().nullable().optional(),
    tax_ids: z.array(z.string().uuid()).optional(),
    modifiers_ids: z.array(z.string()).optional(),
    form: z.string().optional(),
    color: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    option1_name: z.string().nullable().optional(),
    option2_name: z.string().nullable().optional(),
    option3_name: z.string().nullable().optional(),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
    deleted_at: z.string().datetime().nullable().optional(),
    variants: z.array(LoyverseVariantSchema).optional(),
});

export const LoyverseCategorySchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    handle: z.string().nullable().optional(),
    sort_order: z.number().nullable().optional(),
    color: z.string().nullable().optional(),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
    deleted_at: z.string().datetime().nullable().optional(),
});

export const LoyverseItemsResponseSchema = z.object({
    items: z.array(LoyverseItemSchema),
    cursor: z.string().nullable().optional(),
});

export const LoyverseCategoriesResponseSchema = z.object({
    categories: z.array(LoyverseCategorySchema),
    cursor: z.string().nullable().optional(),
});

// Single Resource Response Schemas
export const LoyverseItemSingleResponseSchema = LoyverseItemSchema;
export const LoyverseCategorySingleResponseSchema = LoyverseCategorySchema;
