-- Goalai customer accounts.
-- Customers sign in with an email code (Supabase Auth, same project as the CRM).
-- A customer is an auth user WITHOUT a CRM profile: signing up from the store
-- passes user_metadata.account_type = 'customer', and handle_new_user() then
-- creates a store_customers row instead of an (inactive) CRM agent profile.
-- CRM row-level security already denies users without a profile.

create table if not exists public.store_customers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '' check (length(full_name) <= 80),
  phone text check (phone is null or phone ~ '^[6-9][0-9]{9}$'),
  address text check (address is null or length(address) <= 400),
  pincode text check (pincode is null or pincode ~ '^[1-9][0-9]{5}$'),
  city text check (city is null or length(city) <= 80),
  crm_customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists store_customers_phone on public.store_customers (phone);

-- customers may edit their contact details only
create or replace function private.store_customers_guard()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and not public.is_founder() then
    new.id := old.id; new.email := old.email; new.crm_customer_id := old.crm_customer_id; new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger store_customers_guard before update on public.store_customers
  for each row execute function private.store_customers_guard();

alter table public.store_customers enable row level security;
create policy store_customers_self_select on public.store_customers
  for select to authenticated using (id = auth.uid() or public.is_founder());
create policy store_customers_self_update on public.store_customers
  for update to authenticated using (id = auth.uid() or public.is_founder()) with check (id = auth.uid() or public.is_founder());
grant select, update on public.store_customers to authenticated;

-- service requests made by signed-in customers (each is also a CRM lead)
create table if not exists public.store_service_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  service_name text not null,
  project_name text,
  message text,
  created_at timestamptz not null default now()
);
create index if not exists store_service_requests_user on public.store_service_requests (user_id, created_at desc);
alter table public.store_service_requests enable row level security;
create policy store_service_requests_select on public.store_service_requests
  for select to authenticated using (user_id = auth.uid() or public.is_founder());
grant select on public.store_service_requests to authenticated;

-- orders belong to the signed-in customer
alter table public.store_orders add column if not exists customer_user_id uuid references auth.users(id) on delete set null;
create index if not exists store_orders_customer on public.store_orders (customer_user_id, created_at desc);
create policy store_orders_customer_select on public.store_orders
  for select to authenticated using (customer_user_id = auth.uid());
create policy store_order_items_customer_select on public.store_order_items
  for select to authenticated using (exists (select 1 from public.store_orders o where o.id = order_id and o.customer_user_id = auth.uid()));

-- new auth users: customers get a store profile, everyone else keeps the CRM flow
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  provisioned boolean := coalesce((new.raw_app_meta_data ->> 'provisioned')::boolean, false);
  r user_role := 'AGENT';
begin
  if not provisioned and coalesce(new.raw_user_meta_data ->> 'account_type', '') = 'customer' then
    insert into store_customers (id, email, full_name)
    values (new.id, lower(new.email), left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80))
    on conflict (id) do nothing;
    return new;
  end if;

  if provisioned and (new.raw_user_meta_data ->> 'role') in ('ASSISTANT_DIRECTOR','SENIOR_MANAGER','MANAGER','AGENT') then
    r := (new.raw_user_meta_data ->> 'role')::user_role;
  end if;
  insert into profiles (id, full_name, email, phone, role, status, reports_to, team_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    r,
    case when provisioned then 'ACTIVE'::user_status else 'INACTIVE'::user_status end,
    case when provisioned then nullif(new.raw_user_meta_data ->> 'reports_to', '')::uuid end,
    case when provisioned then nullif(new.raw_user_meta_data ->> 'team_name', '') end
  );
  return new;
end $$;

-- make sure the signed-in user has a store profile (e.g. a staff member shopping)
create or replace function public.ensure_store_customer()
returns public.store_customers language plpgsql volatile security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); row store_customers;
begin
  if uid is null then raise exception 'Please log in.'; end if;
  insert into store_customers (id, email) select uid, lower(u.email) from auth.users u where u.id = uid
  on conflict (id) do nothing;
  select * into row from store_customers where id = uid;
  return row;
end $$;

-- a customer's service requests with live CRM status
create or replace function public.my_service_requests()
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'service', r.service_name, 'project', r.project_name, 'message', r.message,
    'created_at', r.created_at, 'ref', l.lead_code,
    'status', case when l.status in ('WON') then 'Completed'
                   when l.status in ('LOST', 'ARCHIVED') then 'Closed'
                   when l.status = 'NEW' then 'Received'
                   else 'In progress' end
  ) order by r.created_at desc), '[]'::jsonb)
  from store_service_requests r left join leads l on l.id = r.lead_id
  where r.user_id = auth.uid()
$$;

grant execute on function public.ensure_store_customer() to authenticated;
grant execute on function public.my_service_requests() to authenticated;
