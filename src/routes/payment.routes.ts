// src/routes/payment.routes.ts
import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { webhookAuthMiddleware } from '../middleware/webhookAuth';

const router = Router();
const paymentController = new PaymentController();

/**
 * Payment Routes
 *
 * All routes related to payment initiation and webhooks
 */

// Initiate payment - Called by frontend (customer flow)
router.post('/initiate', paymentController.initiatePayment);

// Amwal Pay Webhook (Cloud Notifier)
// Protected by signature verification middleware
router.post('/webhook', webhookAuthMiddleware, paymentController.handleWebhook);

export default router;