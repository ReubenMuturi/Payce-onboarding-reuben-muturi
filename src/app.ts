// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Import Routes
import paymentRoutes from './routes/payment.routes';

// Import Database Connection Test
import { testDatabaseConnection } from './config/database';

// Import Reconciliation
import { startReconciliationJob } from './services/payment/AmwalPayService';

const app = express();
const PORT = process.env.PORT || 5000;

// ======================
// Middleware
// ======================
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan('combined'));

// ======================
// Routes
// ======================
app.get('/health', (_req, res) => {
    res.json({
        status: 'OK',
        service: 'Payce Backend',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (_req, res) => {
    res.json({
        message: 'Payce Backend is running',
        endpoints: {
            initiatePayment: 'POST /api/payments/initiate'
        }
    });
});

app.use('/api/payments', paymentRoutes);

// ======================
// Global Error Handler
// ======================
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ======================
// Start Server + Background Jobs
// ======================
const startServer = async () => {
    try {
        await testDatabaseConnection();

        // Start Reconciliation Job (checks stuck payments)
        startReconciliationJob();

        app.listen(PORT, () => {
            console.log(`Payce Backend running on http://localhost:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();