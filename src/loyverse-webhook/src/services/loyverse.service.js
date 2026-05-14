// src/services/loyverse.service.js
// ================================================
// Loyverse Service
// ================================================
// Purpose: Handles all communication with Loyverse POS API
// and syncing menu data (items, categories, variants) into Supabase.

const axios = require('axios');
require('dotenv').config();
const { supabase } = require('../config/supabase');

// ====================== CONFIGURATION ======================
const BASE_URL = 'https://api.loyverse.com/v1.0';
const ACCESS_TOKEN = process.env.LOYVERSE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
    console.error("ERROR: LOYVERSE_ACCESS_TOKEN is missing in .env file");
    process.exit(1);
}

// Reusable Axios instance for Loyverse API calls
const loyverseApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
    },
});

const loyverseService = {

    /**
     * Fetch all menu items (with variants) from Loyverse
     */
    async getAllItems() {
        try {
            const response = await loyverseApi.get('/items?limit=200');
            return response.data.items || [];
        } catch (error) {
            console.error('Error fetching items from Loyverse:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Fetch all categories from Loyverse
     */
    async getCategories() {
        try {
            const response = await loyverseApi.get('/categories?limit=100');
            return response.data.categories || [];
        } catch (error) {
            console.error('Error fetching categories from Loyverse:', error.response?.data || error.message);
            return []; // Don't fail the whole sync if categories are unavailable
        }
    },

    /**
     * Save Categories to Supabase
     * IMPORTANT: Only map fields that exist in your loyverse_categories table
     */
    async saveCategories(categories) {
        if (categories.length === 0) {
            console.log("No categories to save.");
            return;
        }

        // Map only the fields that exist in your Supabase table
        const categoriesData = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            handle: cat.handle,
            sort_order: cat.sort_order,
            created_at: cat.created_at,
            updated_at: cat.updated_at
        }));

        const { error } = await supabase
            .from('loyverse_categories')
            .upsert(categoriesData, { onConflict: 'id' });

        if (error) {
            console.error('Error saving categories to Supabase:', error);
        } else {
            console.log(`Saved/Updated ${categoriesData.length} categories`);
        }
    },

    /**
     * Save Items and their Variants to Supabase
     * This is the core function — Variants contain pricing information
     */
    async saveItems(items) {
        if (items.length === 0) return;

        // Prepare data for loyverse_items table
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
            deleted_at: item.deleted_at
        }));

        // Prepare data for loyverse_variants table
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
        console.log(`Saved/Updated ${itemsData.length} menu items`);

        // Upsert Variants
        if (variantsData.length > 0) {
            await supabase.from('loyverse_variants').upsert(variantsData, { onConflict: 'variant_id' });
            console.log(`Saved/Updated ${variantsData.length} variants`);
        }
    },

    /**
     * Main Sync Function - Orchestrates the full sync process
     */
    async syncMenu() {
        console.log('Starting Loyverse Menu Sync...');

        try {
            // Fetch data in parallel for better performance
            const [items, categories] = await Promise.all([
                this.getAllItems(),
                this.getCategories()
            ]);

            // Save data to database in parallel
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
            console.error('Loyverse Sync failed:', error.message);
            throw error;
        }
    }
};

module.exports = { loyverseService };