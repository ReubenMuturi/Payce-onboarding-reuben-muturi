import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { loyverseService } from '../services/loyverse.service';
import { loyverseWebhookService } from '../services/loyverse-webhook.service';
import { logger } from '../lib/logger';

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
                logger.error({ merchantId, err: error }, `Supabase Error in /api/menu for merchant ${merchantId}`);
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
            logger.error({ merchantId, err: error.message }, `Error fetching menu for merchant ${merchantId}`);
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
            logger.warn({ merchantId }, `Unauthorized sync attempt detected`);
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        try {
            logger.info({ merchantId }, `Manual Loyverse menu sync triggered`);
            const result = await loyverseService.syncMenu(merchantId);

            res.json({
                success: true,
                message: 'Menu sync completed successfully',
                itemsCount: result.itemsCount,
                categoriesCount: result.categoriesCount,
                syncedAt: result.syncedAt
            });
        } catch (error: any) {
            logger.error({ merchantId, err: error.message }, `Manual sync failed`);
            res.status(500).json({
                success: false,
                error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
            });
        }
    }

    async handleWebhook(req: Request, res: Response): Promise<void> {
        const merchantId = req.headers['x-merchant-id'] as string || req.query.merchantId as string;

        if (!merchantId) {
            // We return 200 even for missing merchantId to stop Loyverse from retrying
            // since we can't fix the missing ID without external config.
            logger.error('Webhook received without merchantId');
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
            logger.error({ merchantId, err: error.message }, `Webhook handler error`);
            res.status(200).json({
                success: false,
                error: 'Internal processing error'
            });
        }
    }
}

export const loyverseController = new LoyverseController();