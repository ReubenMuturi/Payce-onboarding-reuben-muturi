// src/middleware/loyverseWebhookAuth.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import crypto from 'crypto';

/**
 * Webhook Authentication Middleware for Loyverse
 * Ensures that incoming webhook requests are actually from Loyverse
 * by verifying the signature against the merchant's stored secret.
 */
export const loyverseWebhookAuthMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const merchantId = req.headers['x-merchant-id'] as string || req.query.merchantId as string;

        if (!merchantId) {
            console.warn('[Loyverse Auth] Webhook received without merchantId');
            // We allow it to pass to the controller which will handle the 200 response
            // to stop Loyverse retries, but it will eventually fail processing.
            return next();
        }

        // 1. Fetch the merchant's webhook secret from the database
        const { data: merchant, error } = await supabase
            .from('merchants')
            .select('webhook_secret')
            .eq('id', merchantId)
            .single();

        if (error || !merchant) {
            console.error(`[Loyverse Auth] Merchant ${merchantId} not found or error fetching secret`);
            if (process.env.NODE_ENV === 'production') {
                res.status(401).json({ error: 'Unauthorized: Merchant not found' });
                return;
            }
            return next();
        }

        const secret = merchant.webhook_secret;

        // If no secret is configured for this merchant, we can't verify the signature
        if (!secret) {
            console.warn(`[Loyverse Auth] No webhook secret configured for merchant ${merchantId}`);
            if (process.env.NODE_ENV === 'production') {
                res.status(401).json({ error: 'Unauthorized: Secret not configured' });
                return;
            }
            return next();
        }

        // 2. Verify Signature
        // Loyverse typically sends a signature in the headers.
        const signature = req.headers['x-loyverse-signature'] as string || req.headers['signature'] as string;

        if (!signature) {
            console.warn(`[Loyverse Auth] Missing signature for merchant ${merchantId}`);
            if (process.env.NODE_ENV === 'production') {
                res.status(401).json({ error: 'Unauthorized: Missing signature' });
                return;
            }
            return next();
        }

        // Verify using HMAC-SHA256 of the raw body
        // Note: This assumes the body is available. In a production setup with express.json(),
        // you might need a custom body-parser to keep the raw buffer for verification.
        const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(bodyString)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.warn(`[Loyverse Auth] Invalid signature detected for merchant ${merchantId}`);
            if (process.env.NODE_ENV === 'production') {
                res.status(401).json({ error: 'Unauthorized: Invalid signature' });
                return;
            }
            return next();
        }

        console.info(`[Loyverse Auth] Webhook verified successfully for merchant ${merchantId}`);
        next();
    } catch (error) {
        console.error('[Loyverse Auth] Critical error during signature verification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
