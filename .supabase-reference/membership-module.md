# Membership & Loyalty Module

> Auto-generated from Supabase database on 2025-07-21
> 8 tables | All verified ✅ in live DB

---

## Table of Contents

- [membership_programs](#membership_programs) — 3 rows
- [membership_tiers](#membership_tiers) — 3 rows
- [membership_accounts](#membership_accounts) — 8 rows
- [membership_transactions](#membership_transactions) — 0 rows
- [membership_points_ledger](#membership_points_ledger) — 2 rows
- [membership_bobo_point_ledger](#membership_bobo_point_ledger) — 0 rows
- [membership_spend_transactions](#membership_spend_transactions) — 0 rows
- [offer_redemptions](#offer_redemptions) — 3 rows

---

## membership_programs

**Status:** ✅ Exists (3 rows)
**FK:** company_id → companies.id

### Columns (11)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | Program name |
| description | text | | |
| points_label | text | 'points' | Custom name for points |
| points_expiry_policy | text | 'annual' | annual, never, etc. |
| points_expire_month | int | 12 | |
| points_expire_day | int | 31 | |
| is_active | boolean | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Referenced By

| Table | Column |
|-------|--------|
| membership_tiers | program_id |
| membership_accounts | program_id |

---

## membership_tiers

**Status:** ✅ Exists (3 rows)
**FK:** program_id → membership_programs.id

### Columns (11)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| program_id | uuid | | FK → membership_programs.id |
| name | text | | e.g. Silver, Gold, Platinum |
| rank | int | | Ordering (higher = better) |
| annual_fee | numeric | | |
| points_multiplier | numeric | 1 | |
| benefits | jsonb | | Array of benefit descriptions |
| is_active | boolean | | |
| required_spend_amount | numeric | 0 | Auto-upgrade threshold |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Referenced By

| Table | Column |
|-------|--------|
| membership_accounts | tier_id |

---

## membership_accounts

**Status:** ✅ Exists (8 rows)
**FKs:** company_id → companies.id, program_id → membership_programs.id, user_id → auth.users, tier_id → membership_tiers.id

### Columns (15)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| program_id | uuid | | FK → membership_programs.id |
| user_id | uuid | | FK → auth.users |
| tier_id | uuid | | FK → membership_tiers.id |
| member_code | text | | Unique member number |
| status | text | 'active' | active, expired, suspended |
| joined_at | timestamptz | | |
| expires_at | timestamptz | | |
| points_balance | int | 0 | Current points |
| lifetime_points | int | 0 | Total earned ever |
| total_spend_amount | numeric | 0 | Lifetime spend |
| metadata | jsonb | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Referenced By

| Table | Column |
|-------|--------|
| membership_transactions | membership_account_id |
| membership_points_ledger | account_id |
| membership_bobo_point_ledger | membership_account_id |
| membership_spend_transactions | account_id |
| offer_redemptions | account_id |

---

## membership_transactions

**Status:** ✅ Exists (0 rows)
**FKs:** membership_account_id → membership_accounts.id, company_id → companies.id

### Columns (12)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| membership_account_id | uuid | | FK → membership_accounts.id |
| company_id | uuid | | FK → companies.id |
| txn_type | text | | earn, redeem, refund, etc. |
| status | text | 'posted' | posted, reversed |
| amount | numeric | | |
| external_ref | text | | External reference |
| reversed_by_txn_id | uuid | | Self-reference for reversals |
| created_by_admin_user_id | uuid | | |
| reason | text | | |
| created_at | timestamptz | now() | |
| reversed_at | timestamptz | | |

---

## membership_points_ledger

**Status:** ✅ Exists (2 rows)
**FKs:** company_id → companies.id, account_id → membership_accounts.id

### Columns (11)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| account_id | uuid | | FK → membership_accounts.id |
| event_type | text | | earn, redeem, expire, adjust |
| points_delta | int | | Positive or negative |
| balance_after | int | | Running balance |
| reference_type | text | | What triggered this (pos_order, etc.) |
| reference_id | uuid | | |
| note | text | | |
| created_by | uuid | | |
| created_at | timestamptz | now() | |

---

## membership_bobo_point_ledger

**Status:** ✅ Exists (0 rows)
**FKs:** membership_account_id → membership_accounts.id, company_id → companies.id

### Columns (11)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| membership_account_id | uuid | | FK → membership_accounts.id |
| company_id | uuid | | FK → companies.id |
| txn_type | text | | earn, redeem |
| points | int | | |
| status | text | 'posted' | posted, reversed |
| reversed_by_ledger_id | uuid | | |
| created_by_admin_user_id | uuid | | |
| reason | text | | |
| created_at | timestamptz | now() | |
| reversed_at | timestamptz | | |

---

## membership_spend_transactions

**Status:** ✅ Exists (0 rows)
**FKs:** company_id → companies.id, account_id → membership_accounts.id, user_id → auth.users

### Columns (12)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| account_id | uuid | | FK → membership_accounts.id |
| user_id | uuid | | FK → auth.users |
| amount | numeric | | |
| currency | text | 'HKD' | |
| note | text | | |
| reference_type | text | | pos_order, invoice, etc. |
| reference_id | uuid | | |
| occurred_at | timestamptz | | |
| created_by | uuid | | |
| created_at | timestamptz | now() | |

---

## offer_redemptions

**Status:** ✅ Exists (3 rows)
**FKs:** offer_id → company_offers.id, account_id → membership_accounts.id, user_id → auth.users

### Columns (12)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| offer_id | uuid | | FK → company_offers.id (company-extended module) |
| account_id | uuid | | FK → membership_accounts.id |
| user_id | uuid | | FK → auth.users |
| redeemed_at | timestamptz | | |
| status | text | 'redeemed' | redeemed, confirmed, rejected |
| points_spent | int | | |
| discount_applied | numeric | | |
| metadata | jsonb | | |
| confirmed_by | uuid | | Admin who confirmed |
| confirmed_at | timestamptz | | |
| reject_reason | text | | |

### Cross-Module Linkage

- `offer_redemptions.offer_id` → `company_offers.id` (company-extended module)
- `membership_spend_transactions.reference_type` can be "pos_order" → links to POS module
- `membership_points_ledger.reference_type` can link to any module that awards points
- Points can be earned from POS purchases, membership spend tracking
