# Namecard Module (Business Cards, NFC, Contacts)

> Auto-generated from Supabase database on 2025-07-21
> 8 tables | All verified ✅ in live DB

---

## Table of Contents

- [business_cards](#business_cards) — 11 rows
- [card_fields](#card_fields) — 10 rows
- [card_links](#card_links) — 4 rows
- [card_experiences](#card_experiences) — 3 rows
- [card_shares](#card_shares) — 252 rows
- [nfc_cards](#nfc_cards) — 101 rows
- [nfc_card_intake_batches](#nfc_card_intake_batches) — 0 rows
- [nfc_tap_logs](#nfc_tap_logs) — 38 rows

---

## business_cards

**Status:** ✅ Exists (11 rows)
**FKs:** user_id → auth.users, company_id → companies.id (nullable)

### Columns (17)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| user_id | uuid | | FK → auth.users |
| card_name | text | 'My Card' | |
| is_default | boolean | | |
| full_name | text | | |
| title | text | | |
| company | text | | Text label |
| bio | text | | |
| slug | text | | URL-safe unique identifier |
| background_pattern | text | | |
| background_color | text | | |
| template | text | | Template variant |
| company_id | uuid | | FK → companies.id (nullable) |
| is_company_profile | boolean | | |
| background_image_url | text | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Constraints

- `PK(id)`, `UNIQUE(slug)`

### RLS

- SELECT: public (anyone can view cards by slug)
- INSERT/UPDATE/DELETE: `auth.uid() = user_id`

### Referenced By

| Table | Column |
|-------|--------|
| card_fields | card_id |
| card_links | card_id |
| card_experiences | card_id |
| card_shares | card_id |
| nfc_cards | linked_card_id |

---

## card_fields

**Status:** ✅ Exists (10 rows)

### Columns (8)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| card_id | uuid | | FK → business_cards.id |
| field_type | text | | e.g. phone, email, address |
| field_label | text | | |
| field_value | text | | |
| visibility | text | 'public' | public, private, connections_only |
| sort_order | int | | |
| created_at | timestamptz | now() | |

---

## card_links

**Status:** ✅ Exists (4 rows)

### Columns (7)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| card_id | uuid | | FK → business_cards.id |
| label | text | | |
| url | text | | |
| icon | text | 'link' | |
| sort_order | int | | |
| created_at | timestamptz | now() | |

---

## card_experiences

**Status:** ✅ Exists (3 rows)

### Columns (9)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| card_id | uuid | | FK → business_cards.id |
| role | text | | |
| company | text | | |
| start_date | text | | |
| end_date | text | | |
| description | text | | |
| sort_order | int | | |
| created_at | timestamptz | now() | |

---

## card_shares

**Status:** ✅ Exists (252 rows)

### Columns (6)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| card_id | uuid | | FK → business_cards.id |
| viewed_by_user_id | uuid | | Nullable — anonymous views |
| share_method | text | | qr, nfc, link, etc. |
| viewer_ip | text | | |
| shared_at | timestamptz | now() | |

---

## nfc_cards

**Status:** ✅ Exists (101 rows)
**FKs:** owner_id → auth.users, linked_card_id → business_cards.id, company_id → companies.id

### Columns (25)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| nfc_uid | text | | Unique NFC chip identifier |
| chip_serial | text | | |
| owner_id | uuid | | FK → auth.users |
| linked_card_id | uuid | | FK → business_cards.id |
| status | text | 'unregistered' | unregistered, active, deactivated |
| subscription_tier | text | | |
| subscription_expires_at | timestamptz | | |
| total_taps | int | 0 | |
| intake_batch_id | uuid | | FK → nfc_card_intake_batches.id |
| source | text | 'admin_intake' | admin_intake, user_register, etc. |
| premium_duration_months | int | 36 | |
| company_id | uuid | | FK → companies.id |
| *(+ 12 more metadata cols)* | | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Constraints

- `PK(id)`, `UNIQUE(nfc_uid)`

---

## nfc_card_intake_batches

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (13)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| quantity | int | | |
| total_amount | numeric | | |
| currency | text | 'HKD' | |
| supplier_name | text | | |
| purchase_order_no | text | | |
| received_at | timestamptz | | |
| notes | text | | |
| status | text | | received, etc. |
| created_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## nfc_tap_logs

**Status:** ✅ Exists (38 rows)
**FK:** nfc_card_id → nfc_cards.id

### Columns (10)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| nfc_card_id | uuid | | FK → nfc_cards.id |
| nfc_uid | text | | Denormalized for fast lookup |
| tapper_user_id | uuid | | Nullable |
| ip_address | text | | |
| user_agent | text | | |
| country | text | | |
| city | text | | |
| referer | text | | |
| tapped_at | timestamptz | now() | |

### Cross-Module Linkage

- `nfc_cards.linked_card_id` → `business_cards.id` (links physical NFC to digital card)
- `nfc_cards.company_id` → `companies.id` (for company-owned NFC cards)
- `card_shares` tracks all card views including NFC taps
