// src/config/amwal.config.ts
import { z } from 'zod';

const amwalConfigSchema = z.object({
    sandboxMode: z.boolean().default(true),
    useMock: z.boolean().default(false),

    // Required in production
    baseUrl: z.string().url(),
    merchantId: z.string().min(1, 'AMWAL_MERCHANT_ID is required'),
    terminalId: z.string().min(1, 'AMWAL_TERMINAL_ID is required'),
    secureKey: z.string().min(16, 'AMWAL_SECURE_KEY is required and must be at least 16 characters'),

    currencyId: z.number().positive(),
    paymentTimeoutMs: z.number().positive().default(10 * 60 * 1000), // 10 minutes
    defaultLanguage: z.enum(['en', 'ar']).default('en'),
    smartboxUrl: z.string().url(),
});

type AmwalConfig = z.infer<typeof amwalConfigSchema>;

const rawConfig: Record<string, unknown> = {
    sandboxMode: process.env.AMWAL_SANDBOX_MODE === 'true',
    useMock: process.env.AMWAL_USE_MOCK === 'true',

    baseUrl: process.env.AMWAL_BASE_URL,
    merchantId: process.env.AMWAL_MERCHANT_ID,
    terminalId: process.env.AMWAL_TERMINAL_ID,
    secureKey: process.env.AMWAL_SECURE_KEY,

    currencyId: parseInt(process.env.AMWAL_CURRENCY_ID || '512', 10),
    defaultLanguage: process.env.AMWAL_DEFAULT_LANGUAGE,
    smartboxUrl: process.env.AMWAL_SMARTBOX_URL,
};

export const amwalConfig = amwalConfigSchema.parse(rawConfig);

export default amwalConfig;
export type { AmwalConfig };