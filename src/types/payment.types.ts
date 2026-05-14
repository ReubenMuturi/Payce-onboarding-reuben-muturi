// src/types/payment.types.ts

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
    completeCallback?: string;
    errorCallback?: string;
    cancelCallback?: string;
}

export interface InitiatePaymentResponse {
    config: AmwalPaymentConfig;
    paymentId: string;
    idempotencyKey: string;
    merchantReference: string;
}

export interface WebhookPayload {
    success: boolean;
    responseCode: string;
    message?: string;
    data?: {
        merchantReference?: string;
        MerchantReference?: string;
        transactionId?: string;
        amount?: number;
        [key: string]: any;
    };
}