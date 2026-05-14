// src/routes/payment.routes.ts
import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { webhookAuthMiddleware } from '../middleware/webhookAuth';

const router = Router();
const paymentController = new PaymentController();

// Public endpoint - called by frontend
router.post('/initiate', paymentController.initiatePayment);

// Webhook endpoint from Amwal Pay (Cloud Notifier)
router.post('/webhook', webhookAuthMiddleware, paymentController.handleWebhook);

export default router;