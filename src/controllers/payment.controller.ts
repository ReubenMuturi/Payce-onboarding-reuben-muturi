// src/controllers/payment.controller.ts
import { Request, Response } from 'express';
import { AmwalPayService } from '../services/payment/AmwalPayService';

export class PaymentController {
    private amwalService: AmwalPayService;

    constructor() {
        this.amwalService = new AmwalPayService();
    }

    /**
     * Initiate Payment - Called from frontend when customer clicks "Pay"
     */
    initiatePayment = async (req: Request, res: Response): Promise<void> => {
        try {
            const { billId, amount, userId } = req.body;

            if (!billId || typeof billId !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Valid billId is required',
                });
                return;
            }

            const numericAmount = Number(amount);
            if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
                res.status(400).json({
                    success: false,
                    error: 'Valid positive amount is required',
                });
                return;
            }

            const result = await this.amwalService.initiatePayment(
                billId,
                numericAmount,
                userId
            );

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            const statusCode = error.message?.includes('already been fully paid') ? 409 : 500;

            res.status(statusCode).json({
                success: false,
                error: error.message || 'Failed to initiate payment',
            });
        }
    };

    /**
     * Handle Amwal Pay Webhook
     * MUST always return 200 OK to prevent Amwal from retrying indefinitely
     */
    handleWebhook = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.amwalService.handleWebhook(req.body);

            res.status(200).send('OK');
        } catch (error: any) {
            // Log internally but always return 200 for webhook
            console.error('[Webhook Error] Failed to process Amwal webhook:', error.message);

            res.status(200).send('OK');
        }
    };
}