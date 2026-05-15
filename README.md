# payce-onboarding-reuben-muturi
Payce Developer Onboarding Repository


To execute the:DB management logic run - npm run dev:payment
               Payment Logic run - npm run dev



Loyverse + Supabase DB Management Structure

src/
├── config/
│   └── supabase.ts
│
├── controllers/
│   └── loyverse.controller.ts
│
├── database/
│   └── migrations/
│       └── 001_loyverse_schema.sql
│
├── jobs/
│   └── loyverseSync.job.ts
│
├── lib/
│   └── loyverse.client.ts
│
├── routes/
│   └── loyverse.routes.ts
│
├── services/
│   ├── loyverse.service.ts
│   └── loyverse-webhook.service.ts
│
├── types/
│   └── loyverse.types.ts
│
├── test-sync.ts                  
│
└── server.ts


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


Test case on new branch
