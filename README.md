# payce-onboarding-reuben-muturi
Payce Developer Onboarding Repository

## 🛠 Loyverse Data Management
This component handles the synchronization of POS data (Categories, Items, Variants) from Loyverse to a multi-tenant Supabase database.

###  How to Run & Test
To execute the DB management logic and start the background sync jobs:
```bash
npm run dev
```
This launches the server and triggers the **Automatic Startup Sync**, which identifies active merchants and pulls their latest menu data.

###  Testing the Integration
Since webhooks require a public URL, use the integrated test suite to simulate live updates locally:
```bash
npm run test:sync
```
**What this tests:**
- **Full Sync:** Verifies the pipeline from Loyverse API $\rightarrow$ Supabase.
- **Live Updates:** Simulates a burst of webhook events to verify the **Debounce Logic** and **Hybrid Sync Strategy**.
- **Tenant Isolation:** Ensures data is correctly partitioned by `merchant_id`.

###  Architecture Overview
The system uses a layered architecture to ensure stability and scalability:
- **Client:** Runtime contract validation using **Zod** to prevent API drift.
- **Service:** Business logic and mapping between API and DB formats.
- **Webhooks:** A debouncing layer that buffers events to prevent API rate-limiting.
- **Database:** Multi-tenant schema using **Composite Primary Keys** `(merchant_id, id)`.

###  Directory Structure
`src/`
├── `config/` (Supabase configuration)
├── `controllers/` (Route handlers)
├── `database/migrations/` (Multi-tenant SQL schemas)
├── `jobs/` (Scheduled Cron syncs)
├── `lib/` (Loyverse API Client)
├── `routes/` (API endpoints)
├── `services/` (Sync logic & Webhook debouncing)
├── `types/` (Zod schemas & TS types)
└── `server.ts` (Application entry point)

---

##  Payment Logic
To execute the payment processing logic run:
```bash
npm run dev:payment
```

###  Payment Structure
`src/`
├── `config/` (Amwal config)
├── `controllers/` (Payment handlers)
├── `features/` (UI Components: Bill/Payment pages)
├── `lib/` (Amwal API Client)
├── `middleware/` (Signature verification)
├── `routes/` (Payment endpoints)
├── `services/` (AmwalPayService logic)
├── `utils/` (Crypto/Hashing)
└── `app.ts`

###  Guide to test the full payment flow

**Step 1: Prepare Test Data in Supabase**
Run this SQL in the Supabase SQL Editor:
```sql
-- Create a test bill
INSERT INTO bills (id, merchant_id, table_id, total_amount, paid_amount, status)
VALUES ('550e8400-e29b-41d4-a716-446655440000'::uuid, 1, 5, 67.750, 0.000, 'OPEN')
ON CONFLICT (id) DO NOTHING;
```

**Step 2: Test Payment Initiation (Postman)**
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/payments/initiate`
- **Body (JSON):**
  ```json
  {
    "billId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 25.5,
    "userId": "test-user-123"
  }
  ```

**Step 3: Simulate Webhook (Payment Success)**
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/payments/webhook`
- **Body (JSON):**
  ```json
  {
    "success": true,
    "responseCode": "00",
    "data": {
      "merchantReference": "BILL_550e8400-e29b-41d4-a716-446655440000_1747321456789"
    }
  }
  ```
