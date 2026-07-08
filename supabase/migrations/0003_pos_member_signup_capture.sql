-- ============================================================
-- Capture member contact details at the CSA point of sale.
-- Stored in our tables now; DRB create/update is stubbed for when
-- the DRB Patheon API is connected (Rinsed then inherits via sync).
-- Applied to project pbgatghmutejbsmcedsw.
-- ============================================================

create table if not exists public.pos_member_signups (
  id                 uuid primary key default gen_random_uuid(),
  sale_id            uuid references public.sales(id) on delete set null,
  employee_id        uuid references public.users(id),
  plan_id            uuid references public.membership_plans(id),
  first_name         text,
  last_name          text,
  phone              text,
  email              text,
  license_plate      text,
  drb_customer_id    text,                                   -- filled when written to DRB
  linked_customer_id uuid references public.customers(id) on delete set null, -- filled if they later create an app account
  created_at         timestamptz not null default now()
);
create index if not exists pos_member_signups_email_idx on public.pos_member_signups(lower(email));
create index if not exists pos_member_signups_phone_idx on public.pos_member_signups(phone);

-- Locked to client keys: written only via the SECURITY DEFINER RPC below.
alter table public.pos_member_signups enable row level security;

-- Replace csa_record_sale with a version that also captures member contact
-- details on membership sales.
drop function if exists public.csa_record_sale(text,text,integer,text,uuid,uuid,uuid,text,integer);

create function public.csa_record_sale(
  p_pin            text,
  p_sale_type      text,
  p_amount_cents   integer,
  p_item           text    default null,
  p_customer_id    uuid    default null,
  p_vehicle_id     uuid    default null,
  p_plan_id        uuid    default null,
  p_payment_method text    default 'card',
  p_points         integer default 0,
  p_first_name     text    default null,
  p_last_name      text    default null,
  p_phone          text    default null,
  p_email          text    default null,
  p_license_plate  text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_employee public.users%rowtype;
  v_site     text;
  v_sale_id  uuid;
begin
  select * into v_employee
  from public.users u
  where u.pin = p_pin
     or (u.pin_hash is not null and u.pin_hash = extensions.crypt(p_pin, u.pin_hash))
  limit 1;

  if v_employee.id is null then
    raise exception 'invalid_pin';
  end if;
  if p_sale_type not in ('wash','membership','retail') then
    raise exception 'invalid_sale_type';
  end if;

  v_site := coalesce(v_employee.site, 'Site 1 - Justin TX');

  insert into public.sales (
    employee_id, customer_id, vehicle_id, plan_id,
    sale_type, item_description, amount_cents, payment_method, site
  ) values (
    v_employee.id, p_customer_id, p_vehicle_id, p_plan_id,
    p_sale_type, p_item, coalesce(p_amount_cents,0), coalesce(p_payment_method,'card'), v_site
  )
  returning id into v_sale_id;

  -- Existing app-account rewards / wash history (only when tied to a known customer)
  if p_customer_id is not null and coalesce(p_points,0) <> 0 then
    update public.customers
      set rewards_points = rewards_points + p_points, updated_at = now()
      where id = p_customer_id;
    insert into public.reward_transactions (customer_id, points, reason, sale_id)
    values (
      p_customer_id, p_points,
      case when p_sale_type = 'membership' then 'membership_purchase' else 'wash_purchase' end,
      v_sale_id
    );
  end if;

  if p_customer_id is not null and p_sale_type = 'wash' then
    insert into public.wash_history (customer_id, vehicle_id, sale_id, source, points_earned)
    values (p_customer_id, p_vehicle_id, v_sale_id, 'pos', coalesce(p_points,0));
  end if;

  -- Capture member contact details on membership sign-ups
  if p_sale_type = 'membership'
     and (p_first_name is not null or p_last_name is not null
          or p_email is not null or p_phone is not null) then
    insert into public.pos_member_signups (
      sale_id, employee_id, plan_id, first_name, last_name, phone, email, license_plate
    ) values (
      v_sale_id, v_employee.id, p_plan_id,
      nullif(btrim(p_first_name), ''), nullif(btrim(p_last_name), ''),
      nullif(btrim(p_phone), ''), nullif(btrim(lower(p_email)), ''),
      nullif(btrim(p_license_plate), '')
    );
    -- TODO(DRB): when the DRB Patheon API is connected, create/update the DRB
    -- customer here (match by email/phone/plate to avoid duplicates) and store
    -- the returned drb_customer_id on this row. Rinsed inherits it via its sync.
  end if;

  return v_sale_id;
end;
$$;

revoke all on function public.csa_record_sale(text,text,integer,text,uuid,uuid,uuid,text,integer,text,text,text,text,text) from public;
grant execute on function public.csa_record_sale(text,text,integer,text,uuid,uuid,uuid,text,integer,text,text,text,text,text) to anon, authenticated;
