import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './lib/logger';

import loyverseRoutes from './routes/loyverse.routes';
import { loyverseSyncJob } from './jobs/loyverseSync.job';
import { loyverseDebounceProcessor } from './jobs/loyverseDebounceProcessor.job';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ====================== MIDDLEWARE ======================
app.use(cors());
app.use(express.json({
    verify: (req: any, res, buf) => {
        req.rawBody = buf;
    }
}));

// ====================== BASIC HEALTH CHECK ======================
app.get('/', (_req, res) => {
    res.json({
        message: "Payce Backend is running",
        status: "healthy",
        version: "1.0"
    });
});

// ====================== ROUTES ======================
app.use('/api', loyverseRoutes);

// ====================== 404 HANDLER ======================
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found"
    });
});

// ====================== START SERVER ======================
const server = app.listen(PORT, () => {
    logger.info(`Payce Backend running on http://localhost:${PORT}`);
    logger.info(`   GET   → /api/menu`);
    logger.info(`   POST  → /api/loyverse/sync`);
    logger.info(`   POST  → /webhooks/loyverse`);

    // Start automatic Loyverse menu sync job
    loyverseSyncJob.start();
    loyverseDebounceProcessor.start();
});

// Graceful Shutdown Handling
const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down server gracefully...');

    // Stop accepting new requests
    server.close(async () => {
        logger.info('HTTP server closed.');
        // Give some time for active requests/jobs to finish
        process.exit(0);
    });

    // Force exit after 10s if close() hangs
    setTimeout(() => {
        logger.error('Forcing exit after 10s timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
