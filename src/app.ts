// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Routes
import paymentRoutes from './routes/payment.routes';

// Config & Utils
import { testDatabaseConnection } from './config/database';
import { startReconciliationJob } from './services/payment/AmwalPayService';

const app = express();
const PORT = process.env.PORT || 5000;

// ======================
// Middleware
// ======================
app.use(helmet()); // Security headers

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-amwal-signature'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging - Only in development for cleaner logs
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ======================
// Health Checks
// ======================
app.get('/health', (_req, res) => {
    res.json({
        status: 'OK',
        service: 'Payce Backend',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});

app.get('/', (_req, res) => {
    res.json({
        message: 'Payce Backend is running successfully',
        version: '1.0.0',
    });
});

// ======================
// API Routes
// ======================
app.use('/api/payments', paymentRoutes);

// ======================
// Global Error Handler
// ======================
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Global Error Handler]', err);

    const statusCode = err.status || 500;

    res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? 'Internal Server Error' : err.message,
        // Only expose error details in development
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// ======================
// Server Startup
// ======================
const startServer = async () => {
    try {
        await testDatabaseConnection();

        // Start background jobs
        startReconciliationJob();

        app.listen(PORT, () => {
            console.log(`Payce Backend started on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
        });

    } catch (error) {
        console.error('Failed to start Payce Backend:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

startServer();