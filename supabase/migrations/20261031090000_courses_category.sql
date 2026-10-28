-- Main shelf for courses. Manage or add sub-categories in Admin → Categories.
insert into public.store_categories (id, name, ta, color, sort) values
  ('courses', 'Courses', 'படிப்புகள்', '#3F51B5', 160)
on conflict (id) do nothing;
