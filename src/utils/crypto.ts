import crypto from 'crypto';

export const generateSecureHash = (params: Record<string, any>, secretKey: string): string => {
    // Sort keys alphabetically as per Amwal requirement
    const sortedKeys = Object.keys(params).sort();

    const concatenated = sortedKeys
        .map(key => `${key}=${params[key] ?? ''}`)
        .join('&');

    const hmac = crypto.createHmac('sha256', Buffer.from(secretKey, 'hex'));
    const hash = hmac.update(concatenated, 'utf8').digest('hex');

    return hash.toUpperCase();
};