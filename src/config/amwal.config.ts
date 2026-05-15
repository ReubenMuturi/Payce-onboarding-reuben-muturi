// src/config/amwal.config.ts
import { z } from 'zod';

/**
 * Amwal Payment Gateway Configuration
 * All sensitive values must come from environment variables.
 */

const amwalConfigSchema = z.object({
    // Environment
    environment: z.enum(['development', 'staging', 'production']).default('development'),

    // Base URLs
    baseUrl: z.string().url().default('https://test.amwalpg.com'),

    // Required Credentials
    merchantId: z.string().min(1, 'AMWAL_MERCHANT_ID is required'),
    terminalId: z.string().min(1, 'AMWAL_TERMINAL_ID is required'),
    secureKey: z.string().min(32, 'AMWAL_SECURE_KEY must be at least 32 characters'),

    // Business Settings
    currencyId: z.literal(512), // OMR - Fixed for Oman
    defaultLanguage: z.enum(['en', 'ar']).default('en'),

    // Timeouts & Limits
    paymentTimeoutMs: z.number().positive().default(10 * 60 * 1000), // 10 minutes
    maxRetryAttempts: z.number().int().min(1).max(5).default(3),
});

const rawConfig = {
    environment: process.env.NODE_ENV,
    baseUrl: process.env.AMWAL_BASE_URL,
    merchantId: process.env.AMWAL_MERCHANT_ID,
    terminalId: process.env.AMWAL_TERMINAL_ID,
    secureKey: process.env.AMWAL_SECURE_KEY,
    currencyId: 512,
    defaultLanguage: process.env.AMWAL_DEFAULT_LANGUAGE,
    paymentTimeoutMs: process.env.AMWAL_PAYMENT_TIMEOUT_MS
        ? parseInt(process.env.AMWAL_PAYMENT_TIMEOUT_MS, 10)
        : undefined,
};

// Validate and parse config
const config = amwalConfigSchema.parse(rawConfig);

export default config;

// Optional: Export type for usage across the app
export type AmwalConfig = z.infer<typeof amwalConfigSchema>;