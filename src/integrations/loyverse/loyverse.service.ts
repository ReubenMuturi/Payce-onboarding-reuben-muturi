// src/integrations/loyverse/loyverse.service.ts
import { LoyverseClient } from './loyverse.client';
import { LoyverseItem, LoyverseCategory, LoyverseSyncResult } from './loyverse.types';

// Import Supabase (compatible with your current JS config)
const { supabase } = require('../../config/supabase');

export class LoyverseService {
    private client: LoyverseClient;

    constructor() {
        this.client = new LoyverseClient();
    }

    /**
     * Fetch ALL items with full pagination support
     */
    private async fetchAllItems(): Promise<LoyverseItem[]> {
        let allItems: LoyverseItem[] = [];
        let cursor: string | undefined;

        do {
            const response = await this.client.getItems(cursor, 250);
            allItems = [...allItems, ...response.items];
            cursor = response.cursor;

            console.log(`📦 Fetched ${response.items.length} items | Total: ${allItems.length}`);
        } while (cursor);

        return allItems;
    }

    /**
     * Fetch ALL categories with pagination
     */
    private async fetchAllCategories(): Promise<LoyverseCategory[]> {
        let allCategories: LoyverseCategory[] = [];
        let cursor: string | undefined;

        do {
            const response = await this.client.getCategories(cursor, 100);
            allCategories = [...allCategories, ...response.categories];
            cursor = response.cursor;
        } while (cursor);

        return allCategories;
    }

    /**
     * Save Categories
     */
    private async saveCategories(categories: LoyverseCategory[]): Promise<void> {
        if (categories.length === 0) return;

        const data = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            color: cat.color || null,
            created_at: cat.created_at,
            updated_at: cat.updated_at || null,
            deleted_at: cat.deleted_at || null,
        }));

        const { error } = await supabase
            .from('loyverse_categories')
            .upsert(data, { onConflict: 'id' });

        if (error) {
            console.error('❌ Error saving categories:', error);
            throw error;
        }

        console.log(`✅ Synced ${data.length} categories`);
    }

    /**
     * Save Items + Variants
     */
    private async saveItems(items: LoyverseItem[]): Promise<void> {
        if (items.length === 0) return;

        const itemsData = items.map(item => ({
            id: item.id,
            name: item.item_name,
            handle: item.handle || null,
            category_id: item.category_id || null,
            image_url: item.image_url || null,
            color: item.color || null,
            track_stock: item.track_stock || false,
            is_composite: item.is_composite || false,
            created_at: item.created_at,
            updated_at: item.updated_at || null,
            deleted_at: item.deleted_at || null,
        }));

        const variantsData: any[] = [];

        items.forEach(item => {
            item.variants?.forEach(variant => {
                variantsData.push({
                    variant_id: variant.variant_id,
                    item_id: variant.item_id,
                    sku: variant.sku || null,
                    barcode: variant.barcode || null,
                    option1_value: variant.option1_value || null,
                    option2_value: variant.option2_value || null,
                    option3_value: variant.option3_value || null,
                    default_price: variant.default_price || null,
                    cost: variant.cost || null,
                    created_at: variant.created_at,
                    updated_at: variant.updated_at || null,
                    deleted_at: variant.deleted_at || null,
                });
            });
        });

        // Upsert both tables
        await Promise.all([
            supabase.from('loyverse_items').upsert(itemsData, { onConflict: 'id' }),
            variantsData.length > 0
                ? supabase.from('loyverse_variants').upsert(variantsData, { onConflict: 'variant_id' })
                : Promise.resolve()
        ]);

        console.log(`✅ Synced ${itemsData.length} items and ${variantsData.length} variants`);
    }

    /**
     * Main Sync Function
     */
    async syncMenu(): Promise<LoyverseSyncResult> {
        console.log('🚀 Starting Loyverse Menu Sync...');

        try {
            const [items, categories] = await Promise.all([
                this.fetchAllItems(),
                this.fetchAllCategories()
            ]);

            await Promise.all([
                this.saveCategories(categories),
                this.saveItems(items)
            ]);

            const result: LoyverseSyncResult = {
                success: true,
                itemsCount: items.length,
                categoriesCount: categories.length,
                syncedAt: new Date().toISOString(),
                message: `Successfully synced ${items.length} items and ${categories.length} categories`
            };

            console.log('🎉 Loyverse Menu Sync Completed Successfully!', result);
            return result;

        } catch (error: any) {
            console.error('❌ Loyverse Menu Sync Failed:', error.message);
            throw error;
        }
    }
}

// Export singleton
export const loyverseService = new LoyverseService();