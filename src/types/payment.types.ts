// src/types/payment.types.ts

/**
 * Amwal Pay Payment Configuration
 * Used when initiating payment and passing config to SmartBox / hosted payment page
 */
export interface AmwalPaymentConfig {
    AmountTrxn: string;
    CurrencyId: string;
    MID: string;
    TID: string;
    MerchantReference: string;
    RequestDateTime: string;
    LanguageId: string;
    PaymentViewType: string;
    SecureHash: string;

    // Callbacks for SmartBox
    completeCallback?: string;
    errorCallback?: string;
    cancelCallback?: string;
}

/**
 * Response returned to frontend after successful payment initiation
 */
export interface InitiatePaymentResponse {
    config: AmwalPaymentConfig;
    paymentId: string;
    idempotencyKey: string;
    merchantReference: string;
}

/**
 * Expected structure of webhook payload from Amwal Pay
 */
export interface WebhookPayload {
    success: boolean;
    responseCode: string;
    message?: string;
    data?: {
        merchantReference?: string;
        MerchantReference?: string;
        transactionId?: string;
        amount?: number;
        [key: string]: any; // Amwal may send additional fields
    };
}

/**
 * Internal payment status type (used across service + database)
 */
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export type PaymentGateway = 'AMWAL' | 'OTHER';