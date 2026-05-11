// src/services/loyverse.service.js
const axios = require('axios');
require('dotenv').config();
const { supabase } = require('../config/supabase');

const BASE_URL = 'https://api.loyverse.com/v1.0';
const ACCESS_TOKEN = process.env.LOYVERSE_ACCESS_TOKEN;

const loyverseApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
    },
});

const loyverseService = {

    async getAllItems() {
        try {
            const response = await loyverseApi.get('/items?limit=200');
            return response.data.items || [];
        } catch (error) {
            console.error('Error fetching items:', error.response?.data || error.message);
            throw error;
        }
    },

    async getCategories() {
        try {
            const response = await loyverseApi.get('/categories?limit=100');
            return response.data.categories || [];
        } catch (error) {
            console.error('Error fetching categories:', error.response?.data || error.message);
            return [];
        }
    },

    /** Save Categories to Supabase */
    async saveCategories(categories) {
        if (categories.length === 0) return;

        const { error } = await supabase
            .from('loyverse_categories')
            .upsert(categories, { onConflict: 'id' });

        if (error) console.error('Error saving categories:', error);
        else console.log(`Saved/Updated ${categories.length} categories`);
    },

    /** Save Items + Variants to Supabase */
    async saveItems(items) {
        if (items.length === 0) return;

        // Prepare items
        const itemsData = items.map(item => ({
            id: item.id,
            name: item.item_name,
            handle: item.handle,
            category_id: item.category_id,
            image_url: item.image_url,
            color: item.color,
            track_stock: item.track_stock,
            is_composite: item.is_composite,
            created_at: item.created_at,
            updated_at: item.updated_at,
            deleted_at: item.deleted_at
        }));

        // Prepare variants
        const variantsData = [];
        items.forEach(item => {
            if (item.variants && item.variants.length > 0) {
                item.variants.forEach(variant => {
                    variantsData.push({
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
                        deleted_at: variant.deleted_at
                    });
                });
            }
        });

        // Upsert Items
        await supabase.from('loyverse_items').upsert(itemsData, { onConflict: 'id' });
        console.log(`Saved/Updated ${itemsData.length} items`);

        // Upsert Variants
        if (variantsData.length > 0) {
            await supabase.from('loyverse_variants').upsert(variantsData, { onConflict: 'variant_id' });
            console.log(`Saved/Updated ${variantsData.length} variants`);
        }
    },

    /** Main Sync Function */
    async syncMenu() {
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

            console.log('Loyverse Menu Sync Completed Successfully!');

            return {
                success: true,
                itemsCount: items.length,
                categoriesCount: categories.length,
                syncedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Sync failed:', error.message);
            throw error;
        }
    }
};

module.exports = { loyverseService };