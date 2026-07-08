-- ============================================================
-- Membership App core schema (customer portal + CSA POS)
-- Additive only. Reuses existing public.users for employees.
-- Applied to project pbgatghmutejbsmcedsw.
-- ============================================================

-- ---------- membership_plans (public catalog) ----------
create table if not exists public.membership_plans (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  price_cents     integer not null default 0,
  billing_period  text not null default 'monthly'
                    check (billing_period in ('monthly','annual','one_time')),
  wash_tier       text,
  features        jsonb not null default '[]'::jsonb,
  drb_plan_id     text,                 -- future DRB Paetheon mapping
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

-- ---------- customers (1:1 with auth.users) ----------
create table if not exists public.customers (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  first_name      text,
  last_name       text,
  phone           text,
  avatar          text,
  rewards_points  integer not null default 0,
  last_login_at   timestamptz,
  drb_customer_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- vehicles ----------
create table if not exists public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  make          text,
  model         text,
  year          integer,
  color         text,
  license_plate text,
  nickname      text,
  rfid_tag      text,
  created_at    timestamptz not null default now()
);
create index if not exists vehicles_customer_id_idx on public.vehicles(customer_id);

-- ---------- memberships ----------
create table if not exists public.memberships (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid not null references public.customers(id) on delete cascade,
  plan_id            uuid references public.membership_plans(id),
  vehicle_id         uuid references public.vehicles(id) on delete set null,
  status             text not null default 'pending'
                       check (status in ('pending','active','paused','cancelled','expired')),
  started_at         timestamptz,
  current_period_end timestamptz,
  cancelled_at       timestamptz,
  drb_membership_id  text,
  sold_by            uuid references public.users(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists memberships_customer_id_idx on public.memberships(customer_id);

-- ---------- sales (POS transactions from CSA Mode) ----------
create table if not exists public.sales (
  id                 uuid primary key default gen_random_uuid(),
  employee_id        uuid not null references public.users(id),
  customer_id        uuid references public.customers(id) on delete set null,
  vehicle_id         uuid references public.vehicles(id) on delete set null,
  membership_id      uuid references public.memberships(id) on delete set null,
  plan_id            uuid references public.membership_plans(id),
  sale_type          text not null check (sale_type in ('wash','membership','retail')),
  item_description   text,
  amount_cents       integer not null default 0,
  payment_method     text default 'card',
  site               text not null default 'Site 1 - Justin TX',
  drb_transaction_id text,
  created_at         timestamptz not null default now()
);
create index if not exists sales_employee_id_idx on public.sales(employee_id);
create index if not exists sales_created_at_idx on public.sales(created_at);

-- ---------- wash_history ----------
create table if not exists public.wash_history (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  vehicle_id    uuid references public.vehicles(id) on delete set null,
  membership_id uuid references public.memberships(id) on delete set null,
  sale_id       uuid references public.sales(id) on delete set null,
  source        text not null default 'pos' check (source in ('pos','app','drb')),
  points_earned integer not null default 0,
  washed_at     timestamptz not null default now()
);
create index if not exists wash_history_customer_id_idx on public.wash_history(customer_id);

-- ---------- reward_transactions (points ledger) ----------
create table if not exists public.reward_transactions (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  points      integer not null,
  reason      text not null,
  sale_id     uuid references public.sales(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists reward_transactions_customer_id_idx on public.reward_transactions(customer_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.membership_plans    enable row level security;
alter table public.customers            enable row level security;
alter table public.vehicles             enable row level security;
alter table public.memberships          enable row level security;
alter table public.sales                enable row level security;
alter table public.wash_history         enable row level security;
alter table public.reward_transactions  enable row level security;

create policy "plans are readable by all"
  on public.membership_plans for select using (true);

create policy "customer reads own profile"
  on public.customers for select using (auth.uid() = id);
create policy "customer inserts own profile"
  on public.customers for insert with check (auth.uid() = id);
create policy "customer updates own profile"
  on public.customers for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "customer reads own vehicles"
  on public.vehicles for select using (auth.uid() = customer_id);
create policy "customer inserts own vehicles"
  on public.vehicles for insert with check (auth.uid() = customer_id);
create policy "customer updates own vehicles"
  on public.vehicles for update using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
create policy "customer deletes own vehicles"
  on public.vehicles for delete using (auth.uid() = customer_id);

create policy "customer reads own memberships"
  on public.memberships for select using (auth.uid() = customer_id);

create policy "customer reads own wash history"
  on public.wash_history for select using (auth.uid() = customer_id);

create policy "customer reads own reward transactions"
  on public.reward_transactions for select using (auth.uid() = customer_id);

-- public.sales intentionally has RLS enabled and NO policies:
-- it is fully locked to client keys. All writes/reads go through the
-- SECURITY DEFINER RPCs in migration 0002, which validate the employee PIN.
