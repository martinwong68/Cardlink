# Commerce & POS Module (Orders, Payments, Store)

> Auto-generated from Supabase database on 2025-07-21
> 11 tables | All verified ✅ in live DB (currently 0 rows)

---

## Table of Contents

### POS Tables
- [pos_registers](#pos_registers) — 0 rows
- [pos_products](#pos_products) — 0 rows
- [pos_shifts](#pos_shifts) — 0 rows
- [pos_orders](#pos_orders) — 0 rows
- [pos_order_items](#pos_order_items) — 0 rows
- [pos_payment_operations](#pos_payment_operations) — 0 rows
- [pos_payment_webhook_events](#pos_payment_webhook_events) — 0 rows

### Online Store Tables
- [store_settings](#store_settings) — 0 rows
- [store_categories](#store_categories) — 0 rows
- [store_products](#store_products) — 0 rows
- [store_discounts](#store_discounts) — 0 rows

---

## pos_registers

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (7)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | Register name |
| location | text | | Physical location |
| is_active | boolean | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Referenced By

| Table | Column |
|-------|--------|
| pos_shifts | register_id |

---

## pos_products

**Status:** ✅ Exists (0 rows)
**FKs:** company_id → companies.id, inv_product_id → inv_products.id (nullable)

### Columns (14)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | |
| sku | text | | |
| barcode | text | | |
| category | text | | |
| price | numeric | | Selling price |
| cost | numeric | | Cost price |
| stock | int | | Local stock counter |
| image_url | text | | |
| is_active | boolean | | |
| inv_product_id | uuid | | FK → inv_products.id (optional inventory link) |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Cross-Module FK

- `inv_product_id` → `inv_products.id` (inventory module) — when set, POS sales auto-deduct inventory

### Referenced By

| Table | Column |
|-------|--------|
| pos_order_items | product_id |

---

## pos_shifts

**Status:** ✅ Exists (0 rows)
**FKs:** company_id → companies.id, register_id → pos_registers.id, user_id → auth.users

### Columns (13)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| register_id | uuid | | FK → pos_registers.id |
| user_id | uuid | | FK → auth.users (cashier) |
| status | text | 'open' | open, closed |
| opening_cash | numeric | | |
| closing_cash | numeric | | |
| expected_cash | numeric | | Calculated at close |
| variance | numeric | | Difference |
| notes | text | | |
| started_at | timestamptz | | |
| ended_at | timestamptz | | |
| created_at | timestamptz | now() | |

### Referenced By

| Table | Column |
|-------|--------|
| pos_orders | shift_id |

---

## pos_orders

**Status:** ✅ Exists (0 rows)
**FKs:** company_id → companies.id, shift_id → pos_shifts.id

### Columns (15)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| order_number | text | | Human-readable number |
| status | text | 'completed' | completed, voided, refunded |
| subtotal | numeric | | |
| tax_rate | numeric | | |
| tax | numeric | | |
| total | numeric | | |
| payment_method | text | 'cash' | cash, card, mobile, etc. |
| shift_id | uuid | | FK → pos_shifts.id |
| customer_name | text | | Optional |
| notes | text | | |
| created_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Referenced By

| Table | Column |
|-------|--------|
| pos_order_items | order_id |

---

## pos_order_items

**Status:** ✅ Exists (0 rows)
**FKs:** order_id → pos_orders.id, product_id → pos_products.id

### Columns (8)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| order_id | uuid | | FK → pos_orders.id |
| product_id | uuid | | FK → pos_products.id |
| product_name | text | | Denormalized for history |
| qty | int | | |
| unit_price | numeric | | |
| subtotal | numeric | | qty × unit_price |
| created_at | timestamptz | now() | |

---

## pos_payment_operations

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (15)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| order_id | uuid | | |
| amount | numeric | | |
| currency | text | | |
| state | text | | pending, completed, failed |
| operation_id | uuid | | |
| correlation_id | uuid | | |
| idempotency_key | text | | |
| provider | text | | stripe, cash, etc. |
| provider_event_id | text | | |
| occurred_at | timestamptz | | |
| created_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## pos_payment_webhook_events

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (12)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| provider | text | | |
| provider_event_id | text | | |
| event_type | text | | |
| operation_id | uuid | | |
| correlation_id | uuid | | |
| idempotency_key | text | | |
| occurred_at | timestamptz | | |
| payload | jsonb | | Raw webhook body |
| processed_at | timestamptz | | |
| created_at | timestamptz | now() | |

---

## store_settings

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id
**Description:** Online store configuration per company.

---

## store_categories

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id
**Description:** Product categories for the online store.

---

## store_products

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id
**Description:** Products listed in the online store.

---

## store_discounts

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id
**Description:** Discount codes/rules for the online store.

---

## Cross-Module Linkage

### POS → Inventory
- `pos_products.inv_product_id` → `inv_products.id`
- On POS order completion, API calls `record_inventory_movement(movement_type='out')` to deduct stock

### POS → Accounting
- `createPosOrderJournalEntry()` auto-creates journal entry on order completion:
  - **Debit:** Cash/Bank (1100)
  - **Credit:** Sales Revenue (4100)

### POS → Membership
- `membership_spend_transactions.reference_type = 'pos_order'` can track spend for loyalty
- `membership_points_ledger` can award points for POS purchases
