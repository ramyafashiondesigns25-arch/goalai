-- Goalai store: main categories + sub-categories managed in the admin console, and WhatsApp-chat payment.
--
--   * store_categories: main categories (Nuts, Healthy home-made food, …) and one level of sub-categories (Badam, Pista, Laddus, …).
--     The first six main categories keep the ids the products already use, so nothing existing breaks.
--   * store_products.sub: the sub-category of a product (optional). A trigger keeps it inside the product's main category.
--   * Payment: no gateway. Orders are paid by chatting on WhatsApp, so 'WHATSAPP' becomes the payment method (COD / UPI stay valid for old orders).
-- Apply once in the Supabase SQL editor. Non-destructive.

-- ------------------------------------------------------------------ categories
create table if not exists public.store_categories (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  parent_id text references public.store_categories(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 60),
  ta text not null default '' check (length(ta) <= 60),
  color text not null default '#C98A4B' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_categories_not_self check (parent_id is null or parent_id <> id)
);
create index if not exists store_categories_parent on public.store_categories (parent_id, sort);
create trigger store_categories_touch before update on public.store_categories
  for each row execute function public.touch_updated_at();

-- only two levels: a sub-category's parent must be a main category, and a category with children can't become a child
create or replace function private.store_categories_tree_guard()
returns trigger language plpgsql security invoker set search_path = public, extensions as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from store_categories p where p.id = new.parent_id and p.parent_id is not null) then
      raise exception 'A sub-category can only sit under a main category.';
    end if;
    if tg_op = 'UPDATE' and exists (select 1 from store_categories c where c.parent_id = new.id) then
      raise exception 'This category has sub-categories, so it cannot become a sub-category.';
    end if;
  end if;
  return new;
end $$;
create trigger store_categories_tree before insert or update of parent_id on public.store_categories
  for each row execute function private.store_categories_tree_guard();

alter table public.store_categories enable row level security;
create policy store_categories_read_public on public.store_categories for select to anon using (active);
create policy store_categories_read on public.store_categories for select to authenticated using (active or public.is_founder());
create policy store_categories_insert on public.store_categories for insert to authenticated with check (public.is_founder());
create policy store_categories_update on public.store_categories for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy store_categories_delete on public.store_categories for delete to authenticated using (public.is_founder());
grant select on public.store_categories to anon;
grant select, insert, update, delete on public.store_categories to authenticated;

-- the shelves the shop already has (same ids as before) + the new home-made food shelf
insert into public.store_categories (id, name, ta, color, sort) values
  ('nuts',     'Nuts & dry fruits',        'உலர் பழங்கள்',        '#C98A4B', 10),
  ('staples',  'Rice, atta & dal',         'அரிசி, பருப்பு',      '#2E7D4F', 20),
  ('millets',  'Millets & sweeteners',     'சிறுதானியம், வெல்லம்', '#9A6A22', 30),
  ('oils',     'Oils & ghee',              'எண்ணெய், நெய்',       '#C98A12', 40),
  ('masala',   'Masala & spices',          'மசாலா',               '#C62E2E', 50),
  ('drinks',   'Coffee, tea & honey',      'காபி, டீ, தேன்',       '#5A3825', 60),
  ('homemade', 'Healthy home-made food',   'வீட்டு தயாரிப்பு',      '#B5651D', 70)
on conflict (id) do nothing;
-- any category a product already uses that is not above (safety net)
insert into public.store_categories (id, name, sort)
select distinct p.cat, initcap(replace(p.cat, '-', ' ')), 90 from public.store_products p
where p.cat ~ '^[a-z0-9-]{1,40}$' and not exists (select 1 from public.store_categories c where c.id = p.cat)
on conflict (id) do nothing;

-- starter sub-categories (edit or delete them in admin → Categories)
insert into public.store_categories (id, parent_id, name, ta, color, sort) values
  ('badam',   'nuts', 'Badam (Almond)',  'பாதாம்',          '#C98A4B', 10),
  ('pista',   'nuts', 'Pista',           'பிஸ்தா',          '#7A9A3B', 20),
  ('cashew',  'nuts', 'Cashew nut',      'முந்திரி',         '#D9A441', 30),
  ('walnut',  'nuts', 'Walnut',          'அக்ரூட்',          '#8B6B3E', 40),
  ('dates',   'nuts', 'Dates',           'பேரீச்சை',         '#6B3E1F', 50),
  ('raisins', 'nuts', 'Raisins',         'உலர் திராட்சை',     '#7A3E6B', 60),
  ('laddus',  'homemade', 'Laddus',      'லட்டு',            '#B5651D', 10)
on conflict (id) do nothing;

-- ------------------------------------------------------------------ products: sub-category
alter table public.store_products add column if not exists sub text references public.store_categories(id) on delete set null;
alter table public.store_products drop constraint if exists store_products_cat_fk;
alter table public.store_products add constraint store_products_cat_fk foreign key (cat) references public.store_categories(id) on update cascade on delete restrict;
create index if not exists store_products_sub on public.store_products (sub) where sub is not null;

-- a product's sub-category must belong to the product's main category
create or replace function private.store_products_sub_guard()
returns trigger language plpgsql security invoker set search_path = public, extensions as $$
begin
  if new.sub is not null and not exists (select 1 from store_categories c where c.id = new.sub and c.parent_id = new.cat) then
    raise exception 'The sub-category must belong to the selected category.';
  end if;
  return new;
end $$;
create trigger store_products_sub_check before insert or update of cat, sub on public.store_products
  for each row execute function private.store_products_sub_guard();

-- when a product moves to another main category its old sub-category no longer applies
-- (named 00_ so it fires before the check above — triggers run in name order)
create or replace function private.store_products_sub_reset()
returns trigger language plpgsql security invoker set search_path = public, extensions as $$
begin
  if tg_op = 'UPDATE' and new.cat is distinct from old.cat and new.sub is not distinct from old.sub then new.sub := null; end if;
  return new;
end $$;
create trigger store_products_00_sub_reset before update of cat on public.store_products
  for each row execute function private.store_products_sub_reset();

-- first fill: put the dry-fruit packs the shop already sells under their sub-category (by product id)
update public.store_products set sub = id where cat = 'nuts' and sub is null and id in ('badam', 'pista', 'cashew', 'walnut', 'dates', 'raisins');
update public.store_products set sub = 'badam' where cat = 'nuts' and sub is null and id = 'almond';

-- ------------------------------------------------------------------ payment: WhatsApp chat (no gateway)
alter table public.store_orders drop constraint if exists store_orders_payment_method_check;
alter table public.store_orders add constraint store_orders_payment_method_check
  check (payment_method in ('WHATSAPP', 'COD', 'UPI_ON_DELIVERY', 'ONLINE'));
alter table public.store_orders alter column payment_method set default 'WHATSAPP';

create or replace function private.store_orders_payment_guard()
returns trigger language plpgsql security invoker set search_path = public, extensions as $$
begin
  if new.payment_status = 'PAID' then
    if new.paid_via is null then new.paid_via := case when new.payment_method in ('UPI_ON_DELIVERY', 'WHATSAPP') then 'UPI' else 'CASH' end; end if;
    if new.paid_at is null then new.paid_at := now(); end if;
  elsif new.payment_status = 'PENDING' then
    new.paid_via := null; new.paid_at := null; new.payment_ref := null;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ------------------------------------------------------------------ place_order / track_order (payment method + payment status)
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
  v_pay text := upper(coalesce(p->>'payment_method', 'WHATSAPP'));
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
  if v_pay not in ('WHATSAPP', 'COD', 'UPI_ON_DELIVERY') then v_pay := 'WHATSAPP'; end if;
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

create or replace function public.track_order(p_code text, p_phone text)
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'code', o.code, 'status', o.status, 'fulfilment', o.fulfilment, 'created_at', o.created_at,
    'updated_at', o.updated_at, 'name', o.customer_name, 'items_total', o.items_total,
    'discount', o.discount, 'coupon_code', o.coupon_code,
    'delivery_fee', o.delivery_fee, 'total', o.total, 'mrp_total', o.mrp_total, 'payment_method', o.payment_method, 'payment_status', o.payment_status,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'size', i.size, 'price', i.price, 'qty', i.qty, 'line', i.line_total) order by i.id)
                       from store_order_items i where i.order_id = o.id), '[]'::jsonb))
  from store_orders o
  where upper(o.code) = upper(btrim(p_code)) and o.phone = public.web_norm_phone(p_phone)
$$;
