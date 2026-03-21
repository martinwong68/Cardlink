# Company Extended Module

> Auto-generated from Supabase database on 2025-07-21
> 7 tables | All verified ✅ in live DB (all currently 0 rows except company_offers: 2)

---

## Table of Contents

- [company_addresses](#company_addresses)
- [company_key_contacts](#company_key_contacts)
- [company_documents](#company_documents)
- [company_bank_accounts](#company_bank_accounts)
- [company_social_profiles](#company_social_profiles)
- [company_operating_hours](#company_operating_hours)
- [company_offers](#company_offers)

---

## company_addresses

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (12)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| label | text | | headquarters, branch, warehouse, mailing, billing, other |
| address_line_1 | text | | |
| address_line_2 | text | | |
| city | text | | |
| state_province | text | | |
| postal_code | text | | |
| country | text | 'US' | |
| is_primary | boolean | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

---

## company_key_contacts

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (10)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | |
| title | text | | |
| email | text | | |
| phone | text | | |
| is_primary | boolean | | |
| notes | text | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

---

## company_documents

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id, uploaded_by → auth.users

### Columns (12)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| doc_type | text | | business_license, tax_certificate, incorporation_cert, insurance, contract, id_proof, other |
| name | text | | |
| file_url | text | | |
| file_size | bigint | | |
| mime_type | text | | |
| expiry_date | date | | |
| notes | text | | |
| uploaded_by | uuid | | FK → auth.users |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

---

## company_bank_accounts

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (16)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| bank_name | text | | |
| account_name | text | | |
| account_number_last4 | text | | |
| account_number_hash | text | | Hashed for security |
| routing_number | text | | |
| swift_code | text | | |
| iban | text | | |
| currency | text | 'USD' | |
| account_type | text | 'checking' | checking, savings, business, other |
| is_primary | boolean | | |
| notes | text | | |
| created_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

---

## company_social_profiles

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (7)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| platform | text | | facebook, instagram, twitter, linkedin, youtube, tiktok, wechat, whatsapp, line, other |
| profile_url | text | | |
| handle | text | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Constraints

- `UNIQUE(company_id, platform)`

### RLS

- `can_manage_company(company_id)` for all operations

---

## company_operating_hours

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (8)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| day_of_week | int | | 0=Sunday, 6=Saturday |
| open_time | time | | |
| close_time | time | | |
| is_closed | boolean | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Constraints

- `UNIQUE(company_id, day_of_week)`

### RLS

- `can_manage_company(company_id)` for all operations

---

## company_offers

**Status:** ✅ Exists (2 rows)
**FK:** company_id → companies.id

### Columns (16)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| title | text | | |
| description | text | | |
| offer_type | text | 'discount' | |
| discount_type | text | | percentage, fixed, etc. |
| discount_value | numeric | | |
| points_cost | int | | Cost in loyalty points |
| start_at | timestamptz | | |
| end_at | timestamptz | | |
| usage_limit | int | | |
| per_member_limit | int | | |
| is_active | boolean | | |
| created_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for management
- Members can read active offers

### Cross-Module Linkage

- Referenced by `offer_redemptions` (membership module) via `offer_id`
- Enables membership loyalty programs to offer discounts
