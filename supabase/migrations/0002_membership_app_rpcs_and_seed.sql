-- ============================================================
-- Secure RPCs for CSA Mode + customer rewards, plus seed plans.
-- Applied to project pbgatghmutejbsmcedsw.
-- ============================================================

-- Verify an employee PIN against existing public.users.
create or replace function public.csa_verify_pin(p_pin text)
returns table (id uuid, name text, role text, site text, is_approved boolean)
language sql
security definer
set search_path = public, extensions
as $$
  select u.id, u.name, u.role, u.site, coalesce(u.is_approved, false)
  from public.users u
  where p_pin is not null
    and (
      u.pin = p_pin
      or (u.pin_hash is not null and u.pin_hash = extensions.crypt(p_pin, u.pin_hash))
    )
  limit 1;
$$;

-- Record a POS sale; validates PIN, ties sale to the employee, optionally
-- awards reward points + wash history to a known customer.
create or replace function public.csa_record_sale(
  p_pin            text,
  p_sale_type      text,
  p_amount_cents   integer,
  p_item           text        default null,
  p_customer_id    uuid        default null,
  p_vehicle_id     uuid        default null,
  p_plan_id        uuid        default null,
  p_payment_method text        default 'card',
  p_points         integer     default 0
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
    p_sale_type, p_item, coalesce(p_amount_cents,0), p_payment_method, v_site
  )
  returning id into v_sale_id;

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

  return v_sale_id;
end;
$$;

-- Once-per-day login reward for the authenticated customer.
create or replace function public.award_daily_login(p_points integer default 5)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid     uuid := auth.uid();
  v_last    timestamptz;
  v_granted integer := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select last_login_at into v_last from public.customers where id = v_uid;

  if v_last is null or v_last::date < now()::date then
    v_granted := greatest(p_points, 0);
    update public.customers
      set rewards_points = rewards_points + v_granted, last_login_at = now(), updated_at = now()
      where id = v_uid;
    if v_granted > 0 then
      insert into public.reward_transactions (customer_id, points, reason)
      values (v_uid, v_granted, 'daily_login');
    end if;
  else
    update public.customers set last_login_at = now() where id = v_uid;
  end if;

  return v_granted;
end;
$$;

-- Today's sales summary for the employee holding this PIN (commission view).
create or replace function public.csa_shift_summary(p_pin text)
returns table (
  employee_id uuid, employee_name text, sale_count bigint,
  total_cents bigint, wash_count bigint, membership_count bigint
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_employee public.users%rowtype;
begin
  select * into v_employee
  from public.users u
  where u.pin = p_pin
     or (u.pin_hash is not null and u.pin_hash = extensions.crypt(p_pin, u.pin_hash))
  limit 1;
  if v_employee.id is null then
    raise exception 'invalid_pin';
  end if;

  return query
  select
    v_employee.id, v_employee.name, count(*)::bigint,
    coalesce(sum(s.amount_cents), 0)::bigint,
    count(*) filter (where s.sale_type = 'wash')::bigint,
    count(*) filter (where s.sale_type = 'membership')::bigint
  from public.sales s
  where s.employee_id = v_employee.id
    and s.created_at >= date_trunc('day', now());
end;
$$;

-- Permissions
revoke all on function public.csa_verify_pin(text) from public;
revoke all on function public.csa_record_sale(text,text,integer,text,uuid,uuid,uuid,text,integer) from public;
revoke all on function public.award_daily_login(integer) from public;
revoke all on function public.csa_shift_summary(text) from public;

grant execute on function public.csa_verify_pin(text) to anon, authenticated;
grant execute on function public.csa_record_sale(text,text,integer,text,uuid,uuid,uuid,text,integer) to anon, authenticated;
grant execute on function public.award_daily_login(integer) to authenticated;
grant execute on function public.csa_shift_summary(text) to anon, authenticated;

-- Seed membership plans (typical car-wash tiers)
insert into public.membership_plans (name, description, price_cents, wash_tier, features, sort_order)
select * from (values
  ('Express',  'Unlimited express exterior washes',            1999, 'express',
     '["Unlimited exterior wash","Spot-free rinse","Power dry"]'::jsonb, 1),
  ('Deluxe',   'Everything in Express plus wheel & tire shine', 2999, 'deluxe',
     '["Everything in Express","Wheel & tire cleaner","Tire shine","Underbody wash"]'::jsonb, 2),
  ('Premium',  'Top-tier wash with ceramic protection',         3999, 'premium',
     '["Everything in Deluxe","Ceramic seal","Rain repellent","Triple foam polish","Hot wax"]'::jsonb, 3)
) as v(name, description, price_cents, wash_tier, features, sort_order)
where not exists (select 1 from public.membership_plans);
