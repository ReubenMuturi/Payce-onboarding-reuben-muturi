// src/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { loyverseService } = require('./services/loyverse.service');
const { supabase } = require('./config/supabase');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
    res.json({
        message: "Payce Dummy Backend is running!",
        endpoints: {
            menu: "GET /api/menu",
            sync: "POST /api/sync/loyverse"
        }
    });
});

// Public Menu Endpoint - Improved
app.get('/api/menu', async (req, res) => {
    try {
        const { data: items, error } = await supabase
            .from('loyverse_items')
            .select(`
        *,
        variants:loyverse_variants(*)
      `)
            .is('deleted_at', null)
            .order('name', { ascending: true });

        // Better handling without unnecessary throw
        if (error) {
            console.error('Supabase query error:', error);
            return res.status(500).json({
                success: false,
                message: "Database error while fetching menu",
                details: error.message
            });
        }

        res.json({
            success: true,
            count: items.length,
            data: items,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch menu"
        });
    }
});

// Manual Sync Endpoint
app.post('/api/sync/loyverse', async (req, res) => {
    try {
        const result = await loyverseService.syncMenu();
        res.json(result);
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Sync failed"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Test these endpoints:`);
    console.log(`   → GET  http://localhost:${PORT}/api/menu`);
    console.log(`   → POST http://localhost:${PORT}/api/sync/loyverse`);
});