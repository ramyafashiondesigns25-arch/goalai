-- More photos per product, plus variants (pack sizes) and colours with their own price, stock and photo.
-- A product WITHOUT variants works exactly as before. A product WITH active variants must be bought by choosing one.

-- 1) extra photos -----------------------------------------------------------------------------------
alter table public.store_products add column if not exists gallery text[] not null default '{}';
alter table public.store_products drop constraint if exists store_products_gallery_max;
alter table public.store_products add constraint store_products_gallery_max check (cardinality(gallery) <= 8);

-- 2) variants ---------------------------------------------------------------------------------------
create table if not exists public.store_product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references public.store_products(id) on delete cascade on update cascade,
  label       text not null default '' check (length(label) <= 40),
  colour_name text not null default '' check (length(colour_name) <= 40),
  colour_hex  text check (colour_hex is null or colour_hex ~ '^#[0-9A-Fa-f]{6}$'),
  price       integer not null check (price > 0),
  mrp         integer not null check (mrp > 0),
  stock       integer check (stock is null or stock >= 0),
  image_url   text,
  image_path  text,
  sort        integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint store_variant_named check (btrim(label) <> '' or btrim(colour_name) <> ''),
  constraint store_variant_mrp check (mrp >= price)
);
create unique index if not exists store_variants_unique on public.store_product_variants (product_id, lower(btrim(label)), lower(btrim(colour_name)));
create index if not exists store_variants_product on public.store_product_variants (product_id, sort);

drop trigger if exists store_variants_touch on public.store_product_variants;
create trigger store_variants_touch before update on public.store_product_variants
  for each row execute function public.touch_updated_at();

alter table public.store_product_variants enable row level security;
drop policy if exists store_variants_read_public on public.store_product_variants;
drop policy if exists store_variants_read on public.store_product_variants;
drop policy if exists store_variants_insert on public.store_product_variants;
drop policy if exists store_variants_update on public.store_product_variants;
drop policy if exists store_variants_delete on public.store_product_variants;
create policy store_variants_read_public on public.store_product_variants for select to anon using (active);
create policy store_variants_read on public.store_product_variants for select to authenticated using (active or public.is_founder());
create policy store_variants_insert on public.store_product_variants for insert to authenticated with check (public.is_founder());
create policy store_variants_update on public.store_product_variants for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy store_variants_delete on public.store_product_variants for delete to authenticated using (public.is_founder());
grant select on public.store_product_variants to anon;
grant select, insert, update, delete on public.store_product_variants to authenticated;

-- 3) order lines remember which variant was bought ---------------------------------------------------
alter table public.store_order_items add column if not exists variant_id uuid;

-- 4) cancelling an order puts stock back on the right row (product or variant) ----------------------
create or replace function public.store_orders_after()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'CANCELLED' then
      raise exception 'A cancelled order cannot be reopened. Ask the customer to order again.';
    elsif new.status = 'DELIVERED' and new.crm_lead_id is not null then
      update leads set status = 'WON' where id = new.crm_lead_id and status not in ('WON', 'ARCHIVED');
    elsif new.status = 'CANCELLED' then
      if new.crm_lead_id is not null then
        update leads set status = 'LOST' where id = new.crm_lead_id and status not in ('LOST', 'ARCHIVED');
      end if;
      update store_products sp set stock = sp.stock + i.qty
        from store_order_items i
       where i.order_id = new.id and i.variant_id is null and sp.id = i.product_id and sp.stock is not null;
      update store_product_variants sv set stock = sv.stock + i.qty
        from store_order_items i
       where i.order_id = new.id and i.variant_id is not null and sv.id = i.variant_id and sv.stock is not null;
    end if;
  end if;
  return null;
end $$;

-- 5) place_order understands variants (price, stock and name come from the database, never the browser) ----
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
  v_cat uuid; it record; prod store_products; var store_product_variants; r record;
  v_items jsonb := '[]'::jsonb; v_sum int := 0; v_mrp int := 0; v_fee int := 0; v_count int := 0;
  v_order store_orders; v_cust uuid; v_lead leads; v_summary text := '';
  v_uid uuid := auth.uid();
  v_claims text; v_sub text;
  v_coupon text := upper(nullif(btrim(coalesce(p->>'coupon', '')), ''));
  v_disc int := 0; v_ce jsonb;
  v_nvar int; v_price int; v_pmrp int; v_size text; v_stock int; v_label text;
begin
  if v_uid is null then raise exception 'Please log in to place your order.'; end if;
  if coalesce(p->>'website', '') <> '' then raise exception 'Could not place the order.'; end if;
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

  for it in
    select x->>'id' as id, nullif(btrim(coalesce(x->>'variant', '')), '') as vid,
           sum(case when (x->>'qty') ~ '^[0-9]{1,3}$' then greatest(1, least(99, (x->>'qty')::int)) else 1 end)::int as qty
    from jsonb_array_elements(p->'items') x
    group by x->>'id', nullif(btrim(coalesce(x->>'variant', '')), '')
    order by x->>'id', nullif(btrim(coalesce(x->>'variant', '')), '')
  loop
    select * into prod from store_products where id = it.id and active for update;
    if not found then raise exception 'One of the items is no longer available. Please refresh your basket.'; end if;
    if it.qty > 99 then raise exception 'Maximum 99 of % per order.', prod.name; end if;

    select count(*) into v_nvar from store_product_variants where product_id = prod.id and active;
    var := null;
    if v_nvar > 0 then
      if it.vid is null or it.vid !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'Please choose an option for %.', prod.name;
      end if;
      select * into var from store_product_variants where id = it.vid::uuid and product_id = prod.id and active for update;
      if not found then raise exception 'One of the items is no longer available. Please refresh your basket.'; end if;
      v_price := var.price; v_pmrp := var.mrp; v_stock := var.stock;
      v_size := concat_ws(' · ', nullif(btrim(var.label), ''), nullif(btrim(var.colour_name), ''));
    else
      if it.vid is not null then raise exception 'One of the items is no longer available. Please refresh your basket.'; end if;
      v_price := prod.price; v_pmrp := prod.mrp; v_stock := prod.stock; v_size := prod.size;
    end if;
    v_label := prod.name || case when var.id is not null then ' (' || v_size || ')' else '' end;

    if v_stock is not null and v_stock < it.qty then
      if v_stock = 0 then raise exception '% is out of stock.', v_label;
      else raise exception 'Only % of % left in stock.', v_stock, v_label; end if;
    end if;
    v_items := v_items || jsonb_build_object('id', prod.id, 'variant', var.id, 'name', prod.name, 'size', v_size,
                 'price', v_price, 'mrp', v_pmrp, 'qty', it.qty, 'line', v_price * it.qty);
    v_sum := v_sum + v_price * it.qty; v_mrp := v_mrp + v_pmrp * it.qty; v_count := v_count + it.qty;
    v_summary := v_summary || '• ' || prod.name || ' (' || v_size || ') × ' || it.qty || ' = ₹' || (v_price * it.qty) || E'\n';
  end loop;

  v_fee := case when v_mode = 'PICKUP' or v_sum >= s.free_above then 0 else s.delivery_fee end;
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

  insert into store_order_items (order_id, product_id, variant_id, name, size, price, mrp, qty, line_total)
  select v_order.id, x->>'id', nullif(x->>'variant', '')::uuid, x->>'name', x->>'size', (x->>'price')::int, (x->>'mrp')::int, (x->>'qty')::int, (x->>'line')::int
  from jsonb_array_elements(v_items) x;

  update store_products sp set stock = sp.stock - (x->>'qty')::int
  from jsonb_array_elements(v_items) x where sp.id = x->>'id' and (x->>'variant') is null and sp.stock is not null;
  update store_product_variants sv set stock = sv.stock - (x->>'qty')::int
  from jsonb_array_elements(v_items) x where (x->>'variant') is not null and sv.id = (x->>'variant')::uuid and sv.stock is not null;

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

  insert into store_customers (id, email) values (v_uid, v_email) on conflict (id) do nothing;
  update store_customers set full_name = v_name, phone = v_phone,
         address = coalesce(v_addr, address), pincode = coalesce(v_pin, pincode), crm_customer_id = v_cust
   where id = v_uid;

  return jsonb_build_object('code', v_order.code, 'total', v_order.total, 'items_total', v_sum, 'discount', v_disc,
                            'delivery_fee', v_fee, 'item_count', v_count, 'whatsapp', s.whatsapp);
end $$;

revoke execute on function public.place_order(jsonb) from anon, public;
grant execute on function public.place_order(jsonb) to authenticated;
