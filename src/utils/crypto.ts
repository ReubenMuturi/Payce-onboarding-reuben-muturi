// src/utils/crypto.ts
import crypto from 'crypto';

/**
 * Generates a secure HMAC-SHA256 hash for Amwal Pay requests.
 *
 * Amwal requires parameters to be sorted alphabetically and concatenated
 * in the format: key1=value1&key2=value2
 */
export const generateSecureHash = (
    params: Record<string, string | number | boolean | null | undefined>,
    secretKey: string
): string => {
    if (!secretKey || secretKey.length < 32) {
        throw new Error('Invalid secretKey: Amwal secure key must be at least 32 characters');
    }

    if (!params || typeof params !== 'object') {
        throw new Error('Parameters must be a valid object');
    }

    // Sort keys alphabetically as required by Amwal
    const sortedKeys = Object.keys(params).sort();

    const concatenatedString = sortedKeys
        .map((key) => {
            const value = params[key] ?? '';
            return `${key}=${value}`;
        })
        .join('&');

    // Create HMAC using SHA256
    const hmac = crypto.createHmac('sha256', Buffer.from(secretKey, 'hex'));

    const hash = hmac
        .update(concatenatedString, 'utf8')
        .digest('hex')
        .toUpperCase();

    return hash;
};

/**
 * Optional: Verify a received hash (useful for webhooks if Amwal provides one)
 */
export const verifySecureHash = (
    params: Record<string, string | number | boolean | null | undefined>,
    receivedHash: string,
    secretKey: string
): boolean => {
    try {
        const calculatedHash = generateSecureHash(params, secretKey);
        return calculatedHash === receivedHash.toUpperCase();
    } catch {
        return false;
    }
};