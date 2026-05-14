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
    async handleWebhook(payload: WebhookPayload): Promise<WebhookResponse> {
        const eventType = payload.event_type || payload.type || payload.event || 'unknown';
        const resourceId = payload.resource_id || payload.id || null;

        console.log(`Received Loyverse Webhook → Event: "${eventType}" | Resource ID: ${resourceId || 'N/A'}`);

        try {
            // Log webhook for auditing
            const { error: logError } = await supabase
                .from('loyverse_webhooks')
                .insert({
                    event_type: eventType,
                    resource_id: resourceId,
                    payload: payload,
                    processed: false,
                    created_at: new Date().toISOString()
                });

            if (logError) {
                console.error('Failed to log webhook to database:', logError);
            }

            // Determine if this is a menu-related event
            const menuRelatedEvents = [
                'item.created', 'item.updated', 'item.deleted',
                'variant.created', 'variant.updated', 'variant.deleted',
                'category.created', 'category.updated'
            ];

            const isMenuEvent = menuRelatedEvents.includes(eventType) ||
                eventType.includes('item') ||
                eventType.includes('variant') ||
                eventType.includes('category');

            if (isMenuEvent) {
                console.log(`Menu-related change detected (${eventType}). Triggering automatic resync...`);
                await this.handleMenuUpdate(eventType);
            } else {
                console.log(`Unhandled event type: ${eventType}`);
            }

            return {
                success: true,
                eventType,
                message: 'Webhook processed successfully'
            };

        } catch (error: any) {
            console.error(`Error processing webhook (${eventType}):`, error.message);
            return {
                success: false,
                eventType,
                error: error.message
            };
        }
    }

    private async handleMenuUpdate(triggeredBy: string = 'unknown'): Promise<any> {
        try {
            console.log(`Starting automatic menu resync (triggered by: ${triggeredBy})...`);

            const result = await loyverseService.syncMenu();

            console.log('Automatic resync completed successfully via webhook');
            return result;

        } catch (error: any) {
            console.error('Automatic resync via webhook failed:', error.message);
            throw error;
        }
    }
}

// Export singleton instance
export const loyverseWebhookService = new LoyverseWebhookService();