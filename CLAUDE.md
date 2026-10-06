# Goalai — notes for Claude / developers

Monorepo (npm workspaces):
- `apps/web` — public store + customer accounts (deploy as its own Vercel project, root `apps/web`).
- `apps/admin` — Founder-only admin console (separate Vercel project, root `apps/admin`). Never link to it from the store.
- `packages/core` — shared types, pricing, pack drawing, Supabase clients, design CSS. Import as `@goalai/core/...`.
- `supabase/migrations` — schema in git. Add new files; never edit the live database by hand.

Rules:
- Next.js 16: read `node_modules/next/dist/docs/` before using an API (`proxy.ts`, async `params`).
- Customers never write tables directly: orders → `place_order()`, requests → `submit_enquiry()` (both require a signed-in customer and re-price/validate in Postgres).
- Customers are auth users with `user_metadata.account_type = 'customer'` and a `store_customers` row — no CRM profile. Do not give them CRM access.
- Admin writes use the browser client + RLS (`is_founder()`); after changes call `revalidateStore()` which pings the store's `/api/revalidate`.
- Before a PR: `npm run typecheck && npm test && npm run build`.
