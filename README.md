# payce-onboarding-reuben-muturi
Payce Developer Onboarding Repository


To execute the Payment Logic run - npm run dev:payment



Payment Logic Structure

src/
├── config/
│   ├── amwal.config.ts
│   └── database.ts
│
├── controllers/
│   └── payment.controller.ts
│
├── features/
│   ├── bill/
│   │   └── BillPaymentPage.tsx
│   └── payment/
│       ├── AmwalPaymentButton.tsx
│       └── PaymentSuccessPage.tsx
│
├── lib/
│   ├── amwal.ts
│   └── socket.ts
│
├── middleware/
│   └── webhookAuth.ts
│
├── routes/
│   └── payment.routes.ts
│
├── services/
│   └── payment/
│       └── AmwalPayService.ts
│
├── types/
│   └── payment.types.ts
│
├── utils/
│   └── crypto.ts                 
│
└── app.ts


Guide to test the full payment flow

Step 1: Prepare Test Data in Supabase
Run this SQL in Supabase 

SQL Editor:

SQL-- 1. Create a test bill
INSERT INTO bills (id, merchant_id, table_id, total_amount, paid_amount, status)
VALUES (
'550e8400-e29b-41d4-a716-446655440000'::uuid,
1,
5,
67.750,
0.000,
'OPEN'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Check the bill
SELECT * FROM bills WHERE id = '550e8400-e29b-41d4-a716-446655440000';



Step 2: Test Payment Initiation (Postman)
Request 1: Initiate Payment

Method: POST
URL: http://localhost:5000/api/payments/initiate
Headers:
Content-Type: application/json

Body (raw JSON):

JSON

{
"billId": "550e8400-e29b-41d4-a716-446655440000",
"amount": 25.5,
"userId": "test-user-123"
}



tep 3: Simulate Webhook (Test Payment Success)
Request 2: Send Webhook with Exact Reference

Method: POST
URL: http://localhost:5000/api/payments/webhook
Body (raw JSON):

{
"success": true,
"responseCode": "00",
"data": {
"merchantReference": "BILL_550e8400-e29b-41d4-a716-446655440000_1747321456789"
}
}
