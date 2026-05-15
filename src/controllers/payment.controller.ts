// src/controllers/payment.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AmwalPayService } from '../services/payment/AmwalPayService';
import { z } from 'zod';

const InitiatePaymentSchema = z.object({
    billId: z.string().uuid('billId must be a valid UUID'),
    amount: z.number().positive('amount must be greater than 0'),
    userId: z.string().optional(),
});

export class PaymentController {
    private amwalService = new AmwalPayService();

    /**
     * Initiate Payment - Called by frontend when customer clicks "Pay"
     */
    initiatePayment = async (req: Request, res: Response): Promise<void> => {
        try {
            const validated = InitiatePaymentSchema.parse(req.body);

            const result = await this.amwalService.initiatePayment(
                validated.billId,
                validated.amount,
                validated.userId
            );

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            if (error.name === 'ZodError') {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.errors,
                });
                return;
            }

            console.error('[PaymentController] Initiate payment failed:', error);

            res.status(500).json({
                success: false,
                error: 'Failed to initiate payment. Please try again.',
                // Never leak internal error details in production
                ...(process.env.NODE_ENV === 'development' && { message: error.message }),
            });
        }
    };

    /**
     * Handle Amwal Pay Webhook
     * IMPORTANT: Always return 200 OK to prevent Amwal from retrying the webhook endlessly.
     */
    handleWebhook = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.amwalService.handleWebhook(req.body);

            // Log success quietly
            console.info('[Webhook] Processed successfully');
            res.status(200).send('OK');
        } catch (error: any) {
            console.error('[Webhook] Processing failed:', error);

            // CRITICAL: Always return 200 for webhooks even on error
            // This tells the gateway "we received it" and stops retries
            res.status(200).send('OK');
        }
    };
}