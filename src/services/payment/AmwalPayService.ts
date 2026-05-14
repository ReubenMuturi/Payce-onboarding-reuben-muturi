// src/services/payment/AmwalPayService.ts
import { supabase } from '../../config/database';
import { amwalConfig } from '../../config/amwal.config';
import { generateSecureHash } from '../../utils/crypto';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export class AmwalPayService {

    /**
     * Initiate a new payment session
     */
    async initiatePayment(
        billId: string,
        amount: number,
        userId?: string
    ): Promise<{
        config: any;
        paymentId: string;
        idempotencyKey: string;
        merchantReference: string;
    }> {

        if (!billId || !uuidValidate(billId)) {
            throw new Error('Invalid billId: Must be a valid UUID');
        }

        if (!amount || amount <= 0) {
            throw new Error('Payment amount must be greater than zero');
        }

        const idempotencyKey = uuidv4();
        const merchantReference = `BILL_${billId}_${Date.now()}`;
        const requestDateTime = new Date().toISOString();

        // === Check bill exists and is payable ===
        const { data: bill, error: billError } = await supabase
            .from('bills')
            .select('id, status, total_amount, paid_amount')
            .eq('id', billId)
            .single();

        if (billError || !bill) {
            throw new Error(`Bill with ID ${billId} not found`);
        }

        if (bill.status === 'PAID') {
            throw new Error('This bill has already been fully paid');
        }

        // TODO: Add proper idempotency check here (search by idempotency_key)

        // === Prepare payload for Amwal ===
        const paramsForHash = {
            AmountTrxn: amount.toFixed(3),
            CurrencyId: amwalConfig.currencyId.toString(),
            MID: amwalConfig.merchantId,
            TID: amwalConfig.terminalId,
            MerchantReference: merchantReference,
            RequestDateTime: requestDateTime,
            LanguageId: amwalConfig.defaultLanguage,
            PaymentViewType: '1',
        };

        const secureHash = generateSecureHash(paramsForHash, amwalConfig.secureKey!);

        // === Create pending payment record ===
        const { data: payment, error: insertError } = await supabase
            .from('bill_payments')
            .insert({
                bill_id: billId,
                amount,
                status: 'PENDING' as PaymentStatus,
                gateway: 'AMWAL',
                idempotency_key: idempotencyKey,
                merchant_reference: merchantReference,
                request_datetime: requestDateTime,
                user_id: userId,
            })
            .select('id')
            .single();

        if (insertError || !payment) {
            throw new Error(`Failed to create payment record: ${insertError?.message}`);
        }

        return {
            config: {
                ...paramsForHash,
                SecureHash: secureHash,
                completeCallback: 'window.handleAmwalPaymentComplete',
                errorCallback: 'window.handleAmwalPaymentError',
                cancelCallback: 'window.handleAmwalPaymentCancel',
            },
            paymentId: payment.id,
            idempotencyKey,
            merchantReference,
        };
    }

    /**
     * Process webhook from Amwal Pay
     */
    async handleWebhook(payload: any): Promise<void> {
        const { success, responseCode, data } = payload || {};
        const merchantReference = data?.merchantReference || data?.MerchantReference;

        if (!merchantReference) {
            throw new Error('Missing merchantReference in webhook payload');
        }

        // TODO: Add webhook signature verification here

        const { data: payment } = await supabase
            .from('bill_payments')
            .select('id, bill_id, amount')
            .eq('merchant_reference', merchantReference)
            .single();

        if (!payment) {
            throw new Error(`Payment record not found for reference: ${merchantReference}`);
        }

        const newStatus: PaymentStatus = (success && responseCode === '00') ? 'SUCCESS' : 'FAILED';

        // Use transaction for atomic update
        const { error: txError } = await supabase.rpc('process_payment_webhook', {
            p_payment_id: payment.id,
            p_bill_id: payment.bill_id,
            p_amount: payment.amount,
            p_new_status: newStatus,
            p_gateway_response: payload,
        });

        if (txError) {
            throw new Error(`Failed to process webhook: ${txError.message}`);
        }
    }

    /**
     * Reconciliation for stuck payments (called by job)
     */
    async reconcileStuckPayments(): Promise<void> {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

        const { data: stuckPayments, error } = await supabase
            .from('bill_payments')
            .select('id, merchant_reference, amount, bill_id')
            .eq('status', 'PENDING')
            .lte('created_at', tenMinutesAgo);

        if (error) throw error;
        if (!stuckPayments?.length) return;

        // TODO: Implement actual status check with Amwal API
        console.warn(`[Reconciliation] Found ${stuckPayments.length} stuck payments`);

    }
}

// ======================
// Background Job Runner
// ======================

/**
 * Starts the reconciliation job for stuck payments
 * Should be called once when the server starts
 */
export const startReconciliationJob = (): void => {
    console.log('Starting Amwal Pay Reconciliation Job...');

    // Run immediately after a short delay
    setTimeout(async () => {
        const service = new AmwalPayService();
        await service.reconcileStuckPayments();
    }, 10_000);

    // Then run every 5 minutes
    setInterval(async () => {
        try {
            const service = new AmwalPayService();
            await service.reconcileStuckPayments();
        } catch (error) {
            console.error('Reconciliation job failed:', error);
        }
    }, 5 * 60 * 1000); // 5 minutes
};