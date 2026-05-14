// src/services/loyverse-webhook.service.js
// ================================================
// Loyverse Webhook Service
// ================================================
// Purpose: Receives webhooks from Loyverse, logs them, and triggers
// appropriate actions (especially menu resync when items change).

const { supabase } = require('../config/supabase');
const { loyverseService } = require('./loyverse.service');

const loyverseWebhookService = {

    /**
     * Main handler for all incoming Loyverse webhooks
     */
    async handleWebhook(payload) {
        // Log the full raw payload for debugging (very useful during development)
        console.log('Full Webhook Payload Received:', JSON.stringify(payload, null, 2));

        // Loyverse may send event_type in different formats. Handle multiple possibilities.
        const eventType = payload.event_type || payload.type || payload.event || 'unknown';
        const resourceId = payload.resource_id || payload.id || null;

        console.log(`Received Loyverse Webhook → Event: "${eventType}" | Resource ID: ${resourceId || 'N/A'}`);

        try {
            // === 1. Log the webhook for auditing ===
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

            // === 2. Route based on event type ===
            const menuRelatedEvents = [
                'item.created', 'item.updated', 'item.deleted',
                'variant.created', 'variant.updated', 'variant.deleted',
                'category.created', 'category.updated'
            ];

            if (menuRelatedEvents.includes(eventType) ||
                eventType.includes('item') ||
                eventType.includes('variant') ||
                eventType.includes('category')) {

                console.log(`Menu-related change detected (${eventType}). Triggering automatic resync...`);
                await this.handleMenuUpdate(eventType);
            } else {
                console.log(`Unhandled event type: ${eventType}`);
            }

            return {
                success: true,
                eventType,
                message: "Webhook processed successfully"
            };

        } catch (error) {
            console.error(`Error processing webhook (${eventType}):`, error.message);
            return {
                success: false,
                eventType,
                error: error.message
            };
        }
    },

    /**
     * Trigger menu resync when relevant changes occur
     */
    async handleMenuUpdate(triggeredBy = 'unknown') {
        try {
            console.log(`Starting automatic menu resync (triggered by: ${triggeredBy})...`);

            const result = await loyverseService.syncMenu();

            console.log('Automatic resync completed successfully via webhook!', {
                items: result.itemsCount,
                categories: result.categoriesCount
            });

            return result;

        } catch (error) {
            console.error('Automatic resync via webhook failed:', error.message);
            throw error;
        }
    }
};

module.exports = { loyverseWebhookService };