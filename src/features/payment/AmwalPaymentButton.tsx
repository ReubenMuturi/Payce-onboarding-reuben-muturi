// src/features/payment/AmwalPaymentButton.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { loadSmartBoxScript } from '../../lib/amwal';
import { InitiatePaymentResponse } from '../../types/payment.types';

interface AmwalPaymentButtonProps {
    billId: string;
    amount: number;
    userId?: string;
    onSuccess?: (data: any) => void;
    onError?: (error: Error | unknown) => void;
    onCancel?: () => void;
    children?: React.ReactNode;
    className?: string;
}

declare global {
    interface Window {
        SmartBox: any;
        handleAmwalPaymentComplete?: (data: any) => void;
        handleAmwalPaymentError?: (data: any) => void;
        handleAmwalPaymentCancel?: () => void;
    }
}

export const AmwalPaymentButton: React.FC<AmwalPaymentButtonProps> = ({
                                                                          billId,
                                                                          amount,
                                                                          userId,
                                                                          onSuccess,
                                                                          onError,
                                                                          onCancel,
                                                                          children = "Pay Now",
                                                                          className = "",
                                                                      }) => {
    const [loading, setLoading] = useState<boolean>(false);

    // Setup global callbacks for SmartBox
    useEffect(() => {
        window.handleAmwalPaymentComplete = (data: any) => {
            setLoading(false);
            onSuccess?.(data);
        };

        window.handleAmwalPaymentError = (data: any) => {
            setLoading(false);
            onError?.(data);
        };

        window.handleAmwalPaymentCancel = () => {
            setLoading(false);
            onCancel?.();
        };

        return () => {
            delete window.handleAmwalPaymentComplete;
            delete window.handleAmwalPaymentError;
            delete window.handleAmwalPaymentCancel;
        };
    }, [onSuccess, onError, onCancel]);

    const handlePayment = useCallback(async () => {
        if (loading) return;

        setLoading(true);

        try {
            await loadSmartBoxScript();

            const response = await fetch('/api/payments/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ billId, amount, userId }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to initiate payment');
            }

            const { config } = result.data as InitiatePaymentResponse;

            if (!window.SmartBox?.Checkout) {
                throw new Error('SmartBox not loaded. Please refresh the page.');
            }

            window.SmartBox.Checkout.configure = config;
            window.SmartBox.Checkout.showSmartBox();

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('[AmwalPayment] Payment initiation failed:', errorMessage);
            onError?.(error);
            setLoading(false);
        }
    }, [billId, amount, userId, onError, loading]);

    return (
        <button
            onClick={handlePayment}
            disabled={loading}
            className={`w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl 
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed 
                       active:scale-[0.985] ${className}`}
        >
            {loading ? 'Processing Payment...' : children}
        </button>
    );
};