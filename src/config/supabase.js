// src/config/supabase.js
// Purpose: Central place to configure and export Supabase client
// We use the Service Role Key because this runs on the backend (server-side)

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get credentials from .env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("CRITICAL ERROR: Supabase credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are missing in .env file");
    process.exit(1); // Stop the app if credentials are missing
}

// Create Supabase client with recommended settings for backend usage
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log("Supabase client initialized successfully");

module.exports = { supabase };
