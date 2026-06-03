import { supabase } from '../config/supabase';
import { loyverseService } from './loyverse.service';

interface WebhookPayload {
    event_type?: string;
    type?: string;
    event?: string;
    resource_id?: string;
    id?: string;
    [key: string]: any;
}

interface WebhookResponse {
    success: boolean;
    eventType: string;
    message?: string;
    error?: string;
}

export class LoyverseWebhookService {
    // Merchant-specific debounce timers
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

    // Buffer for resources that need updating per merchant
    private pendingResources: Map<string, Set<string>> = new Map();

    async handleWebhook(payload: WebhookPayload, merchantId: string): Promise<WebhookResponse> {
        const eventType = payload.event_type || payload.type || payload.event || 'unknown';
        const resourceId = payload.resource_id || payload.id || null;

        console.log(`Received Loyverse Webhook for merchant ${merchantId} → Event: "${eventType}" | Resource ID: ${resourceId || 'N/A'}`);

        try {
            // 1. Log webhook for auditing (Immediate)
            const { error: logError } = await supabase
                .from('loyverse_webhooks')
                .insert({
                    merchant_id: merchantId,
                    event_type: eventType,
                    resource_id: resourceId,
                    payload: payload,
                    processed: false,
                    created_at: new Date().toISOString()
                });

            if (logError) {
                console.error('Failed to log webhook to database:', logError);
            }

            // 2. Filter for menu-related events
            const menuRelatedEvents = [
                'item.created', 'item.updated', 'item.deleted',
                'variant.created', 'variant.updated', 'variant.deleted',
                'category.created', 'category.updated'
            ];

            const isMenuEvent = menuRelatedEvents.includes(eventType) ||
                eventType.includes('item') ||
                eventType.includes('variant') ||
                eventType.includes('category');

            if (!isMenuEvent) {
                console.log(`Unhandled event type: ${eventType} for merchant ${merchantId}`);
                return { success: true, eventType, message: 'Event ignored (non-menu)' };
            }

            // 3. Debounce Logic: Buffer the request and reset the timer
            if (resourceId) {
                if (!this.pendingResources.has(merchantId)) {
                    this.pendingResources.set(merchantId, new Set());
                }
                this.pendingResources.get(merchantId)!.add(resourceId);
            }

            // Clear existing timer for this merchant and start a new 5-second window
            if (this.debounceTimers.has(merchantId)) {
                clearTimeout(this.debounceTimers.get(merchantId));
            }

            const timer = setTimeout(() => {
                this.processDebouncedSync(merchantId);
            }, 5000);

            this.debounceTimers.set(merchantId, timer);

            return {
                success: true,
                eventType,
                message: 'Event buffered for debounced synchronization'
            };

        } catch (error: any) {
            console.error(`Error processing webhook (${eventType}) for merchant ${merchantId}:`, error.message);
            return {
                success: false,
                eventType,
                error: error.message
            };
        }
    }

    private async processDebouncedSync(merchantId: string): Promise<void> {
        console.log(`[Debounce] Sync window expired for merchant ${merchantId}. Processing buffered changes...`);

        try {
            const resources = this.pendingResources.get(merchantId);

            // Clear state immediately to allow new buffers to form
            this.debounceTimers.delete(merchantId);
            this.pendingResources.delete(merchantId);

            if (!resources || resources.size === 0) {
                console.log(`[Debounce] No resources pending for merchant ${merchantId}. Skipping sync.`);
                return;
            }

            const resourceList = Array.from(resources);
            console.log(`[Debounce] ${resourceList.length} pending resources to update.`);

            // HYBRID STRATEGY:
            // If many resources changed, a full sync is more efficient.
            // If only a few changed, targeted updates are faster.
            if (resourceList.length > 10) {
                console.log(`[Debounce] Large burst detected (${resourceList.length} items). Performing FULL menu sync...`);
                await loyverseService.syncMenu(merchantId);
            } else {
                console.log(`[Debounce] Small burst detected (${resourceList.length} items). Performing TARGETED updates...`);

                // We don't know if the resource is an item or category from the ID alone
                // (though in Loyverse they are usually distinct).
                // We try item first, then category if it fails.
                for (const id of resourceList) {
                    try {
                        // Attempt targeted item update
                        await loyverseService.syncSingleItem(merchantId, id);
                    } catch (e) {
                        try {
                            // If item sync fails, attempt category sync
                            await loyverseService.syncSingleCategory(merchantId, id);
                        } catch (innerE) {
                            console.error(`[Debounce] Failed to sync resource ${id} for merchant ${merchantId} as either item or category.`);
                        }
                    }
                }
            }

            console.log(`[Debounce] Synchronization successfully completed for merchant ${merchantId}.`);
        } catch (error: any) {
            console.error(`[Debounce] Critical failure during debounced sync for merchant ${merchantId}:`, error.message);
        }
    }
}

// Export singleton instance
export const loyverseWebhookService = new LoyverseWebhookService();
