import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import loyverseRoutes from './routes/loyverse.routes';
import { loyverseSyncJob } from './jobs/loyverseSync.job';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ====================== MIDDLEWARE ======================
app.use(cors());
app.use(express.json());

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
app.listen(PORT, () => {
    console.log(`Payce Backend running on http://localhost:${PORT}`);
    console.log(`   GET   → /api/menu`);
    console.log(`   POST  → /api/loyverse/sync`);
    console.log(`   POST  → /webhooks/loyverse`);

    // Start automatic Loyverse menu sync job
    loyverseSyncJob.start();
});