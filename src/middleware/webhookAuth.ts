// src/middleware/webhookAuth.ts
import { Request, Response, NextFunction } from 'express';
import amwalConfig from '../config/amwal.config';
import { verifySecureHash } from '../utils/crypto';
import { logger } from '../lib/logger';


/**
 * Webhook Authentication Middleware for Amwal Pay
 * Critical security layer for incoming payment notifications.
 */
export const webhookAuthMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const signature =
            req.headers['x-amwal-signature'] ||
            req.headers['x-signature'] ||
            req.headers['amwal-signature'];

        const ip = req.ip || req.socket.remoteAddress || 'unknown';

        logger.info({ ip }, '[Webhook] Received request');

        // === Signature Validation ===
        if (!signature) {
            logger.warn({ ip }, '[Webhook] Missing signature');

            // In production, we MUST reject requests without signatures
            if (process.env.NODE_ENV === 'production') {
                res.status(401).json({ error: 'Unauthorized: Missing signature' });
                return;
            }
            // In development, we allow it for easier testing, but log a warning
            logger.info('[Webhook] Production mode is OFF; skipping signature requirement');
        } else {
            // Verify the signature using the request body and the secure key
            // We pass req.body as the params for the HMAC calculation
            const isValid = verifySecureHash(req.body, signature as string, amwalConfig.secureKey);

            if (!isValid) {
                logger.warn({ ip }, '[Webhook] Invalid signature detected');

                if (process.env.NODE_ENV === 'production') {
                    res.status(401).json({ error: 'Unauthorized: Invalid signature' });
                    return;
                }
                logger.info('[Webhook] Production mode is OFF; ignoring invalid signature');
            } else {
                logger.info({ ip }, '[Webhook] Signature verified successfully');
            }
        }

        next();
    } catch (error) {
        logger.error({ err: error }, '[Webhook Auth] Critical error during signature verification');
        res.status(500).json({ error: 'Internal server error' });
    }
};