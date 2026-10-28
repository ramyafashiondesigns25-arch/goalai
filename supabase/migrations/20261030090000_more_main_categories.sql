-- More main shelves. The Founder can add, rename, reorder or hide any of these in Admin → Categories.
insert into public.store_categories (id, name, ta, color, sort) values
  ('clothing',   'Clothing',       'ஆடைகள்',              '#2F6FB5', 80),
  ('ladies',     'Ladies items',   'பெண்கள் பொருட்கள்',    '#C2467A', 90),
  ('cosmetics',  'Cosmetics',      'அழகு சாதனங்கள்',       '#D9558B', 100),
  ('fancy',      'Fancy items',    'ஃபேன்சி பொருட்கள்',    '#8E44AD', 110),
  ('toys',       'Toys',           'பொம்மைகள்',           '#E8912D', 120),
  ('stationery', 'Stationery',     'எழுதுபொருட்கள்',       '#2A9D8F', 130),
  ('houses',     'Houses',         'வீடுகள்',              '#6B7A8F', 140),
  ('lands',      'Lands',          'நிலம் / மனை',          '#7A9A3B', 150)
on conflict (id) do nothing;
