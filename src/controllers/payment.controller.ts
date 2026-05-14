// src/controllers/payment.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AmwalPayService } from '../services/payment/AmwalPayService';

export class PaymentController {
    private amwalService = new AmwalPayService();

    /**
     * Initiate Payment Flow
     * Called by frontend when customer clicks "Pay"
     */
    initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { billId, amount, userId } = req.body;

            // Input validation
            if (!billId || typeof billId !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Valid billId is required'
                });
            }

            if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid amount is required'
                });
            }

            const result = await this.amwalService.initiatePayment(
                billId,
                Number(amount),
                userId
            );

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error: any) {
            console.error('Payment initiation failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to initiate payment',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };

    /**
     * Handle Amwal Pay Webhook (Cloud Notifier)
     * Important: Always return 200 to prevent Amwal from retrying
     */
    handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.amwalService.handleWebhook(req.body);

            console.log('Webhook processed successfully');
            res.status(200).send('OK');
        } catch (error: any) {
            console.error('Webhook processing error:', error);
            // IMPORTANT: Return 200 anyway to stop Amwal from retrying endlessly
            res.status(200).send('OK');
        }
    };
}