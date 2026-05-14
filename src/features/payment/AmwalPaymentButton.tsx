// src/features/payment/AmwalPaymentButton.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface AmwalPaymentButtonProps {
    billId: string;
    amount: number;
    userId?: string;
    onSuccess?: (data: any) => void;
    onError?: (error: any) => void;
    onCancel?: () => void;
    children?: React.ReactNode;
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
                                                                      }) => {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Setup global callbacks for SmartBox
        window.handleAmwalPaymentComplete = (data: any) => {
            console.log('Payment Complete:', data);
            onSuccess?.(data);
            setLoading(false);
        };

        window.handleAmwalPaymentError = (data: any) => {
            console.error('Payment Error:', data);
            onError?.(data);
            setLoading(false);
        };

        window.handleAmwalPaymentCancel = () => {
            console.log('Payment Cancelled');
            onCancel?.();
            setLoading(false);
        };

        // Cleanup
        return () => {
            delete (window as any).handleAmwalPaymentComplete;
            delete (window as any).handleAmwalPaymentError;
            delete (window as any).handleAmwalPaymentCancel;
        };
    }, [onSuccess, onError, onCancel]);

    const handlePayment = async () => {
        setLoading(true);

        try {
            const response = await axios.post('/api/payments/initiate', {
                billId,
                amount,
                userId,
            });

            const { config } = response.data.data;

            window.SmartBox.Checkout.configure = config;
            window.SmartBox.Checkout.showSmartBox();

        } catch (error: any) {
            console.error('Failed to initiate payment:', error);
            onError?.(error.response?.data || error);
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {loading ? 'Processing...' : children}
        </button>
    );
};