import cron from 'node-cron';
import pLimit from 'p-limit';
import os from 'os';
import { loyverseService } from '../services/loyverse.service';
import { supabase } from '../config/supabase';
import { loyverseConfig } from '../config/loyverse';
import { logger } from '../lib/logger';

class LoyverseSyncJob {
    start() {
        logger.info('Loyverse Adaptive Sync Job Started');

        // Run every N minutes to check for tiered sync requirements
        cron.schedule(`*/${loyverseConfig.jobCheckIntervalMinutes} * * * *`, async () => {
            logger.info(`[Cron] Starting adaptive Loyverse sync check at ${new Date().toISOString()}`);
            await this.syncAllActiveMerchants();
        });

        // Also run once on server start
        this.runImmediateSync();
    }

    private async acquireLock(lockName: string): Promise<boolean> {
        const lockedBy = os.hostname();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 min TTL

        // 1. Try to acquire the lock
        const { error } = await supabase
            .from('sync_locks')
            .insert({
                lock_name: lockName,
                locked_at: now.toISOString(),
                locked_by: lockedBy,
                expires_at: expiresAt.toISOString()
            });

        if (!error) {
            return true;
        }

        // 2. If lock already exists (duplicate key violation 23505), check for expiration
        if (error.code === '23505') {
            const { data: lock, error: fetchError } = await supabase
                .from('sync_locks')
                .select('expires_at')
                .eq('lock_name', lockName)
                .single();

            if (fetchError || !lock) return false;

            const expiry = new Date(lock.expires_at);
            if (expiry < now) {
                logger.info({ lockName }, `[Lock] Found expired lock. Overwriting...`);
                const { error: updateError } = await supabase
                    .from('sync_locks')
                    .update({
                        locked_at: now.toISOString(),
                        locked_by: lockedBy,
                        expires_at: expiresAt.toISOString()
                    })
                    .eq('lock_name', lockName);

                return !updateError;
            }
        }

        logger.error({ err: error }, `[Lock] Unexpected error acquiring lock ${lockName}`);
        return false;
    }

    private async releaseLock(lockName: string): Promise<void> {
        await supabase
            .from('sync_locks')
            .delete()
            .eq('lock_name', lockName);
    }

    private async refreshLock(lockName: string): Promise<void> {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
        await supabase
            .from('sync_locks')
            .update({
                locked_at: now.toISOString(),
                expires_at: expiresAt.toISOString()
            })
            .eq('lock_name', lockName);
    }

    private async syncAllActiveMerchants() {
        const lockName = 'loyverse_sync_job';
        const lockAcquired = await this.acquireLock(lockName);

        if (!lockAcquired) {
            logger.info(`[Cron] Lock ${lockName} is already held by another instance. Skipping run.`);
            return;
        }

        try {
            // 1. Identify merchants with recent webhook activity (High Priority Candidates)
            const recentActivityMs = loyverseConfig.priorityThresholds.highPriorityRecentActivityMinutes * 60 * 1000;
            const oneHourAgo = new Date(Date.now() - recentActivityMs).toISOString();
            const { data: activeWebhookMerchants, error: webhookError } = await supabase
                .from('loyverse_webhooks')
                .select('merchant_id')
                .gte('created_at', oneHourAgo);

            if (webhookError) {
                logger.error({ err: webhookError.message }, '[Cron] Failed to fetch recent webhook activity');
            }

            const highPriorityIds = new Set(activeWebhookMerchants?.map(m => m.merchant_id) || []);

            // 2. Process Active merchants in batches to prevent OOM (Out of Memory)
            const BATCH_SIZE = 500;
            let offset = 0;
            let hasMore = true;
            let totalProcessed = 0;

            logger.info(`[Cron] Starting paginated sync check for active merchants...`);

            while (hasMore) {
                const { data: merchants, error } = await supabase
                    .from('merchants')
                    .select('id, last_synced_at, is_dirty')
                    .eq('status', 'Active')
                    .range(offset, offset + BATCH_SIZE - 1);

                if (error) {
                    logger.error({ err: error.message, offset }, '[Cron] Error fetching merchant batch');
                    break;
                }

                if (!merchants || merchants.length === 0) {
                    hasMore = false;
                    break;
                }

                if (merchants.length < BATCH_SIZE) {
                    hasMore = false;
                }

                // 3. Apply Adaptive Scheduling Logic to the current batch
                const now = new Date();
                const merchantsToSync = merchants.filter(merchant => {
                    if (merchant.is_dirty) return true;
                    if (!merchant.last_synced_at) return true;

                    const lastSyncDate = new Date(merchant.last_synced_at);
                    const diffMs = now.getTime() - lastSyncDate.getTime();

                    const highPriorityGapMs = loyverseConfig.priorityThresholds.highPrioritySyncGapMinutes * 60 * 1000;
                    if (highPriorityIds.has(merchant.id) && diffMs > highPriorityGapMs) return true;

                    const standardGapMs = loyverseConfig.priorityThresholds.standardPriorityGapMinutes * 60 * 1000;
                    if (diffMs > standardGapMs) return true;

                    const coldGapMs = loyverseConfig.priorityThresholds.coldStorageGapMinutes * 60 * 1000;
                    if (diffMs > coldGapMs) return true;

                    return false;
                });

                if (merchantsToSync.length > 0) {
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
                }

                totalProcessed += merchants.length;
                offset += BATCH_SIZE;
                await this.refreshLock(lockName);
            }

            logger.info(`[Cron] Completed sync check. Total merchants scanned: ${totalProcessed}`);
        } catch (error: any) {
            logger.error({ err: error.message }, '[Cron] Critical failure in syncAllActiveMerchants');
        } finally {
            await this.releaseLock(lockName);
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
