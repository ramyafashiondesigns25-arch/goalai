-- Sizes/colours (variants) are only for the Clothing category.
create or replace function private.variants_clothing_only() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.store_products where id = new.product_id and cat = 'clothing') then
    raise exception 'Sizes and colours can only be added to Clothing products.';
  end if;
  return new;
end $$;
drop trigger if exists store_variants_clothing on public.store_product_variants;
create trigger store_variants_clothing before insert on public.store_product_variants
  for each row execute function private.variants_clothing_only();
