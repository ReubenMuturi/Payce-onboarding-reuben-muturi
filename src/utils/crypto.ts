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

// --- Encryption at Rest (AES-256-GCM) ---

const GCM_ALGORITHM = 'aes-256-gcm';
const GCM_IV_LENGTH = 12;
const GCM_AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Format: iv:authTag:encryptedContent (all hex)
 */
export function encrypt(plaintext: string, masterKey: string): string {
    if (!masterKey || masterKey.length !== 32) {
        throw new Error('SENSITIVE_DATA_ENCRYPTION_KEY must be exactly 32 characters long');
    }

    const iv = crypto.randomBytes(GCM_IV_LENGTH);
    const cipher = crypto.createCipheriv(GCM_ALGORITHM, Buffer.from(masterKey), iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a ciphertext string using AES-256-GCM.
 */
export function decrypt(ciphertext: string, masterKey: string): string {
    if (!masterKey || masterKey.length !== 32) {
        throw new Error('SENSITIVE_DATA_ENCRYPTION_KEY must be exactly 32 characters long');
    }

    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format. Expected iv:authTag:content');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(GCM_ALGORITHM, Buffer.from(masterKey), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Validates if the current encryption key is correctly configured.
 */
export function validateEncryptionKey(key: string | undefined): boolean {
    if (!key) return false;
    return key.length === 32;
}
