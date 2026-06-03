-- 1. Create a test bill
INSERT INTO bills (id, merchant_id, table_id, total_amount, paid_amount, status)
VALUES (
  '550e8400-e34b-41d4-a716-446655440000'::uuid,
  1,
  5,
  70.750,
  0.000,
  'OPEN'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Check the bill
SELECT * FROM bills WHERE id = '550e8400-e29b-41d4-a716-446655440000';