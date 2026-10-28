# Goalai — notes for Claude / developers

Monorepo (npm workspaces):
- `apps/web` — public store + customer accounts (deploy as its own Vercel project, root `apps/web`).
- `apps/admin` — Founder-only admin console (separate Vercel project, root `apps/admin`). Never link to it from the store.
- `packages/core` — shared types, pricing, pack drawing, Supabase clients, design CSS. Import as `@goalai/core/...`.
- `supabase/migrations` — schema in git. Add new files; never edit the live database by hand.

Rules:
- Next.js 16: read `node_modules/next/dist/docs/` before using an API (`proxy.ts`, async `params`).
- Customers never write tables directly: orders → `place_order()`, requests → `submit_enquiry()`, cancelling → `cancel_my_order()` (all require a signed-in customer and re-price/validate in Postgres).
- Coupons: only the Founder can read `store_coupons`; customers go through `validate_coupon()` and `place_order()` (via `private.coupon_eval`). Usage is counted from non-cancelled orders. Never trust a discount sent by the browser.
- Opportunities: listings are public, but employer/contact live in `store_opportunity_private`, readable only with a paid application (RLS). Customers change applications only via `submit_opp_payment()` / `submit_application()`; the Founder via `admin_review_payment()` / `admin_set_application_status()`.
- Shelves: `store_categories` is two levels (main → sub). `store_products.cat` is the main id, `store_products.sub` the optional sub id (a trigger keeps them consistent). `STORE_CATS` in core is only the offline fallback. No payment gateway: orders are paid by chatting on WhatsApp (`payment_method = WHATSAPP`).
- Saved items are `store_wishlist` rows (own rows only, RLS). New SQL functions must `revoke execute ... from anon, public` like `lock_down_rpc`.
- Customers are auth users with `user_metadata.account_type = 'customer'` and a `store_customers` row — no CRM profile. Do not give them CRM access.
- Admin writes use the browser client + RLS (`is_founder()`); after changes call `revalidateStore()` which pings the store's `/api/revalidate`.
- Before a PR: `npm run typecheck && npm test && npm run build`.
