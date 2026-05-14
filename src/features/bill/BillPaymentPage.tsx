// src/features/bill/BillPaymentPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AmwalPaymentButton } from '../payment/AmwalPaymentButton';
import { loadSmartBoxScript } from '../../lib/amwal';
import { initSocket, disconnectSocket } from '../../lib/socket';

interface BillItem {
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
}

interface Bill {
    id: string;
    restaurant_name?: string;
    table_number?: string;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    items?: BillItem[];
    status: string;
    [key: string]: any;
}

const BillPaymentPage: React.FC = () => {
    const { billId } = useParams<{ billId: string }>();
    const navigate = useNavigate();

    const [bill, setBill] = useState<Bill | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [myShare, setMyShare] = useState(0);

    // Fetch initial bill data
    const fetchBill = useCallback(async () => {
        if (!billId) return;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/bills/${billId}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to load bill');
            }

            const billData = result.data || result;
            setBill(billData);
            setMyShare(billData.remaining_amount || 0);
        } catch (err: any) {
            console.error('Failed to fetch bill:', err);
            setError(err.message || 'Could not load bill information');
        } finally {
            setLoading(false);
        }
    }, [billId]);

    // Initialize SmartBox + WebSocket
    useEffect(() => {
        loadSmartBoxScript().catch(err =>
            console.error('Failed to load SmartBox script:', err)
        );

        if (!billId) return;

        const socket = initSocket(billId);

        socket.on('bill-updated', (data: Partial<Bill>) => {
            setBill(prev => prev ? { ...prev, ...data } : prev);

            if (data.remaining_amount !== undefined) {
                setMyShare(data.remaining_amount);
            }
        });

        fetchBill();

        return () => {
            disconnectSocket();
        };
    }, [billId, fetchBill]);

    const handlePaymentSuccess = useCallback((data: any) => {
        // Redirect to success page with state
        navigate('/payment/success', {
            state: {
                amount: myShare,
                merchantReference: data.merchantReference || data.MerchantReference,
                transactionId: data.transactionId,
                billId,
            },
        });
    }, [navigate, myShare, billId]);

    const handlePaymentError = useCallback((error: any) => {
        alert('Payment failed. Please try again.'); // TODO: Replace with better toast later
        console.error('Payment error:', error);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading bill...</p>
                </div>
            </div>
        );
    }

    if (error || !bill) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-semibold text-red-600 mb-4">Unable to Load Bill</h2>
                    <p className="text-gray-600 mb-6">{error || 'Bill not found'}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-6 min-h-screen bg-gray-50">
            <div className="bg-white rounded-3xl shadow-lg p-6">
                <h1 className="text-2xl font-bold mb-1">
                    {bill.restaurant_name || 'Restaurant'}
                </h1>
                <p className="text-gray-500 mb-8">
                    Table {bill.table_number} • Bill #{bill.id?.slice(-6)}
                </p>

                {/* Items List */}
                <div className="space-y-3 mb-8">
                    {bill.items?.map((item: BillItem) => (
                        <div key={item.id} className="flex justify-between py-2 border-b last:border-0">
                            <span className="text-gray-700">
                                {item.quantity}× {item.name}
                            </span>
                            <span className="font-medium">
                                OMR {(item.quantity * item.unit_price).toFixed(3)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Total Section */}
                <div className="border-t pt-6">
                    <div className="flex justify-between items-center text-xl font-bold">
                        <span>Your Share</span>
                        <span>OMR {myShare.toFixed(3)}</span>
                    </div>
                </div>

                <div className="mt-10">
                    <AmwalPaymentButton
                        billId={bill.id}
                        amount={myShare}
                        userId="temp-user-id" // TODO: Replace with real auth context
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                    >
                        Pay OMR {myShare.toFixed(3)} Now
                    </AmwalPaymentButton>
                </div>
            </div>
        </div>
    );
};

export default BillPaymentPage;