// src/routes/payment.routes.ts
import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { AmwalPayService } from '../services/payment/AmwalPayService';
import { webhookAuthMiddleware } from '../middleware/webhookAuth';

const router = Router();
const paymentService = new AmwalPayService();
const paymentController = new PaymentController(paymentService);

/**
 * Payment Routes
 *
 * All routes related to payment initiation and webhooks.
 */

// Public endpoint - Called by frontend when customer wants to pay
router.post(
    '/initiate',
    paymentController.initiatePayment
);

// Webhook endpoint - Called by Amwal Pay
// This must be protected and always return 200
router.post(
    '/webhook',
    webhookAuthMiddleware,
    paymentController.handleWebhook
);

// Optional: Health check for monitoring
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'payment' });
});

export default router;