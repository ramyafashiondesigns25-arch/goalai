-- 1) Organic flag: only food products are shown as organic (editable per product in admin).
alter table public.store_products add column if not exists organic boolean not null default false;
update public.store_products set organic = true where cat in ('nuts','staples','millets','oils','masala','drinks','homemade');

-- 2) Private purchase cost (never readable by the public store) -> margin tracking in admin.
create table if not exists public.store_product_costs (
  product_id text primary key references public.store_products(id) on delete cascade on update cascade,
  cost numeric(12,2) not null check (cost >= 0),
  updated_at timestamptz not null default now()
);
alter table public.store_product_costs enable row level security;
drop policy if exists store_costs_founder on public.store_product_costs;
create policy store_costs_founder on public.store_product_costs for all to authenticated using (public.is_founder()) with check (public.is_founder());
revoke all on public.store_product_costs from anon, public;
grant select, insert, update, delete on public.store_product_costs to authenticated;

-- 3) Customer reviews: only signed-in customers who ordered the product (not cancelled) can review, once per product.
create table if not exists public.store_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.store_products(id) on delete cascade on update cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author text not null check (length(author) between 1 and 60),
  rating smallint not null check (rating between 1 and 5),
  title text not null default '' check (length(title) <= 80),
  body text not null default '' check (length(body) <= 1000),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists store_reviews_product on public.store_reviews (product_id, created_at desc);
alter table public.store_reviews enable row level security;
drop policy if exists store_reviews_read on public.store_reviews;
drop policy if exists store_reviews_founder_update on public.store_reviews;
drop policy if exists store_reviews_founder_delete on public.store_reviews;
create policy store_reviews_read on public.store_reviews for select to anon, authenticated using (published or public.is_founder());
create policy store_reviews_founder_update on public.store_reviews for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy store_reviews_founder_delete on public.store_reviews for delete to authenticated using (public.is_founder());
revoke all on public.store_reviews from anon, public, authenticated;
-- the public can see everything except who wrote it (user_id)
grant select (id, product_id, author, rating, title, body, published, created_at) on public.store_reviews to anon, authenticated;
grant update (published) on public.store_reviews to authenticated;
grant delete on public.store_reviews to authenticated;

create or replace function public.submit_review(p_product text, p_rating int, p_title text, p_body text)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid(); v_name text; v_author text; v_title text := left(btrim(coalesce(p_title, '')), 80); v_body text := left(btrim(coalesce(p_body, '')), 1000);
begin
  if v_uid is null then raise exception 'Please log in to write a review.'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Please choose a rating from 1 to 5 stars.'; end if;
  if not exists (select 1 from store_products where id = p_product) then raise exception 'This product is no longer available.'; end if;
  if not exists (
    select 1 from store_order_items i join store_orders o on o.id = i.order_id
     where i.product_id = p_product and o.customer_user_id = v_uid and o.status <> 'CANCELLED'
  ) then raise exception 'Only customers who ordered this product can review it.'; end if;
  select nullif(btrim(full_name), '') into v_name from store_customers where id = v_uid;
  v_author := coalesce(split_part(v_name, ' ', 1) || case when position(' ' in coalesce(v_name, '')) > 0 then ' ' || left(split_part(v_name, ' ', 2), 1) || '.' else '' end, 'Customer');
  insert into store_reviews (product_id, user_id, author, rating, title, body)
  values (p_product, v_uid, v_author, p_rating, v_title, v_body)
  on conflict (product_id, user_id) do update set rating = excluded.rating, title = excluded.title, body = excluded.body, author = excluded.author, created_at = now();
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.submit_review(text, int, text, text) from anon, public;
grant execute on function public.submit_review(text, int, text, text) to authenticated;

-- can this signed-in customer review this product? (used to show the form)
create or replace function public.can_review(p_product text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from store_order_items i join store_orders o on o.id = i.order_id
     where i.product_id = p_product and o.customer_user_id = auth.uid() and o.status <> 'CANCELLED');
$$;
revoke execute on function public.can_review(text) from anon, public;
grant execute on function public.can_review(text) to authenticated;
