import { supabase } from '../config/supabase';
import { LoyverseClient } from '../lib/loyverse.client';
import { LoyverseItem, LoyverseCategory, LoyverseItemApi, LoyverseCategoryApi, SyncResult } from '../types/loyverse.types';

export class LoyverseService {
    private client: LoyverseClient;

    constructor() {
        this.client = new LoyverseClient();
    }

    /**
     * Helper to retrieve an active merchant's token
     * Throws error if merchant is not found or not active
     */
    private async getActiveMerchantToken(merchantId: string): Promise<string> {
        const { data, error } = await supabase
            .from('merchants')
            .select('api_token, status')
            .eq('id', merchantId)
            .single();

        if (error || !data) {
            throw new Error(`Merchant ${merchantId} not found in registry`);
        }

        if (data.status !== 'Active') {
            throw new Error(`Merchant ${merchantId} is currently ${data.status}. Access denied.`);
        }

        return data.api_token;
    }

    async getAllItems(merchantId: string): Promise<LoyverseItem[]> {
        const token = await this.getActiveMerchantToken(merchantId);
        const items = await this.client.getAllItems(token);

        // Add merchant_id to each item to convert LoyverseItemApi -> LoyverseItem
        return items.map(item => ({
            ...item,
            merchant_id: merchantId
        }));
    }

    async getCategories(merchantId: string): Promise<LoyverseCategory[]> {
        const token = await this.getActiveMerchantToken(merchantId);
        const categories = await this.client.getCategories(token);

        // Add merchant_id to each category to convert LoyverseCategoryApi -> LoyverseCategory
        return categories.map(cat => ({
            ...cat,
            merchant_id: merchantId
        }));
    }

    private async saveCategories(merchantId: string, categories: LoyverseCategory[]): Promise<void> {
        if (categories.length === 0) return;

        const categoriesData = categories.map(cat => ({
            merchant_id: merchantId,
            id: cat.id,
            name: cat.name,
            handle: cat.handle,
            sort_order: cat.sort_order,
            created_at: cat.created_at,
            updated_at: cat.updated_at,
        }));

        const { error } = await supabase
            .from('loyverse_categories')
            .upsert(categoriesData, { onConflict: 'merchant_id,id' });

        if (error) {
            console.error('Error saving categories to Supabase:', error);
        } else {
            console.log(`Saved/Updated ${categoriesData.length} categories for merchant ${merchantId}`);
        }
    }

    private async saveItems(merchantId: string, items: LoyverseItem[]): Promise<void> {
        if (items.length === 0) return;

        const itemsData = items.map(item => ({
            merchant_id: merchantId,
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
                merchant_id: merchantId,
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
        const { error: itemsError } = await supabase.from('loyverse_items').upsert(itemsData, { onConflict: 'merchant_id,id' });
        if (itemsError) {
            console.error(`Error saving items for merchant ${merchantId}:`, itemsError);
            throw itemsError;
        }
        console.log(`Saved/Updated ${itemsData.length} menu items for merchant ${merchantId}`);

        // Upsert Variants
        if (variantsData.length > 0) {
            const { error: variantsError } = await supabase.from('loyverse_variants').upsert(variantsData, { onConflict: 'merchant_id,variant_id' });
            if (variantsError) {
                console.error(`Error saving variants for merchant ${merchantId}:`, variantsError);
                throw variantsError;
            }
            console.log(`Saved/Updated ${variantsData.length} variants for merchant ${merchantId}`);
        }
    }

    /**
     * INCREMENTAL SYNC: Update a single item and its variants
     */
    async syncSingleItem(merchantId: string, itemId: string): Promise<void> {
        console.log(`Incremental Sync: Updating item ${itemId} for merchant ${merchantId}...`);
        try {
            const token = await this.getActiveMerchantToken(merchantId);
            const itemApi = await this.client.getItem(token, itemId);

            const item: LoyverseItem = {
                ...itemApi,
                merchant_id: merchantId
            };

            await this.saveItems(merchantId, [item]);
            console.log(`Incremental Sync: Item ${itemId} updated successfully.`);
        } catch (error: any) {
            console.error(`Incremental Sync failed for item ${itemId}:`, error.message);
            throw error;
        }
    }

    /**
     * INCREMENTAL SYNC: Update a single category
     */
    async syncSingleCategory(merchantId: string, categoryId: string): Promise<void> {
        console.log(`Incremental Sync: Updating category ${categoryId} for merchant ${merchantId}...`);
        try {
            const token = await this.getActiveMerchantToken(merchantId);
            const categoryApi = await this.client.getCategory(token, categoryId);

            const category: LoyverseCategory = {
                ...categoryApi,
                merchant_id: merchantId
            };

            await this.saveCategories(merchantId, [category]);
            console.log(`Incremental Sync: Category ${categoryId} updated successfully.`);
        } catch (error: any) {
            console.error(`Incremental Sync failed for category ${categoryId}:`, error.message);
            throw error;
        }
    }

    async syncMenu(merchantId: string): Promise<SyncResult> {
        console.log(`Starting Loyverse Menu Sync for merchant: ${merchantId}...`);

        try {
            const [items, categories] = await Promise.all([
                this.getAllItems(merchantId),
                this.getCategories(merchantId)
            ]);

            // CRITICAL: Must save categories FIRST to satisfy Foreign Key constraints in items table
            await this.saveCategories(merchantId, categories);
            await this.saveItems(merchantId, items);

            console.log(`Loyverse Menu Sync Completed Successfully for merchant ${merchantId}`);

            return {
                success: true,
                itemsCount: items.length,
                categoriesCount: categories.length,
                syncedAt: new Date().toISOString()
            };
        } catch (error: any) {
            console.error(`Loyverse Sync failed for merchant ${merchantId}:`, error.message);
            throw error;
        }
    }
}

// Export singleton instance
export const loyverseService = new LoyverseService();
