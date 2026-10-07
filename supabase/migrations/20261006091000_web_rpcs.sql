-- Goalai web: public RPCs. Customers never write tables directly; every
-- write goes through these functions, which validate input, re-price from
-- the database and file the customer + lead into the GOALAI CRM.
-- Internal helpers live in schema `private`, which the API does not expose.

create schema if not exists private;

create or replace function public.web_norm_phone(p text)
returns text language sql immutable set search_path = public as $$
  select case when r ~ '^[6-9][0-9]{9}$' then r end
  from (select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10) as r) x
$$;

-- Resolve an agent referral code (promo_codes) for a category.
create or replace function private.web_resolve_ref(p_ref text, p_category uuid, p_project uuid default null,
  out promo_id uuid, out assignee uuid)
language plpgsql stable security definer set search_path = public, extensions as $$
declare pc promo_codes;
begin
  if p_ref is null or btrim(p_ref) = '' then return; end if;
  select * into pc from promo_codes
   where upper(code) = upper(btrim(p_ref)) and status = 'ACTIVE' limit 1;
  if not found then return; end if;
  if promo_is_usable(pc, p_project, p_category) is not null then return; end if;
  promo_id := pc.id; assignee := pc.assigned_to;
end $$;

-- Find or create the CRM customer for a phone number.
create or replace function private.web_upsert_customer(p_name text, p_phone text, p_email text,
  p_address text, p_city text, p_category uuid, p_source text, p_assignee uuid)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare cid uuid;
begin
  select id into cid from customers
   where right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = p_phone
     and status <> 'ARCHIVED' and merged_into is null
   order by created_at limit 1;
  if cid is null then
    insert into customers (full_name, phone, email, address, city, category_id, source, assigned_to)
    values (p_name, p_phone, nullif(p_email, ''), nullif(p_address, ''), nullif(p_city, ''), p_category, p_source, p_assignee)
    returning id into cid;
  end if;
  return cid;
end $$;

-- ---------------------------------------------------------------- services
create or replace function public.public_services()
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'tagline', c.tagline, 'description', c.description,
      'image_url', c.image_url, 'is_property', c.is_property,
      'projects', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', p.id, 'name', p.name, 'location', p.location, 'description', p.description,
          'starting_price', p.starting_price, 'price_per_unit', p.price_per_unit, 'area_unit', p.area_unit,
          'unit_label', p.unit_label, 'unit_size', p.unit_size, 'available_units', p.available_units,
          'total_units', p.total_units, 'approval', p.approval, 'amenities', p.amenities,
          'cover_image', p.cover_image, 'gallery', p.gallery, 'map_url', p.map_url) order by p.sort_order, p.name)
        from projects p where p.category_id = c.id and p.status::text = 'ACTIVE'), '[]'::jsonb)
    ) order by c.sort_order, c.name), '[]'::jsonb)
  from categories c
  where c.status = 'ACTIVE' and c.parent_id is null and c.name <> 'Goalai Organic Store'
$$;

-- ---------------------------------------------------------------- enquiry
create or replace function public.submit_enquiry(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_name text := btrim(coalesce(p->>'name', ''));
  v_phone text := web_norm_phone(p->>'phone');
  v_email text := nullif(btrim(coalesce(p->>'email', '')), '');
  v_city text := left(nullif(btrim(coalesce(p->>'city', '')), ''), 80);
  v_msg text := left(nullif(btrim(coalesce(p->>'message', '')), ''), 1000);
  v_cat uuid; v_proj uuid; v_cat_name text; v_proj_name text;
  r record; v_cust uuid; v_lead leads;
begin
  if coalesce(p->>'website', '') <> '' then raise exception 'Could not send your enquiry.'; end if; -- honeypot
  if length(v_name) < 2 or length(v_name) > 80 then raise exception 'Please enter your name.'; end if;
  if v_phone is null then raise exception 'Please enter a valid 10-digit mobile number.'; end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please check your email address.'; end if;

  begin v_cat := (p->>'category_id')::uuid; exception when others then v_cat := null; end;
  select name into v_cat_name from categories where id = v_cat and status = 'ACTIVE';
  if v_cat_name is null then raise exception 'Please choose a service.'; end if;
  if coalesce(p->>'project_id', '') <> '' then
    begin v_proj := (p->>'project_id')::uuid; exception when others then v_proj := null; end;
    select name into v_proj_name from projects where id = v_proj and category_id = v_cat and status::text = 'ACTIVE';
    if v_proj_name is null then v_proj := null; end if;
  end if;

  if (select count(*) from leads where right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = v_phone
        and source like 'Website%' and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'We already have your enquiries — our team will call you shortly.';
  end if;

  select * into r from private.web_resolve_ref(p->>'ref', v_cat, v_proj);
  v_cust := private.web_upsert_customer(v_name, v_phone, v_email, null, v_city, v_cat, 'Website', r.assignee);

  insert into leads (customer_id, contact_name, phone, email, title, category_id, project_id, status, priority,
                     source, notes, next_follow_up, assigned_to, promo_code_id)
  values (v_cust, v_name, v_phone, v_email,
          'Website enquiry · ' || v_cat_name || coalesce(' · ' || v_proj_name, ''),
          v_cat, v_proj, 'NEW', 'HIGH', 'Website · Enquiry',
          concat_ws(E'\n', v_msg, case when v_city is not null then 'City: ' || v_city end,
                    case when r.promo_id is not null then 'Referral code: ' || upper(btrim(p->>'ref')) end),
          now() + interval '2 hours', r.assignee, r.promo_id)
  returning * into v_lead;

  return jsonb_build_object('lead_code', v_lead.lead_code, 'service', v_cat_name);
end $$;

-- ---------------------------------------------------------------- orders
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
begin
  if coalesce(p->>'website', '') <> '' then raise exception 'Could not place the order.'; end if; -- honeypot
  if length(v_name) < 2 or length(v_name) > 80 then raise exception 'Please enter your name.'; end if;
  if v_phone is null then raise exception 'Please enter a valid 10-digit mobile number.'; end if;
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
  select id into v_cat from categories where name = 'Goalai Organic Store' limit 1;
  select * into r from private.web_resolve_ref(p->>'ref', v_cat, null);

  insert into store_orders (customer_name, phone, email, fulfilment, address, pincode, notes,
                            items_total, mrp_total, delivery_fee, total, payment_method, ref_code)
  values (v_name, v_phone, v_email, v_mode, v_addr, v_pin, v_notes,
          v_sum, v_mrp, v_fee, v_sum + v_fee, v_pay, case when r.promo_id is not null then upper(btrim(p->>'ref')) end)
  returning * into v_order;

  insert into store_order_items (order_id, product_id, name, size, price, mrp, qty, line_total)
  select v_order.id, x->>'id', x->>'name', x->>'size', (x->>'price')::int, (x->>'mrp')::int, (x->>'qty')::int, (x->>'line')::int
  from jsonb_array_elements(v_items) x;

  update store_products sp set stock = sp.stock - (x->>'qty')::int
  from jsonb_array_elements(v_items) x where sp.id = x->>'id' and sp.stock is not null;

  -- file into the CRM
  v_cust := private.web_upsert_customer(v_name, v_phone, v_email, v_addr, null, v_cat, 'Website', r.assignee);
  insert into leads (customer_id, contact_name, phone, email, title, category_id, status, priority, expected_value,
                     source, notes, next_follow_up, assigned_to, promo_code_id)
  values (v_cust, v_name, v_phone, v_email, 'Store order ' || v_order.code || ' · ₹' || v_order.total,
          v_cat, 'NEW', 'HIGH', v_order.total, 'Website · Store order',
          v_summary || 'Total: ₹' || v_order.total || ' · ' || initcap(lower(v_mode)) ||
            case when v_addr is not null then E'\nAddress: ' || v_addr || coalesce(' - ' || v_pin, '') else '' end ||
            case when v_notes is not null then E'\nNote: ' || v_notes else '' end,
          now() + interval '30 minutes', r.assignee, r.promo_id)
  returning * into v_lead;

  update store_orders set crm_customer_id = v_cust, crm_lead_id = v_lead.id where id = v_order.id;

  return jsonb_build_object('code', v_order.code, 'total', v_order.total, 'items_total', v_sum,
                            'delivery_fee', v_fee, 'item_count', v_count, 'whatsapp', s.whatsapp);
end $$;

-- ---------------------------------------------------------------- tracking
create or replace function public.track_order(p_code text, p_phone text)
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'code', o.code, 'status', o.status, 'fulfilment', o.fulfilment, 'created_at', o.created_at,
    'updated_at', o.updated_at, 'name', o.customer_name, 'items_total', o.items_total,
    'delivery_fee', o.delivery_fee, 'total', o.total, 'mrp_total', o.mrp_total, 'payment_method', o.payment_method,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'size', i.size, 'price', i.price, 'qty', i.qty, 'line', i.line_total) order by i.id)
                       from store_order_items i where i.order_id = o.id), '[]'::jsonb))
  from store_orders o
  where upper(o.code) = upper(btrim(p_code)) and o.phone = public.web_norm_phone(p_phone)
$$;

-- ---------------------------------------------------------------- order → CRM sync
-- Delivered orders mark the CRM lead WON (so referral commissions apply);
-- cancelled orders mark it LOST and put the stock back.
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
      from store_order_items i where i.order_id = new.id and sp.id = i.product_id and sp.stock is not null;
    end if;
  end if;
  return null;
end $$;

create trigger store_orders_after_status after update of status on public.store_orders
  for each row execute function public.store_orders_after();

-- ---------------------------------------------------------------- grants
-- (helpers in `private` are not reachable through the API)
grant execute on function public.public_services() to anon, authenticated;
grant execute on function public.submit_enquiry(jsonb) to anon, authenticated;
grant execute on function public.place_order(jsonb) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
