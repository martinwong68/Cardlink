# Billing & Subscriptions Module

> Auto-generated from Supabase database on 2025-07-21
> Updated 2026-03-25 with complete column definitions and RPC functions
> 6 tables + 2 RPC functions | All verified ✅ in live DB

---

## Table of Contents

- [subscription_plans](#subscription_plans) — 3 rows
- [company_subscriptions](#company_subscriptions) — 0 rows
- [billing_payment_events](#billing_payment_events) — 5 rows
- [app_billing_settings](#app_billing_settings) — 1 row
- [user_roles](#user_roles) — 0 rows
- [billing_history](#billing_history) — 0 rows

---

## subscription_plans

**Status:** ✅ Exists (3 rows)
**Description:** Available subscription plans (Free, Pro, Enterprise, etc.).

### Columns (15)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| name | text | | Plan name |
| slug | text | | URL-safe identifier |
| price_monthly | numeric | | Monthly price |
| price_yearly | numeric | | Yearly price |
| ai_actions_monthly | int | | AI action quota |
| max_companies | int | | Max companies allowed |
| max_users | int | | Max users per company |
| *(+ more feature limits)* | | | |
| is_active | boolean | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Referenced By

| Table | Column |
|-------|--------|
| company_subscriptions | plan_id |

---

## company_subscriptions

**Status:** ✅ Exists (0 rows)
**FKs:** company_id → companies.id, plan_id → subscription_plans.id

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| plan_id | uuid | | FK → subscription_plans.id |
| status | text | | active, cancelled, past_due |
| stripe_subscription_id | text | | |
| current_period_start | timestamptz | | |
| current_period_end | timestamptz | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## billing_payment_events

**Status:** ✅ Exists (5 rows)
**Description:** Stripe webhook event log for all payment activity.

### Columns (14)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| stripe_event_id | text | | Stripe event ID |
| stripe_checkout_session_id | text | | |
| stripe_payment_intent_id | text | | |
| stripe_subscription_id | text | | |
| stripe_customer_id | text | | |
| user_id | uuid | | FK → auth.users |
| event_type | text | | checkout.session.completed, etc. |
| mode | text | | payment, subscription |
| payment_status | text | | paid, unpaid |
| amount_total | numeric | | In smallest currency unit |
| currency | text | | |
| raw | jsonb | | Full webhook payload |
| created_at | timestamptz | now() | |

---

## app_billing_settings

**Status:** ✅ Exists (1 row)
**Description:** Singleton table (id=1) for global billing display settings.

### Columns (7)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | int PK | | Always 1 |
| monthly_display_price | numeric | | Display price for monthly |
| yearly_display_price | numeric | | Display price for yearly |
| currency_symbol | text | | e.g. "$" |
| updated_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## user_roles

**Status:** ✅ Exists (0 rows)
**Description:** Simple role assignment table.

### Columns (3)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| user_id | uuid PK | | FK → auth.users |
| role | text PK | | Composite PK |
| created_at | timestamptz | now() | |

---

## billing_history

**Status:** ✅ Exists (0 rows)
**Description:** Billing history records for company charges (subscriptions, credits, add-ons).

### Columns (7)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | gen_random_uuid() | |
| company_id | uuid | | FK → companies.id (ON DELETE CASCADE) |
| description | text | | Charge description |
| amount | numeric | | Charge amount |
| currency | text | 'USD' | Currency code |
| type | text | | `subscription`, `credits`, or `addon` |
| created_at | timestamptz | now() | |

### Constraints

- `type IN ('subscription','credits','addon')` — Enforced by CHECK constraint

### RLS

- **SELECT:** Users can read billing for companies they belong to (`company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())`)

---

## RPC Functions

### increment_ai_actions_used(p_company_id uuid)

**Returns:** void
**Security:** DEFINER (runs with owner privileges)

Atomically increments the AI usage counter for a company. If the monthly limit is exceeded, automatically deducts from purchased credit packs (oldest first from `ai_credits` table).

### recompute_profile_premium(p_user_id uuid)

**Returns:** void
**Security:** DEFINER (runs with owner privileges)

Recomputes the `plan` and `premium_until` fields on `profiles` based on the user's Stripe subscription status. Sets plan to `premium` if subscription is active/trialing/past_due with a valid period end, otherwise resets to `free`.

---

## Cross-Module Linkage

### Billing → Profiles
- `profiles.plan` stores the user's current plan tier
- `profiles.stripe_customer_id` links to Stripe
- `profiles.stripe_subscription_status` reflects current status

### Billing → Companies
- `company_subscriptions` links companies to plans
- Company plan level can gate access to modules (via `company_modules`)

### Billing → Stripe
- `billing_payment_events` logs all Stripe webhook events
- Webhook handler updates `profiles` fields on payment success
