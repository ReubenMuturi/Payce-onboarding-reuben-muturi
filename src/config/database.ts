// src/config/database.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config(); // Load .env file

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

let supabase: any;
let testDatabaseConnection: () => Promise<void>;

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.length < 10) {
    console.warn('Supabase environment variables missing or invalid. Running in MOCK MODE.');

    // Mock Supabase Client for development
    supabase = {
        from: (table: string) => ({
            insert: async (data: any) => ({
                data: { id: 'mock-' + Date.now(), ...data },
                error: null
            }),
            select: async () => ({ data: [], error: null }),
            update: async () => ({ error: null }),
            eq: (column: string, value: any) => ({
                single: async () => ({
                    data: { id: 'mock-id', bill_id: 'mock-bill-id' },
                    error: null
                })
            }),
        }),
    };

    testDatabaseConnection = async () => {
        console.log('Mock Supabase Client Active');
    };
} else {
    // Real Supabase Client
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    testDatabaseConnection = async () => {
        try {
            const { error } = await supabase.from('bills').select('id').limit(1);
            if (error) console.error('Supabase connection test failed:', error.message);
            else console.log('Supabase connected successfully');
        } catch (err) {
            console.error('Supabase connection error:', err);
        }
    };
}

export { supabase, testDatabaseConnection };

// Graceful shutdown
process.on('beforeExit', () => {
    console.log('Shutting down...');
});