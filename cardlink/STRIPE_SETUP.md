# Stripe Setup Checklist (Cardlink)

This project already contains Stripe routes:
- `POST /api/stripe/checkout`
- `POST /api/stripe/portal`
- `POST /api/stripe/webhook`
- `POST /api/stripe/checkout/confirm` (fallback sync after checkout success redirect)

**Stripe Connect routes** (for business users to receive payments):
- `POST /api/stripe/connect/onboard` — create connected account & start onboarding
- `GET  /api/stripe/connect/status`  — check connected account status
- `POST /api/stripe/connect/dashboard` — get Express dashboard login link
- `POST /api/stripe/connect/checkout` — create checkout session with connected account

If Stripe is not configured, users can reach checkout but app/database will not sync plan status correctly.

## 1) Environment variables
Create `.env.local` from `.env.example` and fill all values:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (from Stripe Dashboard → API Keys)

## 2) Pricing — no Stripe products needed
Prices are defined in the `subscription_plans` DB table and passed to Stripe
Checkout as inline `price_data`. **No Products or Prices need to exist in the
Stripe Dashboard.** The checkout route reads the plan slug + interval from the
frontend and builds the line item dynamically.

## 3) Stripe webhook
Create webhook endpoint in Stripe Dashboard:
- Endpoint URL: `https://YOUR_DOMAIN/api/stripe/webhook`
- For local testing, use Stripe CLI forwarding to `http://localhost:3000/api/stripe/webhook`

Subscribe these events at minimum:
- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy webhook signing secret (`whsec_...`) to `STRIPE_WEBHOOK_SECRET`.

## 4) Verify DB migration is applied
Ensure migration `migrations/20260301_subscription_tracking_and_nfc_premium_duration.sql` has been applied.
It creates:
- profile billing columns
- `billing_payment_events` table
- `recompute_profile_premium(uuid)` function

## 5) End-to-end test
1. Start app and login
2. Navigate to `/business/settings/plan` and click "Change Plan"
3. Select a paid plan and complete Stripe checkout
4. Return to `/business/settings/plan?checkout=success`

Expected result:
- `profiles.stripe_subscription_status` updated
- `profiles.stripe_subscription_current_period_end` updated
- `profiles.premium_until` updated
- `profiles.plan` recomputed by `recompute_profile_premium`
- a row appears in `billing_payment_events`

## 6) Quick SQL checks
```sql
-- latest billing events
select event_type, stripe_event_id, stripe_customer_id, user_id, created_at
from public.billing_payment_events
order by created_at desc
limit 20;

-- user plan status
select id, plan, premium_until, stripe_subscription_status, stripe_subscription_current_period_end, last_payment_at
from public.profiles
where id = 'USER_ID_HERE';
```

## 7) Local webhook testing (Stripe CLI)
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Use the printed signing secret as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## 8) Stripe Connect Setup (Business Payments)

Stripe Connect lets business users on your platform receive payments from customers.
The platform takes a configurable application fee from each payment.

### a) Enable Connect in Stripe Dashboard
1. Go to **Stripe Dashboard → Settings → Connect settings**
2. Choose **Express** account type (recommended)
3. Customize your Connect branding (platform name, icon, color)
4. Enable **Card payments** and **Transfers** capabilities

### b) Configure webhook for Connect events
Add the `account.updated` event to your webhook endpoint in Stripe Dashboard:
- Endpoint URL: `https://YOUR_DOMAIN/api/stripe/webhook`
- Add event: `account.updated`

### c) Environment variables (optional)
```env
# Platform fee percentage (default: 10%)
STRIPE_CONNECT_PLATFORM_FEE_PERCENT=10
```

### d) Database migration
Ensure migration `20260324_041_stripe_connect_columns.sql` is applied.
It adds to the `companies` table:
- `stripe_connect_account_id` — the Stripe connected account ID
- `stripe_connect_onboarding_complete` — whether onboarding is done
- `stripe_connect_charges_enabled` — whether charges are enabled
- `stripe_connect_payouts_enabled` — whether payouts are enabled

### e) Business user flow
1. Business user navigates to **Settings → Stripe Connect**
2. Clicks "Connect Stripe Account" → redirected to Stripe Express onboarding
3. Completes identity verification and bank account setup on Stripe
4. Returns to Cardlink — status shows as active
5. Can open Stripe Express Dashboard to view balance, payouts, and transactions

### f) Platform payment flow
Use `POST /api/stripe/connect/checkout` with:
```json
{
  "companyId": "uuid-of-connected-company",
  "amount": 50.00,
  "description": "Product purchase",
  "currency": "usd"
}
```
This creates a Checkout Session where the payment goes to the connected account
minus the platform application fee.
