import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { loyverseService } from '../services/loyverse.service';
import { loyverseWebhookService } from '../services/loyverse-webhook.service';

const SYNC_API_KEY = process.env.SYNC_API_KEY;

export class LoyverseController {

    async getMenu(req: Request, res: Response): Promise<void> {
        const merchantId = req.headers['x-merchant-id'] as string || req.query.merchantId as string;

        if (!merchantId) {
            res.status(400).json({ success: false, error: 'Merchant ID is required' });
            return;
        }

        try {
            const { data, error } = await supabase
                .from('loyverse_items')
                .select(`
                    *,
                    variants:loyverse_variants(*)
                `)
                .eq('merchant_id', merchantId)
                .is('deleted_at', null)
                .order('name');

            if (error) {
                console.error(`Supabase Error in /api/menu for merchant ${merchantId}:`, error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch menu'
                });
                return;
            }

            res.json({
                success: true,
                count: data?.length || 0,
                data: data || [],
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            console.error(`Error fetching menu for merchant ${merchantId}:`, error.message);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    async syncMenu(req: Request, res: Response): Promise<void> {
        const merchantId = req.headers['x-merchant-id'] as string || req.query.merchantId as string;

        if (!merchantId) {
            res.status(400).json({ success: false, error: 'Merchant ID is required' });
            return;
        }

        // Simple API Key Protection
        const providedKey = req.headers['x-sync-key'] as string || req.query.syncKey as string;

        if (!SYNC_API_KEY || providedKey !== SYNC_API_KEY) {
            console.warn(`Unauthorized sync attempt detected for merchant ${merchantId}`);
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        try {
            console.log(`Manual Loyverse menu sync triggered for merchant ${merchantId}`);
            const result = await loyverseService.syncMenu(merchantId);

            res.json({
                success: true,
                message: 'Menu sync completed successfully',
                itemsCount: result.itemsCount,
                categoriesCount: result.categoriesCount,
                syncedAt: result.syncedAt
            });
        } catch (error: any) {
            console.error(`Manual sync failed for merchant ${merchantId}:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async handleWebhook(req: Request, res: Response): Promise<void> {
        const merchantId = req.headers['x-merchant-id'] as string || req.query.merchantId as string;

        if (!merchantId) {
            // We return 200 even for missing merchantId to stop Loyverse from retrying
            // since we can't fix the missing ID without external config.
            console.error('Webhook received without merchantId');
            res.status(200).json({
                success: false,
                error: 'Merchant ID is missing in request'
            });
            return;
        }

        try {
            const result = await loyverseWebhookService.handleWebhook(req.body, merchantId);
            res.status(200).json(result);
        } catch (error: any) {
            console.error(`Webhook handler error for merchant ${merchantId}:`, error.message);
            res.status(200).json({
                success: false,
                error: 'Internal processing error'
            });
        }
    }
}

export const loyverseController = new LoyverseController();