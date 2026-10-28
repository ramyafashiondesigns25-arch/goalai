-- Goalai Opportunities: admin-made categories (Jobs, Training, ...) with listings that customers can browse,
-- but can only APPLY to after paying a fee that the Founder verifies.
--
--   store_opp_categories     categories the Founder creates (name, icon, colour, order)
--   store_opportunities      public listing: title, salary, training, highlights, fee
--   store_opportunity_private employer / contact / interview details — readable ONLY after the customer is unlocked
--   store_applications       one row per customer per listing: payment review -> paid -> applied -> shortlisted/selected
--
-- Payment is UPI to the shop's own UPI id: the customer pays, enters the UTR, the Founder checks it in the bank/UPI app
-- and approves. Customers never write these tables directly; every step is a database function.

-- ------------------------------------------------------------------ UPI details for the payment step
alter table public.store_settings
  add column if not exists upi_id text not null default '' check (length(upi_id) <= 80),
  add column if not exists upi_name text not null default 'Goalai' check (length(upi_name) between 1 and 60);

-- ------------------------------------------------------------------ categories
create table if not exists public.store_opp_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (length(name) between 2 and 60),
  tagline text not null default '' check (length(tagline) <= 120),
  description text not null default '' check (length(description) <= 600),
  icon text not null default '💼' check (length(icon) between 1 and 12),
  color text not null default '#D81B60' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger store_opp_categories_touch before update on public.store_opp_categories
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ listings
create table if not exists public.store_opportunities (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.store_opp_categories(id) on delete cascade,
  title text not null check (length(title) between 3 and 120),
  teaser text not null default '' check (length(teaser) <= 140),           -- the curiosity line, e.g. "Top security firm · Guindy"
  location text not null default '' check (length(location) <= 80),
  job_type text not null default '' check (length(job_type) <= 40),         -- Full-time, Part-time, Contract, Walk-in…
  summary text not null default '' check (length(summary) <= 300),
  description text not null default '' check (length(description) <= 4000),
  highlights jsonb not null default '[]'::jsonb check (jsonb_typeof(highlights) = 'array' and jsonb_array_length(highlights) <= 8),
  requirements text not null default '' check (length(requirements) <= 1500),
  salary_min integer check (salary_min is null or salary_min >= 0),
  salary_max integer check (salary_max is null or salary_max >= 0),
  salary_period text not null default 'MONTH' check (salary_period in ('MONTH', 'YEAR', 'DAY', 'HOUR', 'FIXED')),
  salary_note text not null default '' check (length(salary_note) <= 80),   -- e.g. "+ incentives & PF"
  training_title text not null default '' check (length(training_title) <= 100),
  training_details text not null default '' check (length(training_details) <= 1500),
  training_duration text not null default '' check (length(training_duration) <= 40),
  openings integer check (openings is null or openings > 0),
  apply_fee integer not null default 0 check (apply_fee between 0 and 100000),
  fee_note text not null default '' check (length(fee_note) <= 300),        -- what the fee covers
  closes_on date,
  featured boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_opp_salary_order check (salary_min is null or salary_max is null or salary_max >= salary_min)
);
create index if not exists store_opportunities_cat on public.store_opportunities (category_id, sort);
create trigger store_opportunities_touch before update on public.store_opportunities
  for each row execute function public.touch_updated_at();

create table if not exists public.store_opportunity_private (
  opportunity_id uuid primary key references public.store_opportunities(id) on delete cascade,
  employer text not null default '' check (length(employer) <= 120),
  contact text not null default '' check (length(contact) <= 200),
  address text not null default '' check (length(address) <= 300),
  instructions text not null default '' check (length(instructions) <= 2000)
);

-- ------------------------------------------------------------------ applications
create table if not exists public.store_applications (
  id bigint generated always as identity primary key,
  opportunity_id uuid not null references public.store_opportunities(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'PAYMENT_REVIEW'
    check (status in ('PAYMENT_REVIEW', 'PAYMENT_REJECTED', 'PAID', 'APPLIED', 'SHORTLISTED', 'SELECTED', 'NOT_SELECTED')),
  fee_amount integer not null default 0 check (fee_amount >= 0),           -- the fee at the time the customer paid
  utr text check (utr is null or utr ~ '^[A-Z0-9]{8,30}$'),
  paid_submitted_at timestamptz,
  verified_at timestamptz,
  applicant_name text check (applicant_name is null or length(applicant_name) between 2 and 80),
  phone text check (phone is null or phone ~ '^[6-9][0-9]{9}$'),
  email text check (email is null or length(email) <= 120),
  qualification text check (qualification is null or length(qualification) <= 200),
  experience text check (experience is null or length(experience) <= 300),
  message text check (message is null or length(message) <= 1000),
  admin_note text check (admin_note is null or length(admin_note) <= 500),  -- shown to the customer
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, user_id)
);
create index if not exists store_applications_user on public.store_applications (user_id, created_at desc);
create index if not exists store_applications_status on public.store_applications (status, created_at desc);
-- one UPI reference can only pay for one application (a rejected one may be re-submitted with a new reference)
create unique index if not exists store_applications_utr_once on public.store_applications (utr) where utr is not null and status <> 'PAYMENT_REJECTED';
create trigger store_applications_touch before update on public.store_applications
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ row-level security
alter table public.store_opp_categories enable row level security;
alter table public.store_opportunities enable row level security;
alter table public.store_opportunity_private enable row level security;
alter table public.store_applications enable row level security;

create policy opp_cat_read_public on public.store_opp_categories for select to anon using (active);
create policy opp_cat_read on public.store_opp_categories for select to authenticated using (active or public.is_founder());
create policy opp_cat_insert on public.store_opp_categories for insert to authenticated with check (public.is_founder());
create policy opp_cat_update on public.store_opp_categories for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy opp_cat_delete on public.store_opp_categories for delete to authenticated using (public.is_founder());

create policy opp_read_public on public.store_opportunities for select to anon
  using (active and exists (select 1 from public.store_opp_categories c where c.id = category_id and c.active));
create policy opp_read on public.store_opportunities for select to authenticated
  using (public.is_founder() or (active and exists (select 1 from public.store_opp_categories c where c.id = category_id and c.active)));
create policy opp_insert on public.store_opportunities for insert to authenticated with check (public.is_founder());
create policy opp_update on public.store_opportunities for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy opp_delete on public.store_opportunities for delete to authenticated using (public.is_founder());

-- employer / contact / interview details: the paywall lives HERE, in the database, not in the web page
create policy opp_private_read on public.store_opportunity_private for select to authenticated
  using (public.is_founder() or exists (
    select 1 from public.store_applications a
    where a.opportunity_id = store_opportunity_private.opportunity_id and a.user_id = auth.uid()
      and a.status in ('PAID', 'APPLIED', 'SHORTLISTED', 'SELECTED', 'NOT_SELECTED')));
create policy opp_private_insert on public.store_opportunity_private for insert to authenticated with check (public.is_founder());
create policy opp_private_update on public.store_opportunity_private for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy opp_private_delete on public.store_opportunity_private for delete to authenticated using (public.is_founder());

create policy applications_read on public.store_applications for select to authenticated using (user_id = auth.uid() or public.is_founder());
-- no insert/update/delete policies: applications change only through the functions below

grant select on public.store_opp_categories, public.store_opportunities to anon;
grant select, insert, update, delete on public.store_opp_categories, public.store_opportunities, public.store_opportunity_private to authenticated;
grant select on public.store_applications to authenticated;

-- ------------------------------------------------------------------ customer: submit payment proof
-- Free listings (fee 0) unlock straight away. Paid listings wait for the Founder to verify the UPI reference.
create or replace function public.submit_opp_payment(p_opportunity uuid, p_utr text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  o store_opportunities; a store_applications; v_found boolean;
  v_utr text := upper(regexp_replace(coalesce(p_utr, ''), '[^A-Za-z0-9]', '', 'g'));
  v_status text; v_id bigint;
begin
  if v_uid is null then raise exception 'Please log in to continue.'; end if;
  select * into o from store_opportunities x
   where x.id = p_opportunity and x.active
     and exists (select 1 from store_opp_categories c where c.id = x.category_id and c.active);
  if not found then raise exception 'Could not find that opening.'; end if;
  if o.closes_on is not null and o.closes_on < current_date then raise exception 'This opening has closed.'; end if;

  select * into a from store_applications where opportunity_id = o.id and user_id = v_uid for update;
  v_found := found;
  if v_found and a.status <> 'PAYMENT_REJECTED' then raise exception 'You have already started this application.'; end if;

  if o.apply_fee > 0 then
    if v_utr !~ '^[A-Z0-9]{8,30}$' then raise exception 'Please enter the UPI reference number (UTR) from your payment.'; end if;
    if exists (select 1 from store_applications x where x.utr = v_utr and x.status <> 'PAYMENT_REJECTED') then
      raise exception 'This UPI reference was already used. Please check the number.';
    end if;
    if (select count(*) from store_applications where user_id = v_uid and paid_submitted_at > now() - interval '1 hour') >= 5 then
      raise exception 'Several payments were just submitted. Please wait a little or call us.';
    end if;
    v_status := 'PAYMENT_REVIEW';
  else
    v_status := 'PAID';
  end if;

  if v_found then
    update store_applications
       set status = v_status, fee_amount = o.apply_fee, utr = nullif(v_utr, ''), paid_submitted_at = now(),
           verified_at = case when v_status = 'PAID' then now() end, admin_note = null
     where id = a.id returning id into v_id;
  else
    insert into store_applications (opportunity_id, user_id, status, fee_amount, utr, paid_submitted_at, verified_at)
    values (o.id, v_uid, v_status, o.apply_fee, nullif(v_utr, ''), now(), case when v_status = 'PAID' then now() end)
    returning id into v_id;
  end if;
  return jsonb_build_object('id', v_id, 'status', v_status);
end $$;

-- ------------------------------------------------------------------ customer: send the application (after unlock)
create or replace function public.submit_application(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid(); a store_applications;
  v_name text := btrim(coalesce(p->>'name', ''));
  v_phone text := public.web_norm_phone(p->>'phone');
  v_email text := nullif(btrim(coalesce(p->>'email', '')), '');
  v_qual text := left(nullif(btrim(coalesce(p->>'qualification', '')), ''), 200);
  v_exp text := left(nullif(btrim(coalesce(p->>'experience', '')), ''), 300);
  v_msg text := left(nullif(btrim(coalesce(p->>'message', '')), ''), 1000);
  v_opp uuid;
begin
  if v_uid is null then raise exception 'Please log in to continue.'; end if;
  begin v_opp := (p->>'opportunity_id')::uuid; exception when others then v_opp := null; end;
  if length(v_name) < 2 or length(v_name) > 80 then raise exception 'Please enter your name.'; end if;
  if v_phone is null or v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Please enter a valid 10-digit mobile number.'; end if;
  if v_email is not null and (length(v_email) > 120 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') then raise exception 'Please check your email address.'; end if;
  if v_qual is null then raise exception 'Please tell us your qualification.'; end if;

  select * into a from store_applications where opportunity_id = v_opp and user_id = v_uid for update;
  if not found then raise exception 'Please unlock this opening first.'; end if;
  if a.status <> 'PAID' then
    if a.status = 'PAYMENT_REVIEW' then raise exception 'Your payment is still being verified.'; end if;
    if a.status = 'PAYMENT_REJECTED' then raise exception 'Your payment could not be verified. Please pay again.'; end if;
    raise exception 'You have already sent your application.';
  end if;

  update store_applications
     set status = 'APPLIED', applicant_name = v_name, phone = v_phone, email = v_email,
         qualification = v_qual, experience = v_exp, message = v_msg, applied_at = now()
   where id = a.id;
  return jsonb_build_object('id', a.id, 'status', 'APPLIED');
end $$;

-- ------------------------------------------------------------------ Founder: verify a payment / move an application on
create or replace function public.admin_review_payment(p_app bigint, p_approve boolean, p_note text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare a store_applications; v_note text := left(nullif(btrim(coalesce(p_note, '')), ''), 500);
begin
  if not public.is_founder() then raise exception 'Only the Founder can verify payments.'; end if;
  select * into a from store_applications where id = p_app for update;
  if not found then raise exception 'Could not find that application.'; end if;
  if a.status <> 'PAYMENT_REVIEW' then raise exception 'This payment has already been reviewed.'; end if;
  if p_approve then
    update store_applications set status = 'PAID', verified_at = now(), admin_note = v_note where id = a.id;
  else
    if v_note is null then raise exception 'Please tell the customer why the payment was not accepted.'; end if;
    update store_applications set status = 'PAYMENT_REJECTED', admin_note = v_note where id = a.id;
  end if;
  return jsonb_build_object('id', a.id, 'status', case when p_approve then 'PAID' else 'PAYMENT_REJECTED' end);
end $$;

create or replace function public.admin_set_application_status(p_app bigint, p_status text, p_note text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare a store_applications; v_note text := left(nullif(btrim(coalesce(p_note, '')), ''), 500);
begin
  if not public.is_founder() then raise exception 'Only the Founder can update applications.'; end if;
  if p_status not in ('APPLIED', 'SHORTLISTED', 'SELECTED', 'NOT_SELECTED') then raise exception 'Choose a valid status.'; end if;
  select * into a from store_applications where id = p_app for update;
  if not found then raise exception 'Could not find that application.'; end if;
  if a.status not in ('APPLIED', 'SHORTLISTED', 'SELECTED', 'NOT_SELECTED') then raise exception 'The customer has not sent the application yet.'; end if;
  update store_applications set status = p_status, admin_note = coalesce(v_note, admin_note) where id = a.id;
  return jsonb_build_object('id', a.id, 'status', p_status);
end $$;

-- ------------------------------------------------------------------ customer: my applications (with the opening's public details)
create or replace function public.my_applications()
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'status', a.status, 'fee_amount', a.fee_amount, 'admin_note', a.admin_note,
    'created_at', a.created_at, 'updated_at', a.updated_at, 'applied_at', a.applied_at,
    'opportunity_id', o.id, 'title', o.title, 'location', o.location,
    'category', c.name, 'icon', c.icon, 'color', c.color
  ) order by a.updated_at desc), '[]'::jsonb)
  from store_applications a
  join store_opportunities o on o.id = a.opportunity_id
  join store_opp_categories c on c.id = o.category_id
  where a.user_id = auth.uid()
$$;

-- ------------------------------------------------------------------ who may call what
revoke execute on function public.submit_opp_payment(uuid, text), public.submit_application(jsonb),
  public.admin_review_payment(bigint, boolean, text), public.admin_set_application_status(bigint, text, text),
  public.my_applications() from anon, public;
grant execute on function public.submit_opp_payment(uuid, text), public.submit_application(jsonb),
  public.admin_review_payment(bigint, boolean, text), public.admin_set_application_status(bigint, text, text),
  public.my_applications() to authenticated;
