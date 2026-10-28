-- Goalai ecom feature pack
--   1. Coupons: founder-managed codes, validated and priced inside Postgres (place_order re-checks them).
--   2. Customer self-cancel for orders that are not yet packed or paid (stock goes back, CRM lead -> LOST).
--   3. Wishlist ("Saved items") per signed-in customer.
-- Apply once in the Supabase SQL editor (or `supabase db push`). Non-destructive: creates objects and replaces functions.

-- ------------------------------------------------------------------ coupons
create table if not exists public.store_coupons (
  code text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  description text not null default '' check (length(description) <= 160),
  kind text not null check (kind in ('PERCENT', 'FLAT')),
  value integer not null check (value > 0),
  min_order integer not null default 0 check (min_order >= 0),
  max_discount integer check (max_discount is null or max_discount > 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_user_limit integer not null default 1 check (per_user_limit > 0),
  first_order_only boolean not null default false,
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_coupons_percent_range check (kind <> 'PERCENT' or value <= 100),
  constraint store_coupons_window check (valid_from is null or valid_until is null or valid_until > valid_from)
);
create trigger store_coupons_touch before update on public.store_coupons
  for each row execute function public.touch_updated_at();

alter table public.store_coupons enable row level security;
-- customers never read this table: they only see the result of validate_coupon()
create policy store_coupons_founder_select on public.store_coupons for select to authenticated using (public.is_founder());
create policy store_coupons_founder_insert on public.store_coupons for insert to authenticated with check (public.is_founder());
create policy store_coupons_founder_update on public.store_coupons for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy store_coupons_founder_delete on public.store_coupons for delete to authenticated using (public.is_founder());
grant select, insert, update, delete on public.store_coupons to authenticated;

alter table public.store_orders
  add column if not exists discount integer not null default 0 check (discount >= 0),
  add column if not exists coupon_code text;
alter table public.store_orders drop constraint if exists store_orders_discount_le_items;
alter table public.store_orders add constraint store_orders_discount_le_items check (discount <= items_total);
create index if not exists store_orders_coupon on public.store_orders (coupon_code) where coupon_code is not null;

-- One place decides whether a coupon works and what it takes off.
-- Usage is counted from non-cancelled orders, so cancelling an order frees the coupon again.
create or replace function private.coupon_eval(p_code text, p_subtotal int, p_uid uuid, p_lock boolean default false)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  c store_coupons; v_used int; v_used_by int; d int;
begin
  if v_code !~ '^[A-Z0-9]{3,20}$' then return jsonb_build_object('ok', false, 'message', 'Coupon code not found.'); end if;
  if p_lock then
    select * into c from store_coupons where code = v_code and active for update;
  else
    select * into c from store_coupons where code = v_code and active;
  end if;
  if not found then return jsonb_build_object('ok', false, 'message', 'Coupon code not found.'); end if;
  if c.valid_from is not null and now() < c.valid_from then return jsonb_build_object('ok', false, 'message', 'Coupon is not active yet.'); end if;
  if c.valid_until is not null and now() > c.valid_until then return jsonb_build_object('ok', false, 'message', 'Coupon has expired.'); end if;
  if coalesce(p_subtotal, 0) < c.min_order then
    return jsonb_build_object('ok', false, 'message', 'Coupon needs an order of ₹' || c.min_order || ' or more.');
  end if;
  if c.usage_limit is not null then
    select count(*) into v_used from store_orders where coupon_code = c.code and status <> 'CANCELLED';
    if v_used >= c.usage_limit then return jsonb_build_object('ok', false, 'message', 'Coupon has been fully claimed.'); end if;
  end if;
  if p_uid is not null then
    select count(*) into v_used_by from store_orders where coupon_code = c.code and customer_user_id = p_uid and status <> 'CANCELLED';
    if v_used_by >= c.per_user_limit then return jsonb_build_object('ok', false, 'message', 'Coupon already used on your account.'); end if;
    if c.first_order_only and exists (select 1 from store_orders where customer_user_id = p_uid and status <> 'CANCELLED') then
      return jsonb_build_object('ok', false, 'message', 'Coupon is for your first order only.');
    end if;
  end if;
  d := case c.kind when 'PERCENT' then floor(p_subtotal * c.value / 100.0)::int else c.value end;
  if c.max_discount is not null then d := least(d, c.max_discount); end if;
  d := greatest(0, least(d, p_subtotal));
  if d = 0 then return jsonb_build_object('ok', false, 'message', 'Coupon does not apply to this basket.'); end if;
  return jsonb_build_object('ok', true, 'code', c.code, 'discount', d, 'kind', c.kind, 'value', c.value,
                            'message', 'Coupon ' || c.code || ' applied — you save ₹' || d || '.');
end $$;

-- what the checkout page calls while the customer types a code
create or replace function public.validate_coupon(p_code text, p_subtotal int)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'Please log in to use a coupon.'; end if;
  return private.coupon_eval(p_code, p_subtotal, auth.uid(), false);
end $$;
revoke execute on function public.validate_coupon(text, int) from anon, public;
grant execute on function public.validate_coupon(text, int) to authenticated;
revoke execute on function private.coupon_eval(text, int, uuid, boolean) from anon, authenticated, public;

-- ------------------------------------------------------------------ place_order (now with coupons)
create or replace function public.place_order(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  s store_settings;
  v_name text := btrim(coalesce(p->>'name', ''));
  v_phone text := web_norm_phone(p->>'phone');
  v_email text := nullif(btrim(coalesce(p->>'email', '')), '');
  v_mode text := upper(coalesce(p->>'fulfilment', 'PICKUP'));
  v_addr text := left(nullif(btrim(coalesce(p->>'address', '')), ''), 400);
  v_pin text := nullif(btrim(coalesce(p->>'pincode', '')), '');
  v_notes text := left(nullif(btrim(coalesce(p->>'notes', '')), ''), 500);
  v_pay text := upper(coalesce(p->>'payment_method', 'COD'));
  v_cat uuid; it record; prod store_products; r record;
  v_items jsonb := '[]'::jsonb; v_sum int := 0; v_mrp int := 0; v_fee int := 0; v_count int := 0;
  v_order store_orders; v_cust uuid; v_lead leads; v_summary text := '';
  v_uid uuid := auth.uid();
  v_claims text; v_sub text;
  v_coupon text := upper(nullif(btrim(coalesce(p->>'coupon', '')), ''));
  v_disc int := 0; v_ce jsonb;
begin
  if v_uid is null then raise exception 'Please log in to place your order.'; end if;
  if coalesce(p->>'website', '') <> '' then raise exception 'Could not place the order.'; end if; -- honeypot
  if length(v_name) < 2 or length(v_name) > 80 then raise exception 'Please enter your name.'; end if;
  if v_phone is null then raise exception 'Please enter a valid 10-digit mobile number.'; end if;
  v_email := coalesce(v_email, (select lower(email) from auth.users where id = v_uid));
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please check your email address.'; end if;
  if v_mode not in ('PICKUP', 'DELIVERY') then raise exception 'Choose pick-up or delivery.'; end if;
  if v_mode = 'DELIVERY' and (v_addr is null or length(v_addr) < 8) then raise exception 'Please enter your full delivery address.'; end if;
  if v_pin is not null and v_pin !~ '^[1-9][0-9]{5}$' then raise exception 'Please check the PIN code.'; end if;
  if v_pay not in ('COD', 'UPI_ON_DELIVERY') then v_pay := 'COD'; end if;
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 then raise exception 'Your basket is empty.'; end if;
  if jsonb_array_length(p->'items') > 60 then raise exception 'Too many different items in one order.'; end if;

  if (select count(*) from store_orders where phone = v_phone and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Several orders were just placed from this number. Please call us to add more.';
  end if;

  select * into s from store_settings where id = 1;

  -- merge duplicate lines, lock products, re-price from the database
  for it in
    select x->>'id' as id, sum(case when (x->>'qty') ~ '^[0-9]{1,3}$' then greatest(1, least(99, (x->>'qty')::int)) else 1 end)::int as qty
    from jsonb_array_elements(p->'items') x group by x->>'id' order by x->>'id'
  loop
    select * into prod from store_products where id = it.id and active for update;
    if not found then raise exception 'One of the items is no longer available. Please refresh your basket.'; end if;
    if it.qty > 99 then raise exception 'Maximum 99 of % per order.', prod.name; end if;
    if prod.stock is not null and prod.stock < it.qty then
      if prod.stock = 0 then raise exception '% is out of stock.', prod.name;
      else raise exception 'Only % of % left in stock.', prod.stock, prod.name; end if;
    end if;
    v_items := v_items || jsonb_build_object('id', prod.id, 'name', prod.name, 'size', prod.size,
                 'price', prod.price, 'mrp', prod.mrp, 'qty', it.qty, 'line', prod.price * it.qty);
    v_sum := v_sum + prod.price * it.qty; v_mrp := v_mrp + prod.mrp * it.qty; v_count := v_count + it.qty;
    v_summary := v_summary || '• ' || prod.name || ' (' || prod.size || ') × ' || it.qty || ' = ₹' || (prod.price * it.qty) || E'\n';
  end loop;

  v_fee := case when v_mode = 'PICKUP' or v_sum >= s.free_above then 0 else s.delivery_fee end;
  -- coupon: re-checked and priced here, never trusted from the browser (row is locked so usage limits hold)
  if v_coupon is not null then
    v_ce := private.coupon_eval(v_coupon, v_sum, v_uid, true);
    if not (v_ce->>'ok')::boolean then raise exception '%', v_ce->>'message'; end if;
    v_disc := (v_ce->>'discount')::int;
    v_coupon := v_ce->>'code';
  end if;

  select id into v_cat from categories where name = 'Goalai Organic Store' limit 1;
  select * into r from private.web_resolve_ref(p->>'ref', v_cat, null);

  insert into store_orders (customer_name, phone, email, fulfilment, address, pincode, notes,
                            items_total, mrp_total, delivery_fee, total, payment_method, ref_code, customer_user_id, discount, coupon_code)
  values (v_name, v_phone, v_email, v_mode, v_addr, v_pin, v_notes,
          v_sum, v_mrp, v_fee, v_sum - v_disc + v_fee, v_pay, case when r.promo_id is not null then upper(btrim(p->>'ref')) end, v_uid,
          v_disc, case when v_disc > 0 then v_coupon end)
  returning * into v_order;

  insert into store_order_items (order_id, product_id, name, size, price, mrp, qty, line_total)
  select v_order.id, x->>'id', x->>'name', x->>'size', (x->>'price')::int, (x->>'mrp')::int, (x->>'qty')::int, (x->>'line')::int
  from jsonb_array_elements(v_items) x;

  update store_products sp set stock = sp.stock - (x->>'qty')::int
  from jsonb_array_elements(v_items) x where sp.id = x->>'id' and sp.stock is not null;

  -- file into the CRM
  -- CRM rows are written as the website (system), not as the customer:
  -- CRM triggers treat a signed-in user as staff, and customers are not staff.
  v_claims := current_setting('request.jwt.claims', true); v_sub := current_setting('request.jwt.claim.sub', true);
  perform set_config('request.jwt.claims', '', true); perform set_config('request.jwt.claim.sub', '', true);
  v_cust := private.web_upsert_customer(v_name, v_phone, v_email, v_addr, null, v_cat, 'Website', r.assignee);
  insert into leads (customer_id, contact_name, phone, email, title, category_id, status, priority, expected_value,
                     source, notes, next_follow_up, assigned_to, promo_code_id)
  values (v_cust, v_name, v_phone, v_email, 'Store order ' || v_order.code || ' · ₹' || v_order.total,
          v_cat, 'NEW', 'HIGH', v_order.total, 'Website · Store order',
          v_summary || case when v_disc > 0 then 'Coupon ' || v_coupon || ': -₹' || v_disc || E'\n' else '' end || 'Total: ₹' || v_order.total || ' · ' || initcap(lower(v_mode)) ||
            case when v_addr is not null then E'\nAddress: ' || v_addr || coalesce(' - ' || v_pin, '') else '' end ||
            case when v_notes is not null then E'\nNote: ' || v_notes else '' end,
          now() + interval '30 minutes', r.assignee, r.promo_id)
  returning * into v_lead;

  update store_orders set crm_customer_id = v_cust, crm_lead_id = v_lead.id where id = v_order.id;
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true); perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);

  -- remember the customer's latest details for next time
  insert into store_customers (id, email) values (v_uid, v_email) on conflict (id) do nothing;
  update store_customers set full_name = v_name, phone = v_phone,
         address = coalesce(v_addr, address), pincode = coalesce(v_pin, pincode), crm_customer_id = v_cust
   where id = v_uid;

  return jsonb_build_object('code', v_order.code, 'total', v_order.total, 'items_total', v_sum, 'discount', v_disc,
                            'delivery_fee', v_fee, 'item_count', v_count, 'whatsapp', s.whatsapp);
end $$;

revoke execute on function public.place_order(jsonb) from anon, public;
grant execute on function public.place_order(jsonb) to authenticated;

-- ------------------------------------------------------------------ tracking shows the discount
create or replace function public.track_order(p_code text, p_phone text)
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'code', o.code, 'status', o.status, 'fulfilment', o.fulfilment, 'created_at', o.created_at,
    'updated_at', o.updated_at, 'name', o.customer_name, 'items_total', o.items_total,
    'discount', o.discount, 'coupon_code', o.coupon_code,
    'delivery_fee', o.delivery_fee, 'total', o.total, 'mrp_total', o.mrp_total, 'payment_method', o.payment_method,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'size', i.size, 'price', i.price, 'qty', i.qty, 'line', i.line_total) order by i.id)
                       from store_order_items i where i.order_id = o.id), '[]'::jsonb))
  from store_orders o
  where upper(o.code) = upper(btrim(p_code)) and o.phone = public.web_norm_phone(p_phone)
$$;

-- ------------------------------------------------------------------ customer self-cancel
-- Allowed while the order is Received or Confirmed and nothing has been paid.
-- The existing order trigger puts the stock back and marks the CRM lead Lost.
create or replace function public.cancel_my_order(p_code text)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid(); o store_orders; v_claims text; v_sub text;
begin
  if v_uid is null then raise exception 'Please log in.'; end if;
  select * into o from store_orders where upper(code) = upper(btrim(coalesce(p_code, ''))) and customer_user_id = v_uid for update;
  if not found then raise exception 'Could not find that order.'; end if;
  if o.status = 'CANCELLED' then raise exception 'This order is already cancelled.'; end if;
  if o.status not in ('NEW', 'CONFIRMED') then raise exception 'This order is already packed or on its way. Please call or WhatsApp us.'; end if;
  if o.payment_status = 'PAID' then raise exception 'This order is already paid. Please call or WhatsApp us to cancel it.'; end if;

  -- the CRM lead is updated as the website (system), not as the customer
  v_claims := current_setting('request.jwt.claims', true); v_sub := current_setting('request.jwt.claim.sub', true);
  perform set_config('request.jwt.claims', '', true); perform set_config('request.jwt.claim.sub', '', true);
  update store_orders set status = 'CANCELLED' where id = o.id;
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true); perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);

  return jsonb_build_object('code', o.code, 'status', 'CANCELLED');
end $$;
revoke execute on function public.cancel_my_order(text) from anon, public;
grant execute on function public.cancel_my_order(text) to authenticated;

-- ------------------------------------------------------------------ wishlist
create table if not exists public.store_wishlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.store_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.store_wishlist enable row level security;
create policy store_wishlist_select on public.store_wishlist for select to authenticated using (user_id = auth.uid());
create policy store_wishlist_insert on public.store_wishlist for insert to authenticated
  with check (user_id = auth.uid() and (select count(*) from public.store_wishlist w where w.user_id = auth.uid()) < 200);
create policy store_wishlist_delete on public.store_wishlist for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.store_wishlist to authenticated;
