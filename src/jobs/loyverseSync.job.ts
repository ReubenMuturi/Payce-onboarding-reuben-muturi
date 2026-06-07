import cron from 'node-cron';
import pLimit from 'p-limit';
import { loyverseService } from '../services/loyverse.service';
import { supabase } from '../config/supabase';
import { loyverseConfig } from '../config/loyverse';
import { logger } from '../lib/logger';

class LoyverseSyncJob {
    start() {
        logger.info('Loyverse Adaptive Sync Job Started');

        // Run every 15 minutes to check for tiered sync requirements
        cron.schedule('*/15 * * * *', async () => {
            logger.info(`[Cron] Starting adaptive Loyverse sync check at ${new Date().toISOString()}`);
            await this.syncAllActiveMerchants();
        });

        // Also run once on server start
        this.runImmediateSync();
    }

    private async syncAllActiveMerchants() {
        try {
            // 1. Identify merchants with recent webhook activity (Last 1 hour)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { data: activeWebhookMerchants, error: webhookError } = await supabase
                .from('loyverse_webhooks')
                .select('merchant_id')
                .gte('created_at', oneHourAgo);

            if (webhookError) {
                logger.error({ err: webhookError.message }, '[Cron] Failed to fetch recent webhook activity');
            }

            const highPriorityIds = new Set(activeWebhookMerchants?.map(m => m.merchant_id) || []);

            // 2. Fetch all Active merchants with their sync metadata
            const { data: merchants, error } = await supabase
                .from('merchants')
                .select('id, last_synced_at, is_dirty')
                .eq('status', 'Active');

            if (error) {
                logger.error({ err: error.message }, '[Cron] Failed to fetch active merchants');
                return;
            }

            if (!merchants || merchants.length === 0) {
                logger.info('[Cron] No active merchants found for synchronization.');
                return;
            }

            // 3. Apply Adaptive Scheduling Logic
            const now = new Date();
            const merchantsToSync = merchants.filter(merchant => {
                // Condition 1: Dirty flag is set (Immediate priority from webhooks)
                if (merchant.is_dirty) return true;

                // Condition 2: Never synced (New merchant)
                if (!merchant.last_synced_at) return true;

                const lastSyncDate = new Date(merchant.last_synced_at);
                const diffMs = now.getTime() - lastSyncDate.getTime();

                // Condition 3: High Priority (Webhook in last 1 hour AND > 15m since last sync)
                if (highPriorityIds.has(merchant.id) && diffMs > 15 * 60 * 1000) {
                    return true;
                }

                // Condition 4: Standard Priority (> 2 hours since last sync)
                if (diffMs > 2 * 60 * 60 * 1000) {
                    return true;
                }

                // Condition 5: Cold Storage Safety (> 24 hours since last sync)
                if (diffMs > 24 * 60 * 60 * 1000) {
                    return true;
                }

                return false;
            });

            if (merchantsToSync.length === 0) {
                logger.info('[Cron] No merchants require synchronization at this time.');
                return;
            }

            logger.info({ count: merchantsToSync.length }, `[Cron] Found ${merchantsToSync.length} merchants requiring sync.`);

            // 4. Process with Controlled Parallelism
            const limit = pLimit(loyverseConfig.syncConcurrency);

            const syncPromises = merchantsToSync.map(merchant =>
                limit(async () => {
                    try {
                        const result = await loyverseService.syncMenu(merchant.id);
                        logger.info({ merchantId: merchant.id, itemsCount: result.itemsCount }, `[Cron] Sync successful for merchant ${merchant.id}`);
                    } catch (error: any) {
                        logger.error({ merchantId: merchant.id, err: error.message }, `[Cron] Sync failed for merchant ${merchant.id}`);
                    }
                })
            );

            await Promise.all(syncPromises);
        } catch (error: any) {
            logger.error({ err: error.message }, '[Cron] Critical failure in syncAllActiveMerchants');
        }
    }

    private async runImmediateSync() {
        try {
            logger.info('[Cron] Running immediate Loyverse sync on startup...');
            await this.syncAllActiveMerchants();
        } catch (error: any) {
            logger.error({ err: error.message }, '[Cron] Initial sync failed');
        }
    }
}

export const loyverseSyncJob = new LoyverseSyncJob();
