import cron from 'node-cron';
import { loyverseService } from '../services/loyverse.service';
import { supabase } from '../config/supabase';

class LoyverseSyncJob {
    start() {
        console.log('Loyverse Auto Sync Job Started');

        // Run every 30 minutes
        cron.schedule('*/30 * * * *', async () => {
            console.log(`[Cron] Starting scheduled Loyverse menu sync at ${new Date().toISOString()}`);
            await this.syncAllActiveMerchants();
        });

        // Also run once on server start (optional)
        this.runImmediateSync();
    }

    private async syncAllActiveMerchants() {
        try {
            // 1. Fetch all Active merchants
            const { data: merchants, error } = await supabase
                .from('merchants')
                .select('id')
                .eq('status', 'Active');

            if (error) {
                console.error('[Cron] Failed to fetch active merchants:', error.message);
                return;
            }

            if (!merchants || merchants.length === 0) {
                console.log('[Cron] No active merchants found for synchronization.');
                return;
            }

            console.log(`[Cron] Found ${merchants.length} active merchants to sync.`);

            // 2. Sync each merchant independently
            // Using for...of to avoid overwhelming the API with parallel requests for all merchants
            for (const merchant of merchants) {
                try {
                    const result = await loyverseService.syncMenu(merchant.id);
                    console.log(`[Cron] Sync successful for merchant ${merchant.id} - Items: ${result.itemsCount}`);
                } catch (error: any) {
                    console.error(`[Cron] Sync failed for merchant ${merchant.id}:`, error.message);
                    // We continue to the next merchant even if one fails
                }
            }
        } catch (error: any) {
            console.error('[Cron] Critical failure in syncAllActiveMerchants:', error.message);
        }
    }

    private async runImmediateSync() {
        try {
            console.log('[Cron] Running immediate Loyverse sync on startup...');
            await this.syncAllActiveMerchants();
        } catch (error: any) {
            console.error('[Cron] Initial sync failed:', error.message);
        }
    }
}

export const loyverseSyncJob = new LoyverseSyncJob();
