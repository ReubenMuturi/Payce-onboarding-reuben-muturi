import { createClient } from '@supabase/supabase-js';
import { logger } from '../lib/logger';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('CRITICAL ERROR: Missing Supabase credentials in .env file (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

logger.info('Supabase client initialized successfully');