import cron from 'node-cron';
import pLimit from 'p-limit';
import { supabase } from '../config/supabase';
import { loyverseService } from '../services/loyverse.service';
import { logger } from '../lib/logger';
import { loyverseConfig } from '../config/loyverse';

class LoyverseDebounceProcessor {
    private isProcessing = false;

    start() {
        logger.info('Loyverse Debounce Processor Job Started');

        // Run every N seconds to check for expired windows
        cron.schedule(`*/${loyverseConfig.debounceProcessorIntervalSeconds} * * * * *`, async () => {
            if (this.isProcessing) return;

            try {
                await this.processExpiredWindows();
            } catch (error: any) {
                logger.error({ err: error }, 'Critical failure in Loyverse Debounce Processor');
            }
        });
    }

    private async processExpiredWindows() {
        this.isProcessing = true;

        try {
            // 1. Find merchants whose debounce window has expired
            const { data: expiredRows, error } = await supabase
                .from('loyverse_webhook_debounce')
                .select('merchant_id, resource_ids')
                .lt('expires_at', new Date().toISOString());

            if (error) throw error;
            if (!expiredRows || expiredRows.length === 0) return;

            logger.info({ count: expiredRows.length }, '[Debounce] Found expired windows. Processing...');

            const limit = pLimit(10);
            await Promise.all(expiredRows.map(row => limit(async () => {
                const { merchant_id, resource_ids } = row;
                try {
                    await this.handleDebouncedSync(merchant_id, resource_ids);
                    await supabase.from('loyverse_webhook_debounce').delete().eq('merchant_id', merchant_id);
                } catch (syncError: any) {
                    logger.error({ merchantId: merchant_id, err: syncError }, '[Debounce] Failed to process resources for merchant');
                }
            })));
        } finally {
            this.isProcessing = false;
        }
    }

    private async handleDebouncedSync(merchantId: string, resourceList: string[]) {
        // HYBRID STRATEGY (matching previous service logic)
        // If many resources changed, a full sync is more efficient.
        if (resourceList.length > loyverseConfig.burstThreshold) {
            logger.info({ merchantId, count: resourceList.length }, '[Debounce] Large burst detected. Performing FULL sync...');
            await loyverseService.syncMenu(merchantId);
        } else {
            logger.info({ merchantId, count: resourceList.length }, '[Debounce] Small burst detected. Performing TARGETED updates...');

            for (const id of resourceList) {
                try {
                    // Try item then category (as per current implementation)
                    try {
                        await loyverseService.syncSingleItem(merchantId, id);
                    } catch {
                        await loyverseService.syncSingleCategory(merchantId, id);
                    }
                } catch (e: any) {
                    logger.error({ merchantId, resourceId: id, err: e }, '[Debounce] Failed to sync specific resource');
                }
            }
        }
    }
}

export const loyverseDebounceProcessor = new LoyverseDebounceProcessor();
