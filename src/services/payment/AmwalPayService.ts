// src/services/payment/AmwalPayService.ts
import { supabase } from '../../config/database';
import { generateSecureHash } from '../../utils/crypto';
import amwalConfig from '../../config/amwal.config';
import { z } from 'zod';
import {
    BillNotFoundError,
    PaymentAlreadyCompletedError,
    InsufficientBalanceError,
    GatewayError
} from '../../types/payment.types';

const InitiatePaymentSchema = z.object({
    billId: z.string().uuid('Invalid billId - must be a valid UUID'),
    amount: z.number().positive('Amount must be greater than 0'),
    userId: z.string().optional(),
});

export class AmwalPayService {

    /**
     * Initiate a new payment session with Amwal Pay
     */
    async initiatePayment(billId: string, amount: number, userId?: string) {
        const validated = InitiatePaymentSchema.parse({ billId, amount, userId });

        const idempotencyKey = crypto.randomUUID();
        const requestDateTime = new Date().toISOString();
        const merchantReference = `BILL_${billId}_${Date.now()}`;

        // Fetch bill and validate
        const { data: bill, error: billError } = await supabase
            .from('bills')
            .select('total_amount, paid_amount, status')
            .eq('id', validated.billId)
            .single();

        if (billError || !bill) {
            throw new BillNotFoundError(validated.billId);
        }

        if (bill.status === 'PAID') {
            throw new PaymentAlreadyCompletedError();
        }

        const remaining = (bill.total_amount || 0) - (bill.paid_amount || 0);
        if (amount > remaining) {
            throw new InsufficientBalanceError(remaining);
        }

        // Prepare parameters for Amwal Secure Hash
        const hashParams = {
            AmountTrxn: amount.toFixed(3),
            CurrencyId: amwalConfig.currencyId.toString(),
            MID: amwalConfig.merchantId,
            TID: amwalConfig.terminalId,
            MerchantReference: merchantReference,
            RequestDateTime: requestDateTime,
            LanguageId: amwalConfig.defaultLanguage,
            PaymentViewType: '1',
        };

        const secureHash = generateSecureHash(hashParams, amwalConfig.secureKey);

        // Create pending payment record
        const { data: paymentRecord, error: insertError } = await supabase
            .from('bill_payments')
            .insert({
                bill_id: validated.billId,
                amount: validated.amount,
                status: 'PENDING',
                gateway: 'AMWAL',
                idempotency_key: idempotencyKey,
                merchant_reference: merchantReference,
                request_datetime: requestDateTime,
                user_id: validated.userId,
            })
            .select('id')
            .single();

        if (insertError || !paymentRecord) {
            throw new GatewayError(`Failed to create payment record: ${insertError?.message}`);
        }

        return {
            paymentId: paymentRecord.id,
            idempotencyKey,
            merchantReference,
            config: {
                ...hashParams,
                SecureHash: secureHash,
                completeCallback: 'window.handleAmwalPaymentComplete',
                errorCallback: 'window.handleAmwalPaymentError',
                cancelCallback: 'window.handleAmwalPaymentCancel',
            },
        };
    }

    /**
     * Handle incoming webhook from Amwal Pay
     */
    async handleWebhook(payload: unknown): Promise<void> {
        const parsed = z.object({
            success: z.boolean(),
            responseCode: z.string().optional(),
            data: z.object({
                merchantReference: z.string().optional(),
                MerchantReference: z.string().optional(),
            }).optional(),
        }).parse(payload);

        const merchantReference = parsed.data?.merchantReference || parsed.data?.MerchantReference;

        if (!merchantReference) {
            throw new GatewayError('Missing merchantReference in webhook payload');
        }

        // Fetch record to check for existence and current status (Idempotency)
        const { data: payment, error: fetchError } = await supabase
            .from('bill_payments')
            .select('id, bill_id, amount, status')
            .eq('merchant_reference', merchantReference)
            .single();

        if (fetchError || !payment) {
            throw new GatewayError(`Payment record not found for reference: ${merchantReference}`);
        }

        // IDEMPOTENCY: If already successful, do not process again
        if (payment.status === 'SUCCESS') {
            console.info(`[Webhook] Payment ${merchantReference} already processed. Skipping.`);
            return;
        }

        const newStatus = (parsed.success && parsed.responseCode === '00') ? 'SUCCESS' : 'FAILED';

        // Update payment status first
        const { error: updateError } = await supabase
            .from('bill_payments')
            .update({
                status: newStatus,
                gateway_response: payload,
                updated_at: new Date().toISOString(),
            })
            .eq('id', payment.id);

        if (updateError) throw updateError;

        // If successful, update bill's paid_amount atomically
        if (newStatus === 'SUCCESS') {
            // 1. Update balance via RPC
            const { error: rpcError } = await supabase.rpc('increment_paid_amount', {
                bill_id: payment.bill_id,
                amount: payment.amount,
            });

            if (rpcError) {
                console.error(`[Webhook] Critical balance update failed for bill ${payment.bill_id}:`, rpcError);
                throw new GatewayError('Failed to increment bill balance');
            }

            // 2. Update bill status and timestamp
            const { error: billError } = await supabase
                .from('bills')
                .update({
                    status: 'PAID',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', payment.bill_id);

            if (billError) {
                console.error(`[Webhook] Failed to update bill status for ${payment.bill_id}:`, billError);
                // We don't throw here because the balance was already updated,
                // but we should log a critical error for manual intervention.
            }
        }
    }

    /**
     * Reconciliation job for stuck PENDING payments
     */
    async reconcileStuckPayments(): Promise<void> {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

        const { data: stuckPayments, error } = await supabase
            .from('bill_payments')
            .select('id, merchant_reference, amount, bill_id')
            .eq('status', 'PENDING')
            .lte('created_at', tenMinutesAgo);

        if (error) {
            console.error('Reconciliation query failed:', error);
            return;
        }

        if (!stuckPayments?.length) return;

        console.info(`[Reconciliation] Found ${stuckPayments.length} stuck payments. Verifying with Amwal...`);

        for (const payment of stuckPayments) {
            try {
                // REAL-WORLD: Replace this with an actual API call to Amwal's status endpoint
                // const status = await this.fetchAmwalTransactionStatus(payment.merchant_reference);
                const status = await this.mockAmwalStatusCheck(payment.merchant_reference);

                if (status === 'SUCCESS') {
                    console.log(`[Reconciliation] Updating ${payment.merchant_reference} to SUCCESS`);
                    // Re-use handleWebhook logic by simulating a success payload
                    await this.handleWebhook({
                        success: true,
                        responseCode: '00',
                        data: { merchantReference: payment.merchant_reference }
                    });
                } else if (status === 'FAILED') {
                    await supabase
                        .from('bill_payments')
                        .update({ status: 'FAILED', updated_at: new Date().toISOString() })
                        .eq('id', payment.id);
                }
            } catch (err) {
                console.error(`[Reconciliation] Failed to verify payment ${payment.merchant_reference}:`, err);
            }
        }
    }

    /**
     * MOCK: Simulates an API call to the gateway to check transaction status
     */
    private async mockAmwalStatusCheck(reference: string): Promise<'SUCCESS' | 'FAILED' | 'PENDING'> {
        // This is where the real HTTP client call to Amwal's Status API goes.
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulating a 10% success rate for reconciliation testing
                resolve(Math.random() > 0.9 ? 'SUCCESS' : 'PENDING');
            }, 100);
        });
    }
}

// Background Job Scheduler
export const startReconciliationJob = () => {
    console.log('Amwal reconciliation job scheduler started');

    // Initial check after 15 seconds
    setTimeout(() => new AmwalPayService().reconcileStuckPayments(), 15_000);

    // Run every 5 minutes
    setInterval(() => {
        new AmwalPayService().reconcileStuckPayments().catch(console.error);
    }, 5 * 60 * 1000);
};
