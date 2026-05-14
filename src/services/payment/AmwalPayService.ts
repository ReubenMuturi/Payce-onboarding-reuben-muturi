// src/services/payment/AmwalPayService.ts
import { supabase } from '../../config/database';
import { generateSecureHash } from '../../utils/crypto';
import { amwalConfig } from '../../config/amwal.config';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export class AmwalPayService {

    /**
     * Initiate Payment - Called by frontend when user clicks "Pay"
     */
    async initiatePayment(billId: string, amount: number, userId?: string) {
        // === Input Validation ===
        if (!billId || !uuidValidate(billId)) {
            throw new Error('Invalid billId. Must be a valid UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)');
        }

        if (!amount || amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        const idempotencyKey = uuidv4();
        const requestDateTime = new Date().toISOString();
        const merchantReference = `BILL_${billId}`;

        // === Check if bill exists ===
        const { data: existingBill, error: billCheckError } = await supabase
            .from('bills')
            .select('id, total_amount, status')
            .eq('id', billId)
            .single();

        if (billCheckError || !existingBill) {
            console.error('Bill not found:', billId);
            throw new Error(`Bill with ID ${billId} does not exist`);
        }

        if (existingBill.status === 'PAID') {
            throw new Error('This bill has already been fully paid');
        }

        // === Prepare Amwal Pay configuration ===
        const paramsForHash = {
            AmountTrxn: amount.toFixed(3),
            CurrencyId: amwalConfig.currencyId.toString(),
            MID: amwalConfig.merchantId,
            TID: amwalConfig.terminalId,
            MerchantReference: merchantReference,
            RequestDateTime: requestDateTime,
            LanguageId: 'en',
            PaymentViewType: '1',
        };

        const secureHash = generateSecureHash(paramsForHash, amwalConfig.secureKey!);

        // === Create pending payment record ===
        const { data: payment, error } = await supabase
            .from('bill_payments')
            .insert({
                bill_id: billId,
                amount,
                status: 'PENDING',
                gateway: 'AMWAL',
                idempotency_key: idempotencyKey,
                merchant_reference: merchantReference,
                request_datetime: requestDateTime,
                user_id: userId,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Failed to create payment record:', error);
            throw new Error(`Failed to create payment record: ${error.message}`);
        }

        console.log(`Payment initiated successfully | Bill: ${billId} | Amount: ${amount}`);

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
     * Handle Webhook from Amwal Pay (Cloud Notifier)
     */
    async handleWebhook(payload: any): Promise<void> {
        try {
            const { success, responseCode, data } = payload;

            const merchantReference = data?.merchantReference || data?.MerchantReference;

            if (!merchantReference) {
                throw new Error('Missing merchantReference in webhook payload');
            }

            const { data: payment, error: fetchError } = await supabase
                .from('bill_payments')
                .select('id, bill_id, amount, status')
                .eq('merchant_reference', merchantReference)
                .single();

            if (fetchError || !payment) {
                console.error('Payment record not found for webhook:', merchantReference);
                throw new Error('Payment record not found');
            }

            const newStatus = (success && responseCode === '00') ? 'SUCCESS' : 'FAILED';

            const { error: updatePaymentError } = await supabase
                .from('bill_payments')
                .update({
                    status: newStatus,
                    gateway_response: payload,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', payment.id);

            if (updatePaymentError) throw updatePaymentError;

            if (newStatus === 'SUCCESS') {
                const { data: bill } = await supabase
                    .from('bills')
                    .select('paid_amount')
                    .eq('id', payment.bill_id)
                    .single();

                const currentPaid = bill?.paid_amount || 0;
                const newPaidAmount = currentPaid + payment.amount;

                const { error: updateBillError } = await supabase
                    .from('bills')
                    .update({
                        paid_amount: newPaidAmount,
                        status: 'PAID',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', payment.bill_id);

                if (updateBillError) throw updateBillError;
            }

            console.log(`Webhook processed | Ref: ${merchantReference} | Status: ${newStatus}`);
        } catch (error) {
            console.error('Webhook handling failed:', error);
            throw error;
        }
    }

    /**
     * Reconciliation Job - Checks for stuck PENDING payments
     * Runs periodically to handle missed webhooks
     */
    async reconcileStuckPayments() {
        try {
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

            if (!stuckPayments || stuckPayments.length === 0) {
                console.log('Reconciliation: No stuck payments found');
                return;
            }

            console.log(`Reconciliation: Found ${stuckPayments.length} stuck payments`);

            // TODO: Call Amwal Pay status check API for each payment
            // For now, we log them (you can expand this later)
            for (const payment of stuckPayments) {
                console.warn(`Stuck payment needs manual reconciliation: ${payment.merchant_reference}`);
                // Future: await this.checkPaymentStatusWithAmwal(payment.merchant_reference);
            }
        } catch (error) {
            console.error('Reconciliation job failed:', error);
        }
    }
}

/**
 * Start Reconciliation Job (Background Task)
 */
export const startReconciliationJob = () => {
    console.log('Starting Amwal Pay Reconciliation Job...');

    // Run every 5 minutes
    setInterval(async () => {
        const service = new AmwalPayService();
        await service.reconcileStuckPayments();
    }, 5 * 60 * 1000); // 5 minutes

    // Also run once immediately
    setTimeout(async () => {
        const service = new AmwalPayService();
        await service.reconcileStuckPayments();
    }, 10 * 1000);
};