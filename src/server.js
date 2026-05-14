// src/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

console.log('Payce Backend Server Starting...');

// Health Check
app.get('/', (req, res) => {
    res.json({
        message: "Payce Backend is running",
        status: "healthy",
        version: "1.0"
    });
});

// Public Menu Endpoint
app.get('/api/menu', async (req, res) => {
    try {
        const { supabase } = require('./config/supabase');

        const { data: items, error } = await supabase
            .from('loyverse_items')
            .select(`
                *,
                variants:loyverse_variants(*)
            `)
            .is('deleted_at', null)
            .order('name', { ascending: true });

        if (error) {
            console.error('Supabase Error fetching menu:', error);
            return res.status(500).json({ success: false, message: "Failed to fetch menu" });
        }

        res.json({
            success: true,
            count: items.length,
            data: items,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in /api/menu:', error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Manual Loyverse Sync Endpoint
app.post('/api/sync/loyverse', async (req, res) => {
    try {
        console.log('Manual Loyverse menu sync requested');

        // Dynamic import for TypeScript module
        const { loyverseService } = await import('./integrations/loyverse/loyverse.service.js');

        const result = await loyverseService.syncMenu();

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Sync failed:', error);
        res.status(500).json({
            success: false,
            message: "Menu synchronization failed",
            error: error.message
        });
    }
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found"
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`→ GET  /api/menu`);
    console.log(`→ POST /api/sync/loyverse`);
});