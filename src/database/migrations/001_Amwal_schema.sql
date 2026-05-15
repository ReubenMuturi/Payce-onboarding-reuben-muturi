create table bills (
                       id uuid primary key default uuid_generate_v4(),
                       restaurant_name text,
                       table_number text,
                       total_amount numeric(12,3) default 0,
                       paid_amount numeric(12,3) default 0,
                       status text default 'open',
                       created_at timestamp with time zone default now(),
                       updated_at timestamp with time zone default now()
);

create table bill_payments (
                               id uuid primary key default uuid_generate_v4(),
                               bill_id uuid references bills(id),
                               amount numeric(12,3) not null,
                               status text default 'PENDING',
                               gateway text default 'AMWAL',
                               idempotency_key text unique,
                               merchant_reference text,
                               request_datetime timestamp with time zone,
                               gateway_response jsonb,
                               user_id text,
                               created_at timestamp with time zone default now(),
                               updated_at timestamp with time zone default now()
);