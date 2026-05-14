// src/features/payment/PaymentSuccessPage.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface PaymentSuccessState {
    amount?: number;
    merchantReference?: string;
    transactionId?: string;
    billId?: string;
}

const PaymentSuccessPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state as PaymentSuccessState) || {};

    const { amount, merchantReference, transactionId } = state;

    // Safety fallback
    if (!amount || !merchantReference) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                        Invalid Payment Data
                    </h2>
                    <button
                        onClick={() => navigate('/')}
                        className="text-green-600 hover:text-green-700 font-medium"
                    >
                        ← Return to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
                {/* Success Icon */}
                <div className="w-24 h-24 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-6">
                    <span className="text-6xl">:)</span>
                </div>

                <h1 className="text-3xl font-bold text-green-600 mb-2">
                    Payment Successful!
                </h1>
                <p className="text-gray-600 mb-8">
                    Thank you for your payment
                </p>

                {/* Payment Details */}
                <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Amount Paid</span>
                            <span className="font-semibold text-lg">
                                OMR {amount.toFixed(3)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Reference</span>
                            <span className="font-mono text-sm break-all">
                                {merchantReference}
                            </span>
                        </div>

                        {transactionId && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Transaction ID</span>
                                <span className="font-mono text-sm break-all">
                                    {transactionId}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-2xl transition-all duration-200 active:scale-[0.985]"
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;