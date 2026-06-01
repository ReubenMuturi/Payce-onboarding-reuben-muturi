// src/app.ts
import 'dotenv/config';   // Must be the first import

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Routes
import paymentRoutes from './routes/payment.routes';

// Config & Services
import { testDatabaseConnection } from './config/database';
import { startReconciliationJob } from './services/payment/AmwalPayService';
import { PaymentError } from './types/payment.types';

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * ======================
 * Middleware
 * ======================
 */
app.use(helmet());

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

/**
 * ======================
 * Routes
 * ======================
 */
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'Payce Backend',
        environment: process.env.NODE_ENV || 'development',
    });
});

app.use('/api/payments', paymentRoutes);

/**
 * ======================
 * Global Error Handler
 * ======================
 */
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // 1. Handle Custom Payment Errors
    if (err instanceof PaymentError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
        });
    }

    // 2. Handle Zod Validation Errors
    if (err.name === 'ZodError') {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: err.errors,
        });
    }

    // 3. Generic Internal Server Error
    console.error('[Global Error]', err);

    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { message: err.message }),
    });
});

/**
 * ======================
 * Server Startup
 * ======================
 */
const startServer = async () => {
    try {
        await testDatabaseConnection();
        startReconciliationJob();

        app.listen(PORT, () => {
            console.log(`Payce Backend running on http://localhost:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start Payce Backend:', error);
        process.exit(1);
    }
};

// Start the application
startServer();
