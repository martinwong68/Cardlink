# Inventory Module

> Auto-generated from Supabase database on 2025-07-21
> 3 tables | All verified ✅ in live DB (currently 0 rows — no products created yet)

---

## Table of Contents

- [inv_products](#inv_products) — 0 rows
- [inv_stock_balances](#inv_stock_balances) — 0 rows
- [inv_stock_movements](#inv_stock_movements) — 0 rows

---

## inv_products

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (8)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| sku | text | | Stock keeping unit |
| name | text | | Product name |
| unit | text | 'pcs' | Unit of measure |
| is_active | boolean | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

### Referenced By

| Table | Column | Module |
|-------|--------|--------|
| inv_stock_balances | product_id | inventory |
| inv_stock_movements | product_id | inventory |
| proc_purchase_order_items | product_id | procurement |
| proc_receipt_items | product_id | procurement |
| pos_products | inv_product_id | commerce-pos |
| inventory_items | — | accounting (separate system) |

---

## inv_stock_balances

**Status:** ✅ Exists (0 rows)
**FKs:** product_id → inv_products.id, company_id → companies.id

### Columns (4)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| product_id | uuid PK | | FK → inv_products.id |
| company_id | uuid PK | | FK → companies.id |
| on_hand | numeric | 0 | Current quantity in stock |
| updated_at | timestamptz | now() | |

### Constraints

- Composite PK (product_id, company_id)

### RLS

- `can_manage_company(company_id)` for all operations

---

## inv_stock_movements

**Status:** ✅ Exists (0 rows)
**FKs:** company_id → companies.id, product_id → inv_products.id

### Columns (14)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| product_id | uuid | | FK → inv_products.id |
| movement_type | text | | in, out, adjust |
| qty | numeric | | Positive or negative |
| reason | text | | |
| reference_type | text | | procurement_receipt, pos_order, manual, etc. |
| reference_id | text | | |
| operation_id | uuid | | Tracing |
| correlation_id | uuid | | Tracing |
| idempotency_key | text | | Prevents duplicates |
| created_by | uuid | | |
| occurred_at | timestamptz | | |
| created_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

---

## Database Functions

### `record_inventory_movement`

```sql
record_inventory_movement(
  p_company_id uuid,
  p_product_id uuid,
  p_movement_type text,
  p_qty numeric,
  p_reason text,
  p_reference_type text,
  p_reference_id text,
  p_created_by uuid,
  p_idempotency_key text,
  p_operation_id text,
  p_correlation_id text,
  p_occurred_at text
) → jsonb { movement_id, status, balance_on_hand }
```

**Description:** Records an inventory stock movement (in/out/adjust), atomically updates `inv_stock_balances.on_hand`, supports idempotency via `idempotency_key`.

**Called by:**
- Procurement receipts (via `process_procurement_receipt`)
- POS order completion (deducts stock)
- Manual adjustments from inventory UI

---

## Cross-Module Linkage

### Procurement → Inventory
- `proc_purchase_order_items.product_id` → `inv_products.id`
- `proc_receipt_items.product_id` → `inv_products.id`
- When goods are received (`process_procurement_receipt`), `inv_stock_movements` are created with `movement_type='in'` and `inv_stock_balances.on_hand` is incremented.

### POS → Inventory
- `pos_products.inv_product_id` → `inv_products.id` (optional link)
- When a POS order completes, the API calls `record_inventory_movement` with `movement_type='out'` to deduct stock.

### Accounting → Inventory
- `inventory_items` (accounting module) is a separate ledger-style tracker
- Cross-module integration creates journal entries (Debit Inventory 1400 / Credit AP 2100) when goods are received
