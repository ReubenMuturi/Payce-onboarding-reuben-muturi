import { supabase } from '../config/supabase';
import { LoyverseClient } from '../lib/loyverse.client';
import { LoyverseItem, LoyverseCategory, SyncResult } from '../types/loyverse.types';

export class LoyverseService {
    private client: LoyverseClient;

    constructor() {
        this.client = new LoyverseClient();
    }

    async getAllItems(): Promise<LoyverseItem[]> {
        return this.client.getAllItems();
    }

    async getCategories(): Promise<LoyverseCategory[]> {
        try {
            return await this.client.getCategories();
        } catch (error) {
            console.error('Error fetching categories from Loyverse:', error);
            return [];
        }
    }

    private async saveCategories(categories: LoyverseCategory[]): Promise<void> {
        if (categories.length === 0) return;

        const categoriesData = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            handle: cat.handle,
            sort_order: cat.sort_order,
            created_at: cat.created_at,
            updated_at: cat.updated_at,
        }));

        const { error } = await supabase
            .from('loyverse_categories')
            .upsert(categoriesData, { onConflict: 'id' });

        if (error) {
            console.error('Error saving categories to Supabase:', error);
        } else {
            console.log(`Saved/Updated ${categoriesData.length} categories`);
        }
    }

    private async saveItems(items: LoyverseItem[]): Promise<void> {
        if (items.length === 0) return;

        const itemsData = items.map(item => ({
            id: item.id,
            name: item.item_name,
            handle: item.handle,
            category_id: item.category_id,
            image_url: item.image_url,
            color: item.color,
            track_stock: item.track_stock || false,
            is_composite: item.is_composite || false,
            created_at: item.created_at,
            updated_at: item.updated_at,
            deleted_at: item.deleted_at,
        }));

        const variantsData = items.flatMap(item =>
            (item.variants || []).map(variant => ({
                variant_id: variant.variant_id,
                item_id: variant.item_id,
                sku: variant.sku,
                barcode: variant.barcode,
                option1_value: variant.option1_value,
                option2_value: variant.option2_value,
                option3_value: variant.option3_value,
                default_price: variant.default_price,
                cost: variant.cost,
                created_at: variant.created_at,
                updated_at: variant.updated_at,
                deleted_at: variant.deleted_at,
            }))
        );

        // Upsert Items
        await supabase.from('loyverse_items').upsert(itemsData, { onConflict: 'id' });
        console.log(`Saved/Updated ${itemsData.length} menu items`);

        // Upsert Variants
        if (variantsData.length > 0) {
            await supabase.from('loyverse_variants').upsert(variantsData, { onConflict: 'variant_id' });
            console.log(`Saved/Updated ${variantsData.length} variants`);
        }
    }

    async syncMenu(): Promise<SyncResult> {
        console.log('Starting Loyverse Menu Sync...');

        try {
            const [items, categories] = await Promise.all([
                this.getAllItems(),
                this.getCategories()
            ]);

            await Promise.all([
                this.saveCategories(categories),
                this.saveItems(items)
            ]);

            console.log('Loyverse Menu Sync Completed Successfully');

            return {
                success: true,
                itemsCount: items.length,
                categoriesCount: categories.length,
                syncedAt: new Date().toISOString()
            };

        } catch (error: any) {
            console.error('Loyverse Sync failed:', error.message);
            throw error;
        }
    }
}

// Export singleton instance
export const loyverseService = new LoyverseService();