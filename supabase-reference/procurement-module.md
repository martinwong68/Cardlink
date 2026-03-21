# Procurement Module (Suppliers, POs, Receipts, RFQ)

> Auto-generated from Supabase database on 2025-07-21
> 7 tables | All verified ✅ in live DB (currently 0 rows)

---

## Table of Contents

- [proc_suppliers](#proc_suppliers) — 0 rows
- [proc_purchase_orders](#proc_purchase_orders) — 0 rows
- [proc_purchase_order_items](#proc_purchase_order_items) — 0 rows
- [proc_purchase_requests](#proc_purchase_requests) — 0 rows (RFQ)
- [proc_receipts](#proc_receipts) — 0 rows
- [proc_receipt_items](#proc_receipt_items) — 0 rows
- [proc_contracts](#proc_contracts) — 0 rows

---

## proc_suppliers

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (7)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | Supplier name |
| contact_name | text | | |
| contact_phone | text | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

### Referenced By

| Table | Column |
|-------|--------|
| proc_purchase_orders | supplier_id |
| proc_contracts | supplier_id |

---

## proc_purchase_orders

**Status:** ✅ Exists (0 rows)
**FKs:** company_id → companies.id, supplier_id → proc_suppliers.id

### Columns (13)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| supplier_id | uuid | | FK → proc_suppliers.id |
| po_number | text | | Human-readable PO number |
| status | text | | draft, ordered, partial, received, cancelled |
| ordered_at | timestamptz | | |
| expected_at | timestamptz | | Expected delivery date |
| idempotency_key | text | | |
| operation_id | uuid | | |
| correlation_id | uuid | | |
| created_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Constraints

- `UNIQUE(company_id, po_number)`

### RLS

- `can_manage_company(company_id)` for all operations

### Referenced By

| Table | Column |
|-------|--------|
| proc_purchase_order_items | po_id |
| proc_receipts | po_id |

---

## proc_purchase_order_items

**Status:** ✅ Exists (0 rows)
**FKs:** po_id → proc_purchase_orders.id, product_id → inv_products.id, company_id → companies.id

### Columns (6)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| po_id | uuid | | FK → proc_purchase_orders.id |
| product_id | uuid | | FK → inv_products.id |
| qty | numeric | | Ordered quantity |
| unit_cost | numeric | | Cost per unit |

### Cross-Module FK

- `product_id` → `inv_products.id` (inventory module)

---

## proc_purchase_requests

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id
**Description:** Purchase requests / RFQ (Request for Quotation) system.

### Columns (14)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| pr_number | text | | Auto-generated PR number |
| title | text | | Request title |
| description | text | | |
| status | text | 'draft' | draft, pending, approved, rejected, cancelled |
| priority | text | 'normal' | low, normal, high, urgent |
| requested_by | uuid | | FK → auth.users |
| approved_by | uuid | | FK → auth.users (set on approval) |
| approved_at | timestamptz | | |
| total_estimated | numeric | | Estimated total cost |
| notes | text | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

---

## proc_receipts

**Status:** ✅ Exists (0 rows)
**FKs:** po_id → proc_purchase_orders.id, company_id → companies.id

### Columns (10)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| po_id | uuid | | FK → proc_purchase_orders.id |
| idempotency_key | text | | Prevents duplicate processing |
| operation_id | uuid | | |
| correlation_id | uuid | | |
| received_at | timestamptz | | |
| received_by | uuid | | FK → auth.users |
| note | text | | |
| created_at | timestamptz | now() | |

### Referenced By

| Table | Column |
|-------|--------|
| proc_receipt_items | receipt_id |

---

## proc_receipt_items

**Status:** ✅ Exists (0 rows)
**FKs:** receipt_id → proc_receipts.id, po_item_id → proc_purchase_order_items.id, product_id → inv_products.id

### Columns (6)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| receipt_id | uuid | | FK → proc_receipts.id |
| po_item_id | uuid | | FK → proc_purchase_order_items.id |
| product_id | uuid | | FK → inv_products.id |
| qty | numeric | | Received quantity |
| created_at | timestamptz | now() | |

### Cross-Module FK

- `product_id` → `inv_products.id` (inventory module)

---

## proc_contracts

**Status:** ✅ Exists (0 rows)
**FKs:** company_id → companies.id, supplier_id → proc_suppliers.id

### Columns (14)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| supplier_id | uuid | | FK → proc_suppliers.id |
| title | text | | |
| contract_number | text | | |
| status | text | 'draft' | draft, active, expired, terminated |
| start_date | date | | |
| end_date | date | | |
| value | numeric | | Contract value |
| terms | text | | |
| notes | text | | |
| created_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## Database Functions

### `process_procurement_receipt`

```sql
process_procurement_receipt(
  p_company_id uuid,
  p_po_id uuid,
  p_received_by uuid,
  p_note text,
  p_idempotency_key text,
  p_operation_id text,
  p_correlation_id text,
  p_occurred_at text,
  p_items jsonb
) → jsonb { receipt_id, status, movement_count }
```

**Description:** Processes a goods receipt against a purchase order:
1. Validates the PO exists and is in correct status
2. Creates `proc_receipts` + `proc_receipt_items` records
3. Triggers `inv_stock_movements` for each received item
4. Updates PO status (partial → received)
5. Supports idempotency to prevent double-processing

---

## Cross-Module Linkage

### Procurement → Inventory
- `proc_purchase_order_items.product_id` → `inv_products.id`
- `proc_receipt_items.product_id` → `inv_products.id`
- `process_procurement_receipt` automatically calls `record_inventory_movement` for each item

### Procurement → Accounting
- When a receipt is processed, `createReceiptJournalEntry()` auto-creates:
  - **Debit:** Inventory Asset (1400)
  - **Credit:** Accounts Payable (2100)
- Journal entry amount = sum of (qty × unit_cost) from PO items
