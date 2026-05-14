// src/middleware/webhookAuth.ts
import { Request, Response, NextFunction } from 'express';

export const webhookAuthMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const signature = req.headers['x-amwal-signature'] ||
            req.headers['x-signature'] ||
            req.headers['amwal-signature'];

        const ip = req.ip || req.socket.remoteAddress;

        console.log(`Webhook received from IP: ${ip}`);

        // === Basic Security Checks ===
        if (!signature) {
            console.warn('Webhook received without signature');
            // In development, allow it. In production, reject.
            if (process.env.NODE_ENV === 'production') {
                return res.status(401).send('Unauthorized: Missing signature');
            }
        }

        // TODO: Implement real signature validation when you get the spec from Amwal
        // Example placeholder:
        // const expectedSignature = generateWebhookSignature(req.body, process.env.AMWAL_WEBHOOK_SECRET!);
        // if (signature !== expectedSignature) {
        //     console.warn('Invalid webhook signature');
        //     return res.status(401).send('Invalid signature');
        // }

        // Optional: IP Whitelisting (add Amwal IPs when known)
        // const allowedIPs = ['154.XXX.XXX.XXX'];
        // if (!allowedIPs.includes(ip)) { ... }

        console.log('Webhook passed security checks');
        next();
    } catch (error) {
        console.error('Webhook auth middleware error:', error);
        next(error);
    }
};