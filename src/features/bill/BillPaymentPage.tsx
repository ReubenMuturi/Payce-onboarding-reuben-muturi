// src/features/bill/BillPaymentPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
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
    [key: string]: any; // For dynamic updates from WebSocket
}

const BillPaymentPage: React.FC = () => {
    const { billId } = useParams<{ billId: string }>();

    const [bill, setBill] = useState<Bill | null>(null);
    const [loading, setLoading] = useState(true);
    const [myShare, setMyShare] = useState(0);

    // Load SmartBox + WebSocket
    useEffect(() => {
        loadSmartBoxScript()
            .then(() => console.log('SmartBox.js loaded successfully'))
            .catch(err => console.error('Failed to load SmartBox:', err));

        if (billId) {
            const socket = initSocket(billId);

            socket.on('bill-updated', (data: Partial<Bill>) => {
                console.log('Bill updated via WebSocket:', data);

                setBill(prev => {
                    if (!prev) return prev;
                    return { ...prev, ...data };
                });

                // Update user's share if remaining amount changed
                if (data.remainingAmount !== undefined) {
                    setMyShare(data.remainingAmount);
                }
            });

            return () => disconnectSocket();
        }
    }, [billId]);

    // Fetch initial bill
    useEffect(() => {
        const fetchBill = async () => {
            try {
                const res = await axios.get(`/api/bills/${billId}`);
                const billData = res.data.data;
                setBill(billData);
                setMyShare(billData.remaining_amount || 0);
            } catch (err) {
                console.error('Failed to fetch bill:', err);
            } finally {
                setLoading(false);
            }
        };

        if (billId) fetchBill();
    }, [billId]);

    const handlePaymentSuccess = (data: any) => {
        alert('Payment Successful! Thank you.');
        console.log('Payment Data:', data);
        // You can redirect to success page here
    };

    if (loading) return <div className="p-8 text-center">Loading bill...</div>;
    if (!bill) return <div className="p-8 text-center">Bill not found</div>;

    return (
        <div className="max-w-md mx-auto p-6 min-h-screen bg-gray-50">
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h1 className="text-2xl font-bold mb-1">{bill.restaurant_name || 'Restaurant'}</h1>
                <p className="text-gray-500 mb-6">Table {bill.table_number} • Bill #{bill.id}</p>

                {/* Items List */}
                <div className="space-y-3 mb-8">
                    {bill.items?.map((item: BillItem) => (
                        <div key={item.id} className="flex justify-between py-1">
                            <span>{item.quantity}× {item.name}</span>
                            <span>OMR {(item.quantity * item.unit_price).toFixed(3)}</span>
                        </div>
                    ))}
                </div>

                <div className="border-t pt-4">
                    <div className="flex justify-between text-xl font-bold">
                        <span>Your Share</span>
                        <span>OMR {myShare.toFixed(3)}</span>
                    </div>
                </div>

                <div className="mt-10">
                    <AmwalPaymentButton
                        billId={bill.id}
                        amount={myShare}
                        userId="current-user-id" // Replace with real user context
                        onSuccess={handlePaymentSuccess}
                        onError={(_err) => alert('Payment failed. Please try again.')}
                    >
                        Pay OMR {myShare.toFixed(3)} Now
                    </AmwalPaymentButton>
                </div>
            </div>
        </div>
    );
};

export default BillPaymentPage;