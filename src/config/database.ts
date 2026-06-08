// src/config/database.ts
import { logger } from '../lib/logger';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const databaseConfigSchema = z.object({
    supabaseUrl: z.string().url('SUPABASE_URL must be a valid URL'),
    supabaseServiceKey: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY is required'),
});

const env = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

let supabase: SupabaseClient;

try {
    const config = databaseConfigSchema.parse(env);

    supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
} catch (error: any) {
    logger.error('Supabase Configuration Error:');
    logger.error(error.message);
    logger.error('\nPlease check your .env file and ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correctly set.');
    process.exit(1);
}

/**
 * Test database connection during server startup
 */
export const testDatabaseConnection = async (): Promise<void> => {
    try {
        const { error } = await supabase
            .from('bills')
            .select('id')
            .limit(1);

        if (error) throw error;

        logger.info('Supabase connected successfully');
    } catch (err: any) {
        logger.error({ err: err.message }, 'Supabase connection test failed');
        throw err;
    }
};

export { supabase };
export type Database = typeof supabase;