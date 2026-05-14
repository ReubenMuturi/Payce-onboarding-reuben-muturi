import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loyverseController } from '../controllers/loyverse.controller';

const router = Router();

// Rate Limiter for public menu endpoint
const menuRateLimiter = rateLimit({
    windowMs: 60 * 1000,   // 1 minute
    max: 30,               // max 30 requests per minute
    message: { success: false, error: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Routes
router.get('/menu', menuRateLimiter, loyverseController.getMenu);

router.post('/loyverse/sync', loyverseController.syncMenu);

router.post('/webhooks/loyverse', loyverseController.handleWebhook);

export default router;