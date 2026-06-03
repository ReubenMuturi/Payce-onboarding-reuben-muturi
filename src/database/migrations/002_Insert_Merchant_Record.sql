INSERT INTO merchants (name, api_token, webhook_secret, business_type, status)
VALUES (
           'QA Test Store',
           '2ecb51bca21740e69f9722c2481c406a', -- Replace with a real Loyverse token or any string for basic testing
           'super_secret_webhook_key_123', -- This will be used to verify webhook signatures
           'Restaurant',
           'Active'
       )
    RETURNING id;