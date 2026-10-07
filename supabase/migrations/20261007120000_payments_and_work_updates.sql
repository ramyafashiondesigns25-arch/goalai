-- Goalai: payment tracking on orders + work-status updates on service requests.
--  * Orders record how the money actually came in (cash / UPI), when, and a UPI reference.
--  * Service requests get a stage, a progress %, and a timeline of updates written by the team.
--    Customers see the updates (except internal notes) in their account on the store.
--  * "Staff" = any ACTIVE GOALAI CRM profile. Staff may read requests and post updates;
--    everything else in the admin console stays Founder-only.

-- ------------------------------------------------------------------ orders: payments
alter table public.store_orders
  add column if not exists paid_via text check (paid_via is null or paid_via in ('CASH', 'UPI')),
  add column if not exists paid_at timestamptz,
  add column if not exists payment_ref text check (payment_ref is null or length(payment_ref) <= 60),
  add column if not exists admin_note text check (admin_note is null or length(admin_note) <= 500);

-- keep payment fields consistent whatever the client sends
create or replace function private.store_orders_payment_guard()
returns trigger language plpgsql security invoker set search_path = public, extensions as $$
begin
  if new.payment_status = 'PAID' then
    if new.paid_via is null then new.paid_via := case when new.payment_method = 'UPI_ON_DELIVERY' then 'UPI' else 'CASH' end; end if;
    if new.paid_at is null then new.paid_at := now(); end if;
  elsif new.payment_status = 'PENDING' then
    new.paid_via := null; new.paid_at := null; new.payment_ref := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger store_orders_payment_guard before update on public.store_orders
  for each row execute function private.store_orders_payment_guard();

-- ------------------------------------------------------------------ staff helper
create or replace function public.is_store_staff()
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.status = 'ACTIVE')
$$;
grant execute on function public.is_store_staff() to authenticated;

-- 'FOUNDER' | 'STAFF' | null — used by the admin console to decide what to show
create or replace function public.my_admin_role()
returns text language sql stable security definer set search_path = public, extensions as $$
  select case when p.role = 'FOUNDER' and p.status = 'ACTIVE' then 'FOUNDER'
              when p.status = 'ACTIVE' then 'STAFF' end
  from profiles p where p.id = auth.uid()
$$;
grant execute on function public.my_admin_role() to authenticated;

-- ------------------------------------------------------------------ service requests: stage + progress
alter table public.store_service_requests
  add column if not exists stage text not null default 'RECEIVED'
    check (stage in ('RECEIVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
  add column if not exists progress int not null default 0 check (progress between 0 and 100),
  add column if not exists updated_at timestamptz not null default now();

alter policy store_service_requests_select on public.store_service_requests
  using (user_id = auth.uid() or public.is_store_staff());

create table if not exists public.store_request_updates (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.store_service_requests(id) on delete cascade,
  stage text not null check (stage in ('RECEIVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
  progress int not null check (progress between 0 and 100),
  note text not null check (length(note) between 1 and 1000),
  internal boolean not null default false,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  created_at timestamptz not null default now()
);
create index if not exists store_request_updates_req on public.store_request_updates (request_id, created_at desc);
alter table public.store_request_updates enable row level security;
create policy store_request_updates_select on public.store_request_updates for select to authenticated
  using (public.is_store_staff()
         or (not internal and exists (select 1 from store_service_requests r where r.id = request_id and r.user_id = auth.uid())));
grant select on public.store_request_updates to authenticated;

-- staff post an update; the request's stage/progress follow, and the CRM lead follows the stage
create or replace function public.add_request_update(p_request bigint, p_stage text, p_progress int, p_note text, p_internal boolean default false)
returns public.store_request_updates language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_req store_service_requests; v_row store_request_updates; v_name text;
  v_claims text; v_sub text; v_lead_status lead_status;
begin
  if not public.is_store_staff() then raise exception 'Please sign in with a team account.'; end if;
  if p_stage not in ('RECEIVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED') then raise exception 'Choose a valid stage.'; end if;
  if p_progress is null or p_progress < 0 or p_progress > 100 then raise exception 'Progress must be between 0 and 100.'; end if;
  if p_note is null or length(trim(p_note)) = 0 then raise exception 'Please write a short update for the customer.'; end if;
  if length(p_note) > 1000 then raise exception 'Please keep the update under 1000 characters.'; end if;

  select * into v_req from store_service_requests where id = p_request for update;
  if not found then raise exception 'Could not find that request.'; end if;
  select coalesce(nullif(full_name, ''), email) into v_name from profiles where id = auth.uid();

  insert into store_request_updates (request_id, stage, progress, note, internal, author_id, author_name)
  values (p_request, p_stage, case when p_stage = 'COMPLETED' then 100 else p_progress end, trim(p_note), coalesce(p_internal, false), auth.uid(), v_name)
  returning * into v_row;

  update store_service_requests
     set stage = p_stage, progress = v_row.progress, updated_at = now()
   where id = p_request;

  -- mirror onto the CRM lead (system context so CRM ownership rules don't block staff)
  if v_req.lead_id is not null then
    v_lead_status := case p_stage when 'COMPLETED' then 'WON'::lead_status
                                  when 'CANCELLED' then 'LOST'::lead_status
                                  when 'IN_PROGRESS' then 'CONTACTED'::lead_status end;
    if v_lead_status is not null then
      v_claims := current_setting('request.jwt.claims', true); v_sub := current_setting('request.jwt.claim.sub', true);
      perform set_config('request.jwt.claims', '', true); perform set_config('request.jwt.claim.sub', '', true);
      update leads set status = v_lead_status
       where id = v_req.lead_id
         and status not in ('ARCHIVED')
         and not (v_lead_status = 'CONTACTED' and status <> 'NEW');
      perform set_config('request.jwt.claims', coalesce(v_claims, ''), true); perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);
    end if;
  end if;
  return v_row;
end $$;
grant execute on function public.add_request_update(bigint, text, int, text, boolean) to authenticated;

-- staff work list: requests with the customer's contact details and the CRM reference
create or replace function public.staff_service_requests(p_stage text default null)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.is_store_staff() then raise exception 'Please sign in with a team account.'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'service', r.service_name, 'project', r.project_name, 'message', r.message,
      'stage', r.stage, 'progress', r.progress, 'created_at', r.created_at, 'updated_at', r.updated_at,
      'ref', l.lead_code,
      'customer', jsonb_build_object('id', c.id, 'name', coalesce(nullif(c.full_name, ''), l.contact_name), 'email', c.email,
                                     'phone', coalesce(c.phone, l.phone), 'address', c.address, 'city', c.city, 'pincode', c.pincode),
      'updates', coalesce((select jsonb_agg(jsonb_build_object('id', u.id, 'stage', u.stage, 'progress', u.progress, 'note', u.note,
                                     'internal', u.internal, 'author', u.author_name, 'created_at', u.created_at) order by u.created_at desc)
                           from store_request_updates u where u.request_id = r.id), '[]'::jsonb)
    ) order by (r.stage in ('COMPLETED', 'CANCELLED')), r.updated_at desc)
    from store_service_requests r
    left join store_customers c on c.id = r.user_id
    left join leads l on l.id = r.lead_id
    where p_stage is null or p_stage = '' or r.stage = p_stage
  ), '[]'::jsonb);
end $$;
grant execute on function public.staff_service_requests(text) to authenticated;

-- the customer's own requests, now with stage, progress and the visible timeline
create or replace function public.my_service_requests()
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'service', r.service_name, 'project', r.project_name, 'message', r.message,
    'created_at', r.created_at, 'updated_at', r.updated_at, 'ref', l.lead_code,
    'stage', r.stage, 'progress', r.progress,
    'status', case r.stage when 'RECEIVED' then 'Received' when 'IN_PROGRESS' then 'In progress'
                           when 'ON_HOLD' then 'On hold' when 'COMPLETED' then 'Completed' else 'Closed' end,
    'updates', coalesce((select jsonb_agg(jsonb_build_object('stage', u.stage, 'progress', u.progress, 'note', u.note,
                                 'by', u.author_name, 'created_at', u.created_at) order by u.created_at desc)
                         from store_request_updates u where u.request_id = r.id and not u.internal), '[]'::jsonb)
  ) order by r.created_at desc), '[]'::jsonb)
  from store_service_requests r left join leads l on l.id = r.lead_id
  where r.user_id = auth.uid()
$$;
grant execute on function public.my_service_requests() to authenticated;
