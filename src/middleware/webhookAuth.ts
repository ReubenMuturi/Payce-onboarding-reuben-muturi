// src/middleware/webhookAuth.ts
import { Request, Response, NextFunction } from 'express';
import { amwalConfig } from '../config/amwal.config';

export const webhookAuthMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const signature = req.headers['x-amwal-signature'] ||
            req.headers['x-signature'] ||
            req.headers['amwal-signature'];

        // Basic protection: Reject in production if no signature is present
        if (!signature) {
            if (!amwalConfig.useMock && process.env.NODE_ENV === 'production') {
                res.status(401).send('Unauthorized: Missing signature');
                return;
            }
            // In mock/development mode, allow missing signature for easier testing
        }

        // TODO: Implement full signature verification once Amwal provides the exact method
        // Example:
        // const isValid = verifyAmwalSignature(req.body, signature as string, process.env.AMWAL_WEBHOOK_SECRET!);
        // if (!isValid && !amwalConfig.useMock) {
        //     res.status(401).send('Invalid signature');
        //     return;
        // }

        next();
    } catch (error) {
        console.error('[WebhookAuth] Error processing middleware:', error);

        // Fail open in development, fail closed in production
        if (process.env.NODE_ENV === 'production' && !amwalConfig.useMock) {
            res.status(401).send('Unauthorized');
            return;
        }

        next(error);
    }
};