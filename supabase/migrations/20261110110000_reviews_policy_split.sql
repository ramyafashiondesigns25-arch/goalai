-- anon cannot execute is_founder(), so the public review policy must not call it.
drop policy if exists store_reviews_read on public.store_reviews;
drop policy if exists store_reviews_read_public on public.store_reviews;
drop policy if exists store_reviews_read_auth on public.store_reviews;
create policy store_reviews_read_public on public.store_reviews for select to anon using (published);
create policy store_reviews_read_auth on public.store_reviews for select to authenticated using (published or public.is_founder());
alter function private.variants_clothing_only() set search_path = public;
