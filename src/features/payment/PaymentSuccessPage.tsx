// src/features/payment/PaymentSuccessPage.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PaymentSuccessPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { amount, merchantReference, transactionId } = location.state || {};

    return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-6">
                    <span className="text-5xl"></span>
                </div>

                <h1 className="text-3xl font-bold text-green-600 mb-2">Payment Successful!</h1>
                <p className="text-gray-600 mb-8">Thank you for your payment</p>

                <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left">
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Amount Paid</span>
                            <span className="font-semibold">OMR {amount?.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Reference</span>
                            <span className="font-mono text-sm">{merchantReference}</span>
                        </div>
                        {transactionId && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Transaction ID</span>
                                <span className="font-mono text-sm">{transactionId}</span>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold hover:bg-green-700 transition"
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;