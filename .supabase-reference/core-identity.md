# Core Identity Module

> Auto-generated from Supabase database on 2025-07-21
> Updated 2026-03-25 with Stripe Connect and visibility columns
> 3 tables | All verified ✅ in live DB

---

## Table of Contents

- [profiles](#profiles) — 10 rows
- [companies](#companies) — 5 rows
- [company_members](#company_members) — 13 rows

---

## profiles

**Status:** ✅ Exists (10 rows)
**Description:** User profiles linked 1:1 with auth.users. Stores personal info, subscription status, and active company context.

### Columns (22)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | — | FK → auth.users |
| email | text | — | |
| full_name | text | — | |
| avatar_url | text | — | |
| plan | text | 'free' | User subscription tier |
| stripe_customer_id | text | — | |
| stripe_subscription_id | text | — | |
| stripe_subscription_status | text | — | |
| stripe_subscription_current_period_end | timestamptz | — | |
| nfc_premium_until | timestamptz | — | |
| premium_until | timestamptz | — | |
| last_payment_at | timestamptz | — | |
| title | text | — | |
| company | text | — | Text label (not FK) |
| bio | text | — | |
| is_banned | boolean | false | |
| banned_at | timestamptz | — | |
| banned_reason | text | — | |
| is_master_user | boolean | false | Super-admin flag |
| business_active_company_id | uuid | — | FK → companies.id |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Constraints

- `PK(id)`
- `FK(id) → auth.users`
- `FK(business_active_company_id) → companies.id`

### RLS

- RLS is enabled
- Users can SELECT/UPDATE their own row (`auth.uid() = id`)
- Policy: `profiles_select` — authenticated users can read all profiles
- Policy: `profiles_update` — authenticated users can update own profile

### Foreign Keys (outgoing)

| Column | → Target |
|--------|----------|
| id | auth.users.id |
| business_active_company_id | companies.id |

### Referenced By

| Table | Column | Module |
|-------|--------|--------|
| business_cards | user_id | namecard |
| nfc_cards | owner_id | namecard |
| company_members | user_id | core-identity |
| connections | requester_id / receiver_id | community |
| posts | user_id | community |
| forum_posts | author_id | community |
| admin_users | user_id | admin |
| notifications | user_id | admin |
| billing_payment_events | user_id | billing |

---

## companies

**Status:** ✅ Exists (5 rows)
**Description:** Central company/business entity. Hub for all B2B modules — every module references this via `company_id`.

### Columns (35+)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | uuid_generate_v4() | |
| name | text | — | Required |
| slug | text | — | URL-safe identifier |
| description | text | — | |
| logo_url | text | — | |
| cover_url | text | — | |
| website_url | text | — | Legacy; prefer `website` |
| contact_email | text | — | Legacy; prefer `email` |
| contact_phone | text | — | Legacy; prefer `phone` |
| address | text | — | Legacy flat address |
| settings | jsonb | {} | Stores industry, plan, custom config |
| is_active | boolean | true | |
| created_by | uuid | — | FK → auth.users |
| profile_card_id | uuid | — | |
| profile_card_slug | text | — | |
| is_banned | boolean | false | |
| banned_at | timestamptz | — | |
| banned_reason | text | — | |
| deleted_at | timestamptz | — | Soft delete |
| deleted_reason | text | — | |
| business_type | text | — | sole_proprietorship, partnership, corporation, llc, nonprofit, cooperative, franchise, other |
| registration_number | text | — | |
| tax_id | text | — | |
| founded_date | date | — | |
| website | text | — | |
| email | text | — | |
| phone | text | — | |
| fax | text | — | |
| employee_count_range | text | — | 1, 2-10, 11-50, 51-200, 201-500, 501-1000, 1001+ |
| fiscal_year_end | text | — | |
| default_currency | text | 'USD' | |
| timezone | text | 'UTC' | |
| onboarding_completed | boolean | false | |
| stripe_connect_account_id | text | — | Stripe Connect Express account ID |
| stripe_connect_onboarding_complete | boolean | — | Connect onboarding status |
| stripe_connect_charges_enabled | boolean | — | Can receive payments |
| stripe_connect_payouts_enabled | boolean | — | Can receive payouts |
| community_enabled | boolean | false | Enable company community |
| community_visibility | text | 'public' | `public`, `all_users`, or `members_only` |
| store_visibility | text | 'public' | `public`, `all_users`, or `members_only` |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Constraints

- `PK(id)`
- `UNIQUE(slug)`

### RLS

- RLS is enabled
- `can_manage_company(id)` — for INSERT/UPDATE/DELETE
- SELECT: members of the company can read

### Foreign Keys (outgoing)

| Column | → Target |
|--------|----------|
| created_by | auth.users.id |

### Referenced By

Nearly every module references `companies.id` via `company_id`. Key tables:

| Table | Module |
|-------|--------|
| company_members | core-identity |
| company_addresses, company_key_contacts, company_documents, company_bank_accounts, company_social_profiles, company_operating_hours, company_offers | company-extended |
| business_cards, nfc_cards, nfc_card_intake_batches | namecard |
| membership_programs, membership_accounts, membership_transactions, membership_points_ledger, membership_spend_transactions | membership |
| inv_products, inv_stock_balances, inv_stock_movements | inventory |
| proc_suppliers, proc_purchase_orders, proc_purchase_order_items, proc_purchase_requests, proc_receipts, proc_contracts | procurement |
| pos_registers, pos_products, pos_shifts, pos_orders, pos_payment_operations, pos_payment_webhook_events | commerce-pos |
| crm_leads, crm_deals, crm_contacts, crm_activities, crm_campaigns | crm |
| organizations (1:1 overlay) | accounting |
| company_modules, company_security_settings, company_api_keys, company_audit_logs | admin |
| hr_employees | hr |
| booking_services | booking |
| store_settings, store_categories, store_products, store_discounts | commerce-pos |

---

## company_members

**Status:** ✅ Exists (13 rows)
**Description:** Junction table — links users to companies with roles and status. Composite PK (company_id, user_id).

### Columns (9)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| company_id | uuid PK | — | FK → companies.id |
| user_id | uuid PK | — | FK → auth.users |
| role | text | — | owner, admin, manager, member, etc. |
| status | text | 'active' | active, invited, suspended |
| invited_by | uuid | — | |
| invited_at | timestamptz | now() | |
| joined_at | timestamptz | — | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Constraints

- `PK(company_id, user_id)`
- `FK(company_id) → companies.id`
- `FK(user_id) → auth.users`

### RLS

- RLS is enabled
- `can_manage_company(company_id)` — for all operations
- Members can read other members of the same company

### Foreign Keys (outgoing)

| Column | → Target |
|--------|----------|
| company_id | companies.id |
| user_id | auth.users.id |

### Cross-Module Linkage

- Used by `can_manage_company()` RLS function to verify membership
- Referenced by `profiles.business_active_company_id` to determine active company context
- All B2B module APIs call `requireBusinessActiveCompanyContext()` which checks this table
