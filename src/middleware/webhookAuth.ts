// src/middleware/webhookAuth.ts
import { Request, Response, NextFunction } from 'express';
import amwalConfig from '../config/amwal.config';

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

        // Basic IP logging (can be enhanced with Winston later)
        console.info(`[Webhook] Received from IP: ${ip}`);

        // === Signature Validation ===
        if (!signature) {
            console.warn(`[Webhook] Missing signature from IP: ${ip}`);

            if (process.env.NODE_ENV === 'production') {
                res.status(401).json({ error: 'Unauthorized: Missing signature' });
                return;
            }
        }

        // TODO: Implement proper signature verification once Amwal provides the algorithm
        // Example:
        // const isValid = verifySecureHash(req.body, signature as string, process.env.AMWAL_WEBHOOK_SECRET!);
        // if (!isValid) {
        //   console.warn(`[Webhook] Invalid signature from IP: ${ip}`);
        //   res.status(401).json({ error: 'Invalid signature' });
        //   return;
        // }

        // Optional: IP Whitelisting (highly recommended in production)
        // const allowedIPs = process.env.AMWAL_ALLOWED_IPS?.split(',') || [];
        // if (process.env.NODE_ENV === 'production' && !allowedIPs.includes(ip)) {
        //   res.status(403).json({ error: 'IP not allowed' });
        //   return;
        // }

        // Rate limiting can be added here using express-rate-limit + Redis

        next();
    } catch (error) {
        console.error('[Webhook Auth] Critical error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};