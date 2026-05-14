import cron from 'node-cron';
import { loyverseService } from '../services/loyverse.service';

class LoyverseSyncJob {
    start() {
        console.log('Loyverse Auto Sync Job Started');

        // Run every 30 minutes
        cron.schedule('*/30 * * * *', async () => {
            console.log(`[Cron] Starting scheduled Loyverse menu sync at ${new Date().toISOString()}`);

            try {
                const result = await loyverseService.syncMenu();
                console.log(`[Cron] Loyverse sync completed successfully - Items: ${result.itemsCount}`);
            } catch (error: any) {
                console.error('[Cron] Loyverse sync failed:', error.message);
            }
        });

        // Also run once on server start (optional)
        this.runImmediateSync();
    }

    private async runImmediateSync() {
        try {
            console.log('[Cron] Running immediate Loyverse sync on startup...');
            await loyverseService.syncMenu();
        } catch (error: any) {
            console.error('[Cron] Initial sync failed:', error.message);
        }
    }
}

export const loyverseSyncJob = new LoyverseSyncJob();