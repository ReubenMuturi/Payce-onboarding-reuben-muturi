import cron from 'node-cron';
import { supabase } from '../config/supabase';
import { loyverseService } from '../services/loyverse.service';
import { logger } from '../lib/logger';

class LoyverseDebounceProcessor {
    private isProcessing = false;

    start() {
        logger.info('Loyverse Debounce Processor Job Started');

        // Run every 5 seconds to check for expired windows
        cron.schedule('*/5 * * * * *', async () => {
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

            for (const row of expiredRows) {
                const { merchant_id, resource_ids } = row;

                try {
                    // We delegate the hybrid sync logic (Full vs Targeted) to the service
                    await this.handleDebouncedSync(merchant_id, resource_ids);

                    // Delete the row after successful processing
                    await supabase
                        .from('loyverse_webhook_debounce')
                        .delete()
                        .eq('merchant_id', merchant_id);

                } catch (syncError: any) {
                    logger.error({ merchantId: merchant_id, err: syncError }, '[Debounce] Failed to process resources for merchant');
                    // Note: We don't delete the row here so it can be retried in the next tick,
                    // but in production, you might want to implement a max-retry counter to avoid infinite loops.
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    private async handleDebouncedSync(merchantId: string, resourceList: string[]) {
        // HYBRID STRATEGY (matching previous service logic)
        // If many resources changed, a full sync is more efficient.
        if (resourceList.length > 10) {
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
