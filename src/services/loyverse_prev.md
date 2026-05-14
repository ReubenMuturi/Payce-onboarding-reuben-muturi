How to Test the Full Payment Flow (Backend-Focused)
Here’s the practical way to simulate the complete flow:

Step-by-Step Testing Guide

Step 1: 
Create a Test Bill (One-time)


Run this SQL in Supabase SQL Editor:
SQLINSERT INTO bills (id, restaurant_name, table_number, total_amount, status)
VALUES (
'550e8400-e29b-41d4-a716-446655440000',
'Hydeout Cafe',
'Table 5',
45.50,
'open'
)
RETURNING *;



Step 2:
Initiate Payment (Backend → Amwal Config)

Use Postman with this request:

Method: POST
URL: http://localhost:5000/api/payments/initiate
Body (JSON):

JSON

{
"billId": "550e8400-e29b-41d4-a716-446655440000",
"amount": 15.75,
"userId": "user-123"
}


You should get back a response containing the config object with SecureHash.


Step 3: Simulate Webhook (Amwal Response)
After initiating, manually trigger the webhook to complete the flow.

Postman Request:

Method: 

POST
URL: http://localhost:5000/api/payments/webhook
Body (JSON) — Use this successful payment simulation:

JSON

{
"success": true,
"responseCode": "00",
"message": "Success",
"data": {
"merchantReference": "BILL_550e8400-e29b-41d4-a716-446655440000",
"transactionId": "TXN-123456",
"amount": 15.75
}
}





# ==================== Supabase ====================
SUPABASE_URL=https://fmciikvttdjxubstwdnz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtY2lpa3Z0dGRqeHVic3R3ZG56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM5NjI4NywiZXhwIjoyMDkzOTcyMjg3fQ.fqxsV0VxRYEyhGcICsdp8Go0a9cYMmoofHBm1pCl07Q
SUPABASE_ANON_KEY=your_anon_key

# ==================== Loyverse ====================
LOYVERSE_ACCESS_TOKEN=2ecb51bca21740e69f9722c2481c406a
