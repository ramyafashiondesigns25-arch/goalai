-- Goalai store catalogue (already applied to the GOALAI project on 2026-10-05).
-- Kept here so the schema lives in git with the app.

create table if not exists public.store_settings (
  id smallint primary key default 1 check (id = 1),
  online_pct integer not null default 15 check (online_pct between 0 and 300),
  retail_pct integer not null default 50 check (retail_pct between 0 and 300),
  cap_mrp boolean not null default true,
  free_above integer not null default 499 check (free_above >= 0),
  delivery_fee integer not null default 40 check (delivery_fee >= 0),
  whatsapp text not null default '916380150117',
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1) on conflict do nothing;

create table if not exists public.store_products (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  cat text not null,
  name text not null check (length(name) between 1 and 120),
  ta text not null default '',
  size text not null check (length(size) between 1 and 40),
  price integer not null check (price > 0),
  mrp integer not null check (mrp > 0),
  stock integer check (stock is null or stock >= 0),
  description text not null default '',
  details jsonb not null default '[]'::jsonb check (jsonb_typeof(details) = 'array'),
  cert text not null default '',
  is_new boolean not null default false,
  image_url text,
  image_path text,
  pack_type text not null default 'pouch',
  tag text not null default '',
  color text not null default '#C98A4B',
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_price_le_mrp check (price <= mrp)
);
create index if not exists store_products_cat_sort on public.store_products (cat, sort);

create trigger store_products_touch before update on public.store_products
  for each row execute function public.touch_updated_at();
create trigger store_settings_touch before update on public.store_settings
  for each row execute function public.touch_updated_at();

alter table public.store_products enable row level security;
alter table public.store_settings enable row level security;

create policy store_products_read_public on public.store_products for select to anon using (active);
create policy store_products_read on public.store_products for select to authenticated using (active or public.is_founder());
create policy store_products_insert on public.store_products for insert to authenticated with check (public.is_founder());
create policy store_products_update on public.store_products for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy store_products_delete on public.store_products for delete to authenticated using (public.is_founder());
create policy store_settings_read on public.store_settings for select to anon, authenticated using (true);
create policy store_settings_update on public.store_settings for update to authenticated using (public.is_founder()) with check (public.is_founder());

grant select on public.store_products, public.store_settings to anon, authenticated;
grant insert, update, delete on public.store_products to authenticated;
grant update on public.store_settings to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-products', 'store-products', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy store_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'store-products' and public.is_founder());
create policy store_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'store-products' and public.is_founder()) with check (bucket_id = 'store-products' and public.is_founder());
create policy store_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'store-products' and public.is_founder());
