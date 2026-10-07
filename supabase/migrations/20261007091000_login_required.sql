-- Login required for orders and service requests; link them to the customer account.
create or replace function private.store_customers_guard()
returns trigger language plpgsql security invoker set search_path = public, extensions as $$
begin
  new.updated_at := now();
  -- direct edits by a signed-in customer may only change contact details;
  -- our own database functions (running as the owner) may set the CRM link
  if tg_op = 'UPDATE' and current_user in ('authenticated', 'anon') and not public.is_founder() then
    new.id := old.id; new.email := old.email; new.crm_customer_id := old.crm_customer_id; new.created_at := old.created_at;
  end if;
  return new;
end $$;

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
  select id into v_cat from categories where name = 'Goalai Organic Store' limit 1;
  select * into r from private.web_resolve_ref(p->>'ref', v_cat, null);

  insert into store_orders (customer_name, phone, email, fulfilment, address, pincode, notes,
                            items_total, mrp_total, delivery_fee, total, payment_method, ref_code, customer_user_id)
  values (v_name, v_phone, v_email, v_mode, v_addr, v_pin, v_notes,
          v_sum, v_mrp, v_fee, v_sum + v_fee, v_pay, case when r.promo_id is not null then upper(btrim(p->>'ref')) end, v_uid)
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
          v_summary || 'Total: ₹' || v_order.total || ' · ' || initcap(lower(v_mode)) ||
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

  return jsonb_build_object('code', v_order.code, 'total', v_order.total, 'items_total', v_sum,
                            'delivery_fee', v_fee, 'item_count', v_count, 'whatsapp', s.whatsapp);
end $$;

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
  v_uid uuid := auth.uid();
  v_claims text; v_sub text;
begin
  if v_uid is null then raise exception 'Please log in to send a request.'; end if;
  if coalesce(p->>'website', '') <> '' then raise exception 'Could not send your enquiry.'; end if; -- honeypot
  if length(v_name) < 2 or length(v_name) > 80 then raise exception 'Please enter your name.'; end if;
  if v_phone is null then raise exception 'Please enter a valid 10-digit mobile number.'; end if;
  v_email := coalesce(v_email, (select lower(email) from auth.users where id = v_uid));
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
  -- CRM rows are written as the website (system), not as the customer:
  -- CRM triggers treat a signed-in user as staff, and customers are not staff.
  v_claims := current_setting('request.jwt.claims', true); v_sub := current_setting('request.jwt.claim.sub', true);
  perform set_config('request.jwt.claims', '', true); perform set_config('request.jwt.claim.sub', '', true);
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

  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true); perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);

  insert into store_service_requests (user_id, lead_id, category_id, project_id, service_name, project_name, message)
  values (v_uid, v_lead.id, v_cat, v_proj, v_cat_name, v_proj_name, v_msg);

  insert into store_customers (id, email) values (v_uid, v_email) on conflict (id) do nothing;
  update store_customers set full_name = v_name, phone = v_phone, city = coalesce(v_city, city),
         crm_customer_id = coalesce(crm_customer_id, v_cust)
   where id = v_uid;

  return jsonb_build_object('lead_code', v_lead.lead_code, 'service', v_cat_name);
end $$;

-- orders and requests now need a signed-in customer
grant execute on function public.place_order(jsonb) to authenticated;
grant execute on function public.submit_enquiry(jsonb) to authenticated;
