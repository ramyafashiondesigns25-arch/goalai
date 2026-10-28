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
- **Shelves**: main categories and sub-categories made by the Founder (Nuts → Badam, Pista, Cashew; Healthy home-made food → Laddus …). The shop shows the main shelves with the sub-categories under each.
- **Share**: every product has a Share menu — WhatsApp, Facebook, Instagram (copies the link and opens the app), Telegram, X, email, copy link, and the phone's own share sheet.
- **Payment on WhatsApp**: no gateway. After ordering, "Pay on WhatsApp" opens a chat with the order filled in; the shop replies with UPI details and marks the order paid in admin.
- **Opportunities** (`/opportunities`): categories the Founder creates (Jobs, Training, …) with attractive listings showing salary, training and highlights.
  The employer and contact stay locked: the customer registers by paying a UPI fee, the Founder verifies the UTR, the details unlock and the customer sends an application.
- **Coupons**: enter a code at checkout; the discount is previewed live and priced again inside Postgres when the order is placed.
- **Cancel an order** (My account): allowed while the order is Received/Confirmed and unpaid; stock goes back and the CRM lead becomes Lost.
- **Buy again**: one tap puts an earlier order's items back in the basket at today's prices and stock.
- **Saved items**: a heart on every product card and product page; the list lives in My account.
- Orders and requests are filed in the CRM as customer + lead (referral links `?ref=CODE` assign the lead to that agent).

## Admin (apps/admin)

Founder sign-in (GOALAI email + password). Overview, Orders (status → CRM lead Won/Lost, restock on cancel),
Products (photo upload, MRP / price, stock, hide/show), **Customers** (accounts, orders, spend), **Categories** (shelves and sub-categories), **Opportunities** (categories + openings, with a private employer block), **Applications** (verify UPI payments, shortlist / select), **Coupons** (create, schedule,
limit, switch off; see uses and ₹ given), Website leads, Settings.
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
`store_catalogue` · `store_orders` · `web_rpcs` · `customer_accounts` · `login_required` · `payments_and_work_updates` · `lock_down_rpc` · `ecom_feature_pack` · `opportunities` · `store_categories_whatsapp_pay`
(coupons, `validate_coupon()`, `cancel_my_order()`, wishlist; `place_order()` and `track_order()` replaced to carry the discount).

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
- [ ] Apply `20261027090000_ecom_feature_pack.sql` (Supabase SQL editor), then create a test coupon in admin → Coupons and use it on a test order.
- [ ] Apply `20261028090000_opportunities.sql`, set your UPI ID in admin → Settings, create a category + opening, register with a small test fee and verify it in Applications.
- [ ] Apply `20261029090000_store_categories_whatsapp_pay.sql`, open admin → Categories, add a main category and a sub-category, assign a product to them and check the shop filter.
- [ ] Place a test order and tap Pay on WhatsApp; mark it paid in admin → Orders.
- [ ] Cancel a test order from My account and check the stock came back and the CRM lead is Lost.
