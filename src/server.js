// src/server.js
// ================================================
// Payce Dummy Backend - Main Server File
// ================================================
// Purpose: This is the entry point of the backend.
// It sets up the Express server, middleware, and all API routes.

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Import our services and database client
const { loyverseService } = require('./services/loyverse.service');
const { supabase } = require('./config/supabase');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ====================== MIDDLEWARE ======================
// Middleware runs before routes and helps process requests
app.use(cors());                    // Allows frontend (React) to call this backend
app.use(express.json());            // Parses incoming JSON request bodies

console.log('Payce Dummy Backend Starting...');

// ====================== BASIC HEALTH CHECK ======================
// Simple route to check if server is alive
app.get('/', (req, res) => {
    res.json({
        message: "Payce Dummy Backend is running! ",
        status: "healthy",
        version: "1.0",
        endpoints: {
            menu: "GET /api/menu",
            sync: "POST /api/sync/loyverse"
        }
    });
});

// ====================== PUBLIC MENU ENDPOINT ======================
/**
 * GET /api/menu
 * Purpose: Returns the menu to the frontend (React app)
 * This is the main endpoint customers will use indirectly when scanning QR
 */
app.get('/api/menu', async (req, res) => {
    try {
        const { data: items, error } = await supabase
            .from('loyverse_items')
            .select(`
                *,
                variants:loyverse_variants(*)
            `)
            .is('deleted_at', null)                    // Exclude soft-deleted items
            .order('name', { ascending: true });

        if (error) {
            console.error('Supabase Error in /api/menu:', error);
            return res.status(500).json({
                success: false,
                message: "Database error while fetching menu"
            });
        }

        res.json({
            success: true,
            count: items.length,
            data: items,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Unexpected error in /api/menu:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching menu"
        });
    }
});

// ====================== MANUAL SYNC ENDPOINT ======================
/**
 * POST /api/sync/loyverse
 * Purpose: Manually triggers sync from Loyverse POS to our database
 * Useful during development and for testing
 */
app.post('/api/sync/loyverse', async (req, res) => {
    console.log('Manual Loyverse sync requested...');

    try {
        const result = await loyverseService.syncMenu();

        res.json({
            ...result,
            message: "Menu sync completed successfully"
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

// ====================== 404 HANDLER ======================
// Catch all undefined routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found. Check available endpoints."
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server successfully running on http://localhost:${PORT}`);
    console.log(`Available Endpoints:`);
    console.log(`   GET  → http://localhost:${PORT}/api/menu`);
    console.log(`   POST → http://localhost:${PORT}/api/sync/loyverse`);
});