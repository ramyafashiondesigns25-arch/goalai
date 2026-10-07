-- Goalai web: orders, order items and the store's CRM category.
-- Non-destructive: only creates objects.

insert into public.categories (name, tagline, description, status, sort_order)
select 'Goalai Organic Store', 'Organic nuts, dry fruits and groceries',
       'Orders placed on the Goalai website store', 'ACTIVE', 50
where not exists (select 1 from public.categories where name = 'Goalai Organic Store');

create sequence if not exists public.store_order_seq start 1001;

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('GO-' || nextval('public.store_order_seq')::text),
  customer_name text not null check (length(customer_name) between 2 and 80),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  fulfilment text not null check (fulfilment in ('PICKUP','DELIVERY')),
  address text check (address is null or length(address) <= 400),
  pincode text check (pincode is null or pincode ~ '^[1-9][0-9]{5}$'),
  notes text check (notes is null or length(notes) <= 500),
  items_total integer not null check (items_total >= 0),
  mrp_total integer not null check (mrp_total >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  total integer not null check (total >= 0),
  payment_method text not null default 'COD' check (payment_method in ('COD','UPI_ON_DELIVERY','ONLINE')),
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING','PAID','REFUNDED')),
  status text not null default 'NEW' check (status in ('NEW','CONFIRMED','PACKED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED')),
  ref_code text,
  crm_customer_id uuid references public.customers(id) on delete set null,
  crm_lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_orders_address_needed check (fulfilment = 'PICKUP' or (address is not null and length(address) >= 8))
);
create index if not exists store_orders_created on public.store_orders (created_at desc);
create index if not exists store_orders_phone on public.store_orders (phone, created_at desc);
create index if not exists store_orders_status on public.store_orders (status);

create table if not exists public.store_order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id text references public.store_products(id) on delete set null,
  name text not null,
  size text not null,
  price integer not null check (price > 0),
  mrp integer not null check (mrp > 0),
  qty integer not null check (qty between 1 and 99),
  line_total integer not null check (line_total >= 0)
);
create index if not exists store_order_items_order on public.store_order_items (order_id);

create trigger store_orders_touch before update on public.store_orders
  for each row execute function public.touch_updated_at();

alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;

-- Only the Founder reads or manages orders directly. Customers create orders
-- through place_order() and look them up through track_order().
create policy store_orders_founder_select on public.store_orders
  for select to authenticated using (public.is_founder());
create policy store_orders_founder_update on public.store_orders
  for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy store_order_items_founder_select on public.store_order_items
  for select to authenticated using (public.is_founder());

grant select, update on public.store_orders to authenticated;
grant select on public.store_order_items to authenticated;
