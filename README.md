# Goalai — store, customer accounts & admin (two separate apps, one database)

```
apps/web     → https://goalai.in            customers: browse, log in, order, request services, My account
apps/admin   → https://admin.goalai.in      Founder only: orders, products & photos, customers, website leads, settings
packages/core → shared code (types, pricing, Supabase clients, design)
supabase/     → database migrations (already applied to the GOALAI project)
```

Both apps read and write the **same GOALAI Supabase database**, so a product saved in admin appears in the store,
and a customer's order appears in admin and in the CRM straight away. The admin app is a different site with its
own address — nothing about it is visible or linked from the customer site.

## Customer experience (apps/web)

- Browse products and services freely (good for Google).
- **Log in with a one-time email code** — no password. New customers are signed up in the same step.
- Login is required to **place an order** or **send a service request**; the basket is kept while they log in.
- **My account**: their orders with live status, their service requests with status (Received → In progress → Completed),
  and saved name / mobile / address that pre-fill checkout.
- Orders and requests are filed in the CRM as customer + lead (referral links `?ref=CODE` assign the lead to that agent).

## Admin (apps/admin)

Founder sign-in (GOALAI email + password). Overview, Orders (status → CRM lead Won/Lost, restock on cancel),
Products (photo upload, MRP / price, stock, hide/show), **Customers** (accounts, orders, spend), Website leads, Settings.
Every save refreshes the store immediately via a secret-protected `/api/revalidate` call.

## One-time Supabase setup (Dashboard → Authentication) — required for customer login

1. **URL Configuration** → Site URL = your store address (e.g. `https://goalai.in`).
   Redirect URLs: add `https://goalai.in/auth/callback` (and your Vercel preview URL `https://*.vercel.app/auth/callback` if you want previews to work).
2. **Email Templates → Magic Link**: make the email show the code. Replace the body with, for example:
   ```html
   <h2>Your Goalai sign-in code</h2>
   <p>Enter this code on the website: <strong style="font-size:24px;letter-spacing:4px">{{ .Token }}</strong></p>
   <p>Or <a href="{{ .ConfirmationURL }}">click here to sign in</a>. The code expires in 1 hour.</p>
   ```
   Do the same for **Confirm signup** (first-time customers receive that one).
3. **SMTP Settings**: connect your own email sender (Resend, Brevo, Zoho, Amazon SES…). Supabase's built-in sender is
   for testing only and sends just a few emails per hour — real customers will not get codes without this.
4. **Providers → Email**: keep Email enabled. Turn on **Leaked password protection** (Passwords) for the admin login.

## Deploy — two Vercel projects from the same GitHub repo

| | Store project | Admin project |
|---|---|---|
| Root Directory | `apps/web` | `apps/admin` |
| Framework | Next.js | Next.js |
| `NEXT_PUBLIC_SUPABASE_URL` | GOALAI URL | same |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | GOALAI publishable key | same |
| `NEXT_PUBLIC_SITE_URL` | `https://goalai.in` | — |
| `NEXT_PUBLIC_STORE_URL` | — | `https://goalai.in` |
| `REVALIDATE_SECRET` | random string | **the same** random string |
| Domain | `goalai.in` | `admin.goalai.in` |

Generate the secret with `openssl rand -hex 32`. Vercel installs the whole workspace automatically.

## Local development

```bash
npm install
cp apps/web/.env.example apps/web/.env.local && cp apps/admin/.env.example apps/admin/.env.local
npm run dev:web      # http://localhost:3000
npm run dev:admin    # http://localhost:3001
npm run typecheck && npm test && npm run build
```

## Database & security

Migrations in `supabase/migrations/` (all applied):
`store_catalogue` · `store_orders` · `web_rpcs` · `customer_accounts` · `login_required`.

- Customers are auth users marked `account_type = customer`; they get a `store_customers` row and **no CRM profile**, so CRM
  data (leads, customers, earnings) stays invisible to them. Staff sign-ups work exactly as before.
- A customer can read only their own orders, order items, requests and profile; they can edit only their contact details.
- `place_order` / `submit_enquiry` refuse anonymous calls, validate everything, re-price from the database, and file CRM rows.
- Only an active Founder can change products, prices, orders and settings.

## Before going live

- [ ] Supabase Auth setup above (Site URL, redirect URL, code in email template, custom SMTP).
- [ ] Real products, photos, prices; organic certificate numbers; comparison % you have verified.
- [ ] Review privacy & terms pages.
- [ ] Place a test order with a real email, then mark it Delivered in admin and check the CRM lead turns Won.
