// src/utils/crypto.ts
import crypto from 'crypto';

/**
 * Generates Secure Hash for Amwal Pay API requests
 *
 * Amwal requires:
 * 1. Keys sorted alphabetically
 * 2. Concatenated as key=value&key2=value2...
 * 3. HMAC-SHA256 using the secret key
 * 4. Result in UPPERCASE hex
 */
export const generateSecureHash = (
    params: Record<string, string | number | boolean | null | undefined>,
    secretKey: string
): string => {
    if (!secretKey || secretKey.length < 16) {
        throw new Error('Invalid secretKey: Must be at least 16 characters');
    }

    if (!params || typeof params !== 'object') {
        throw new Error('Params must be a valid object');
    }

    // Sort keys alphabetically as required by Amwal
    const sortedKeys = Object.keys(params).sort();

    const concatenatedString = sortedKeys
        .map((key) => `${key}=${params[key] ?? ''}`)
        .join('&');

    // Create HMAC-SHA256 hash
    const hmac = crypto.createHmac('sha256', Buffer.from(secretKey, 'hex'));
    const hash = hmac.update(concatenatedString, 'utf8').digest('hex');

    return hash.toUpperCase();
};

/**
 * Alternative version that accepts string secret (for future flexibility)
 */
export const generateSecureHashFromString = (
    params: Record<string, any>,
    secretKey: string
): string => {
    return generateSecureHash(params, secretKey);
};