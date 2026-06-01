# payce-onboarding-reuben-muturi
Payce Developer Onboarding Repository


To execute the: DB management logic run - npm run dev

This will pull/get data states and updates from Loyverse and log them locally 

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



npm run test:sync   

This will update the Supabase tables on any updates made from Loyverse that are captured by the server.
