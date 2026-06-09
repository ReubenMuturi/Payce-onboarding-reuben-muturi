// src/controllers/payment.controller.ts
import { Request, Response, NextFunction } from 'express';
import { IPaymentService } from '../types/payment.types';
import { z } from 'zod';
import { PaymentError } from '../types/payment.types';
import { logger } from '../lib/logger';

const InitiatePaymentSchema = z.object({
    billId: z.string().uuid('billId must be a valid UUID'),
    amount: z.number().positive('amount must be greater than 0'),
    userId: z.string().optional(),
});

export class PaymentController {
    constructor(private paymentService: IPaymentService) {}

    /**
     * Initiate Payment - Called by frontend when customer clicks "Pay"
     */
    initiatePayment = async (req: Request, res: Response): Promise<void> => {
        try {
            const validated = InitiatePaymentSchema.parse(req.body);

            const result = await this.paymentService.initiatePayment(
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

            // Handle Custom Payment Errors
            if (error instanceof PaymentError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
                return;
            }

            logger.error({ err: error }, '[PaymentController] Initiate payment failed');

            res.status(500).json({
                success: false,
                error: 'Failed to initiate payment. Please try again.',
                ...(process.env.NODE_ENV === 'development' && { message: error.message }),
            });
        }
    };

    /**
     * Handle Amwal Pay Webhook
     * IMPORTANT: Always return 200 OK to prevent Amwal from retrying the webhook endlessly.
     */
    handleWebhook = async (req: Request, res: Response): Promise<void> => {
        const requestId = (req as any).requestId;
        try {
            await this.paymentService.handleWebhook(req.body);

            logger.info({ requestId }, 'Webhook processed successfully');
            res.status(200).send('OK');
        } catch (error: any) {
            logger.error({ requestId, err: error }, 'Webhook processing failed');

            if (error instanceof PaymentError && error.retryable) {
                res.status(500).send('Infrastructure Error: Please Retry');
                return;
            }

            res.status(200).send('OK');
        }
    };
}
