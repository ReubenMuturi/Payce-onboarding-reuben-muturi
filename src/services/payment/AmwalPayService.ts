// src/services/payment/AmwalPayService.ts
import { supabase } from '../../config/database';
import { generateSecureHash } from '../../utils/crypto';
import amwalConfig from '../../config/amwal.config';
import { z } from 'zod';

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
            throw new Error(`Bill not found: ${validated.billId}`);
        }

        if (bill.status === 'PAID') {
            throw new Error('This bill has already been fully paid');
        }

        const remaining = (bill.total_amount || 0) - (bill.paid_amount || 0);
        if (amount > remaining) {
            throw new Error(`Payment amount exceeds remaining balance. Remaining: ${remaining}`);
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
            throw new Error(`Failed to create payment record: ${insertError?.message}`);
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
            throw new Error('Missing merchantReference in webhook payload');
        }

        const { data: payment, error: fetchError } = await supabase
            .from('bill_payments')
            .select('id, bill_id, amount')
            .eq('merchant_reference', merchantReference)
            .single();

        if (fetchError || !payment) {
            throw new Error(`Payment record not found for reference: ${merchantReference}`);
        }

        const newStatus = (parsed.success && parsed.responseCode === '00') ? 'SUCCESS' : 'FAILED';

        // Update payment status
        const { error: updateError } = await supabase
            .from('bill_payments')
            .update({
                status: newStatus,
                gateway_response: payload,
                updated_at: new Date().toISOString(),
            })
            .eq('id', payment.id);

        if (updateError) throw updateError;

        // If successful, update bill's paid_amount
        if (newStatus === 'SUCCESS') {
            await supabase
                .from('bills')
                .update({
                    paid_amount: supabase.rpc('increment_paid_amount', {
                        bill_id: payment.bill_id,
                        amount: payment.amount,
                    }),
                    status: 'PAID',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', payment.bill_id);
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

        console.warn(`Found ${stuckPayments.length} stuck payments needing reconciliation`);

        // TODO: Call Amwal status check API for each payment
        for (const payment of stuckPayments) {
            console.warn(`[Reconciliation] Manual review needed: ${payment.merchant_reference}`);
        }
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