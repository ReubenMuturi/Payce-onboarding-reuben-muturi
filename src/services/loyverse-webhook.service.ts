import { supabase } from '../config/supabase';
import { loyverseService } from './loyverse.service';
import { logger } from '../lib/logger';

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
    async handleWebhook(payload: WebhookPayload, merchantId: string): Promise<WebhookResponse> {
        const eventType = payload.event_type || payload.type || payload.event || 'unknown';
        const resourceId = payload.resource_id || payload.id || null;

        logger.info({ merchantId, eventType, resourceId }, 'Received Loyverse Webhook');

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
                logger.error({ err: logError }, 'Failed to log webhook to database');
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
                logger.info({ merchantId, eventType }, 'Unhandled event type: event ignored');
                return { success: true, eventType, message: 'Event ignored (non-menu)' };
            }

            // 3. Mark merchant as dirty to trigger an immediate (or prioritized) sync
            const { error: dirtyError } = await supabase
                .from('merchants')
                .update({ is_dirty: true })
                .eq('id', merchantId);

            if (dirtyError) {
                logger.error({ merchantId, err: dirtyError }, 'Failed to set is_dirty flag');
            }

            // 4. Distributed Debounce Logic: Buffer the request in the database
            if (resourceId) {
                const { error: debounceError } = await supabase.rpc('append_resource_to_debounce', {
                    p_merchant_id: merchantId,
                    p_resource_id: resourceId,
                    p_expires_in_seconds: 5
                });

                if (debounceError) {
                    logger.error({ merchantId, resourceId, err: debounceError }, 'Failed to buffer resource');
                }
            }

            return {
                success: true,
                eventType,
                message: 'Event buffered and merchant marked as dirty'
            };

        } catch (error: any) {
            logger.error({ merchantId, eventType, err: error.message }, 'Error processing webhook');
            return {
                success: false,
                eventType,
                error: error.message
            };
        }
    }
}

export const loyverseWebhookService = new LoyverseWebhookService();
