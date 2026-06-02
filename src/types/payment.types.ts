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

export interface IPaymentService {
    initiatePayment(billId: string, amount: number, userId?: string): Promise<InitiatePaymentResponse>;
    handleWebhook(payload: unknown): Promise<void>;
    reconcileStuckPayments(): Promise<void>;
}

/**
 * Transaction Status Response (used for reconciliation)
 */
export interface TransactionStatusResponse {
    transactionId: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'EXPIRED';
    amount: number;
    currency: string;
    updatedAt: string;
}

/**
 * Internal payment status type (used across service + database)
 */
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export type PaymentGateway = 'AMWAL' | 'OTHER';

/**
 * Custom Error classes for Payment Flow
 */
export class PaymentError extends Error {
    constructor(public message: string, public statusCode: number = 500, public retryable: boolean = false) {
        super(message);
        this.name = 'PaymentError';
    }
}

export class BillNotFoundError extends PaymentError {
    constructor(billId: string) {
        super(`Bill not found: ${billId}`, 404);
        this.name = 'BillNotFoundError';
    }
}

export class PaymentAlreadyCompletedError extends PaymentError {
    constructor() {
        super('This bill has already been fully paid', 400);
        this.name = 'PaymentAlreadyCompletedError';
    }
}

export class InsufficientBalanceError extends PaymentError {
    constructor(remaining: number) {
        super(`Payment amount exceeds remaining balance. Remaining: ${remaining}`, 400);
        this.name = 'InsufficientBalanceError';
    }
}

export class GatewayError extends PaymentError {
    constructor(message: string, statusCode: number = 502, retryable: boolean = false) {
        super(`Payment Gateway Error: ${message}`, statusCode, retryable);
        this.name = 'GatewayError';
    }
}
