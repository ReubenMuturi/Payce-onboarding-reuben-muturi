// src/config/amwal.config.ts
export const amwalConfig = {
    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Base URLs - Use test environment by default
    baseUrl: process.env.AMWAL_BASE_URL || 'https://test.amwalpg.com',

    // === MOCK CREDENTIALS (Replace with real ones in production) ===
    merchantId: process.env.AMWAL_MERCHANT_ID || 'MOCK_MERCHANT_ID_12345',
    terminalId: process.env.AMWAL_TERMINAL_ID || 'MOCK_TERMINAL_ID_67890',
    secureKey: process.env.AMWAL_SECURE_KEY || 'MOCK_SECURE_KEY_32_CHARACTERS_MINIMUM_FOR_TESTING',

    // Fixed values for Oman
    currencyId: 512, // OMR

    // Other settings
    paymentTimeoutMs: 10 * 60 * 1000, // 10 minutes
    defaultLanguage: 'en',
};

export default amwalConfig;