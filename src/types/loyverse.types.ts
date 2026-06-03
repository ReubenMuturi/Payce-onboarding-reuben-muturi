import { z } from 'zod';
import {
    LoyverseItemSchema,
    LoyverseVariantSchema,
    LoyverseCategorySchema
} from './loyverse.schemas';

// --- Pure API Types (What we get from Loyverse) ---
export type LoyverseItemApi = z.infer<typeof LoyverseItemSchema>;
export type LoyverseVariantApi = z.infer<typeof LoyverseVariantSchema>;
export type LoyverseCategoryApi = z.infer<typeof LoyverseCategorySchema>;

// --- Merchant-Scoped Types (What we store in our DB) ---
export type LoyverseItem = LoyverseItemApi & {
    merchant_id: string;
};

export type LoyverseVariant = LoyverseVariantApi & {
    merchant_id: string;
};

export type LoyverseCategory = LoyverseCategoryApi & {
    merchant_id: string;
};

export interface SyncResult {
    success: boolean;
    itemsCount: number;
    categoriesCount: number;
    modifiersCount?: number;
    syncedAt: string;
}
