-- Security hardening after audit: only the two public lookups stay open to signed-out visitors.
revoke execute on function public.add_request_update(bigint, text, int, text, boolean), public.ensure_store_customer(),
  public.is_store_staff(), public.my_admin_role(), public.my_service_requests(), public.staff_service_requests(text),
  public.store_orders_after(), public.place_order(jsonb), public.submit_enquiry(jsonb) from anon, public;
revoke execute on function public.store_orders_after() from authenticated;  -- trigger only
-- still public by design: public_services() (service catalogue) and track_order(code, phone)
