# Accounting Module (Invoices, Transactions, Chart of Accounts)

> Auto-generated from Supabase database on 2025-07-21
> 12 tables | All verified ✅ in live DB
> Note: `organizations` table overlays `companies` (1:1 relationship, same ID)

---

## Table of Contents

- [organizations](#organizations) — 1 row
- [accounts](#accounts) — 0 rows (Chart of Accounts)
- [transactions](#transactions) — 0 rows (Journal Entries)
- [transaction_lines](#transaction_lines) — 0 rows
- [contacts](#contacts) — 0 rows (Accounting contacts)
- [invoices](#invoices) — 1 row
- [invoice_items](#invoice_items) — 1 row
- [tax_rates](#tax_rates) — 0 rows
- [currencies](#currencies) — 0 rows
- [documents](#documents) — 0 rows
- [payroll_records](#payroll_records) — 0 rows
- [inventory_items](#inventory_items) — 0 rows (Accounting inventory)
- [audit_log](#audit_log) — 1 row

---

## organizations

**Status:** ✅ Exists (1 row)
**Description:** 1:1 overlay on `companies`. `organizations.id = companies.id`. All accounting tables reference `org_id → organizations.id`.

### Columns (5)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | FK → companies.id (same value) |
| name | text | | |
| currency | text | 'USD' | Default currency |
| tax_id | text | | |
| created_at | timestamptz | now() | |

### RLS

- `can_read_accounting_org(id)` for SELECT
- `can_write_accounting_org(id)` for INSERT/UPDATE/DELETE

### Referenced By

| Table | Column |
|-------|--------|
| accounts | org_id |
| transactions | org_id |
| contacts | org_id |
| invoices | org_id |
| tax_rates | org_id |
| currencies | org_id |
| documents | org_id |
| payroll_records | org_id |
| inventory_items | org_id |
| audit_log | org_id |

---

## accounts

**Status:** ✅ Exists (0 rows)
**FK:** org_id → organizations.id, parent_id → accounts.id (self-ref)
**Description:** Chart of Accounts. Tree structure with parent-child relationships.

### Columns (8)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| org_id | uuid | | FK → organizations.id |
| code | text | | Account code (e.g. 1100, 4100) |
| name | text | | Account name |
| type | text | | asset, liability, equity, revenue, expense |
| parent_id | uuid | | FK → accounts.id (self-reference) |
| is_active | boolean | | |
| created_at | timestamptz | now() | |

### Constraints

- `UNIQUE(org_id, code)` — each org has unique account codes

### RLS

- `can_read_accounting_org(org_id)` for SELECT
- `can_write_accounting_org(org_id)` for INSERT/UPDATE/DELETE

### Referenced By

| Table | Column |
|-------|--------|
| transaction_lines | account_id |
| inventory_items | account_id |

### Standard Account Codes (used by cross-module integration)

| Code | Name | Type | Used By |
|------|------|------|---------|
| 1100 | Cash / Bank | asset | POS orders, invoice payments |
| 1400 | Inventory | asset | Procurement receipts |
| 2100 | Accounts Payable | liability | Procurement receipts |
| 4100 | Sales Revenue | revenue | POS orders, invoice payments |

---

## transactions

**Status:** ✅ Exists (0 rows)
**FK:** org_id → organizations.id
**Description:** Journal entries (double-entry bookkeeping).

### Columns (9)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| org_id | uuid | | FK → organizations.id |
| date | date | | Transaction date |
| description | text | | |
| reference_number | text | | |
| status | text | 'posted' | posted, draft, voided |
| created_by | uuid | | |
| idempotency_key | text | | Prevents duplicate entries |
| created_at | timestamptz | now() | |

### Constraints

- `UNIQUE(org_id, idempotency_key)` — prevents duplicate journal entries

### RLS

- `can_read_accounting_org(org_id)` for SELECT
- `can_write_accounting_org(org_id)` for INSERT/UPDATE/DELETE

### Referenced By

| Table | Column |
|-------|--------|
| transaction_lines | transaction_id |

---

## transaction_lines

**Status:** ✅ Exists (0 rows)
**FKs:** transaction_id → transactions.id, account_id → accounts.id

### Columns (8)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| transaction_id | uuid | | FK → transactions.id |
| account_id | uuid | | FK → accounts.id |
| debit | numeric | 0 | |
| credit | numeric | 0 | |
| currency | text | 'USD' | |
| exchange_rate | numeric | 1 | |
| description | text | | Line description |

### RLS

- Inherits from transaction's org_id via join

---

## contacts

**Status:** ✅ Exists (0 rows)
**FK:** org_id → organizations.id
**Description:** Accounting contacts (customers, vendors, employees). Separate from `crm_contacts`.

### Columns (9)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| org_id | uuid | | FK → organizations.id |
| name | text | | |
| email | text | | |
| phone | text | | |
| type | text | | customer, vendor, employee |
| address | text | | |
| tax_id | text | | |
| created_at | timestamptz | now() | |

### Referenced By

| Table | Column |
|-------|--------|
| payroll_records | employee_id |

---

## invoices

**Status:** ✅ Exists (1 row)
**FK:** org_id → organizations.id

### Columns (13)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| org_id | uuid | | FK → organizations.id |
| invoice_number | text | | |
| client_name | text | | |
| client_email | text | | |
| issue_date | date | | |
| due_date | date | | |
| status | text | | draft, sent, paid, overdue, cancelled |
| total | numeric | | |
| tax | numeric | 0 | |
| currency | text | | |
| notes | text | | |
| created_at | timestamptz | now() | |

### Constraints

- `UNIQUE(org_id, invoice_number)`

### RLS

- `can_read_accounting_org(org_id)` for SELECT
- `can_write_accounting_org(org_id)` for INSERT/UPDATE/DELETE

### Referenced By

| Table | Column |
|-------|--------|
| invoice_items | invoice_id |

---

## invoice_items

**Status:** ✅ Exists (1 row)
**FK:** invoice_id → invoices.id

### Columns (7)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| invoice_id | uuid | | FK → invoices.id |
| description | text | | |
| quantity | numeric | | |
| unit_price | numeric | | |
| tax_rate | numeric | 0 | |
| amount | numeric | | quantity × unit_price |

---

## tax_rates

**Status:** ✅ Exists (0 rows)
**FK:** org_id → organizations.id

### Columns (7)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| org_id | uuid | | FK → organizations.id |
| name | text | | e.g. "VAT 15%" |
| rate | numeric | | Percentage |
| region | text | | Applicable region |
| is_default | boolean | | |
| created_at | timestamptz | now() | |

---

## currencies

**Status:** ✅ Exists (0 rows)
**FK:** org_id → organizations.id

### Columns (7)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| org_id | uuid | | FK → organizations.id |
| code | text | | e.g. USD, HKD |
| name | text | | |
| symbol | text | | e.g. $, HK$ |
| exchange_rate | numeric | | |
| last_updated | timestamptz | | |

### Constraints

- `UNIQUE(org_id, code)`

---

## documents

**Status:** ✅ Exists (0 rows)
**FK:** org_id → organizations.id
**Description:** Polymorphic document store (receipts, invoices, contracts).

### Columns (8)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| org_id | uuid | | FK → organizations.id |
| related_type | text | | invoice, transaction, etc. |
| related_id | uuid | | Polymorphic FK |
| file_url | text | | |
| ocr_text | text | | OCR extracted text |
| uploaded_by | uuid | | |
| created_at | timestamptz | now() | |

---

## payroll_records

**Status:** ✅ Exists (0 rows)
**FKs:** org_id → organizations.id, employee_id → contacts.id

### Columns (12)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| org_id | uuid | | FK → organizations.id |
| employee_id | uuid | | FK → contacts.id (type=employee) |
| period_start | date | | |
| period_end | date | | |
| gross_salary | numeric | | |
| deductions | numeric | 0 | |
| net_salary | numeric | | |
| status | text | 'draft' | draft, approved, paid |
| encrypted_bank_details | text | | Encrypted |
| encrypted_salary_note | text | | Encrypted |
| created_at | timestamptz | now() | |

---

## inventory_items

**Status:** ✅ Exists (0 rows)
**FKs:** org_id → organizations.id, account_id → accounts.id
**Description:** Accounting-side inventory ledger (separate from inv_products/inv_stock_balances).

### Columns (9)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| org_id | uuid | | FK → organizations.id |
| name | text | | |
| sku | text | | |
| quantity | numeric | 0 | |
| unit_cost | numeric | 0 | |
| account_id | uuid | | FK → accounts.id (inventory account) |
| category | text | | |
| created_at | timestamptz | now() | |

### Constraints

- `UNIQUE(org_id, sku)`

---

## audit_log

**Status:** ✅ Exists (1 row)
**FK:** org_id → organizations.id

### Columns (9)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| org_id | uuid | | FK → organizations.id |
| user_id | uuid | | Who performed the action |
| action | text | | create, update, delete |
| table_name | text | | Affected table |
| record_id | uuid | | Affected record |
| old_values | jsonb | | Previous state |
| new_values | jsonb | | New state |
| created_at | timestamptz | now() | |

---

## RLS Security Functions

| Function | Scope | Description |
|----------|-------|-------------|
| `can_read_accounting_org(org_id)` | SELECT | Checks if current user can read accounting data for the org |
| `can_write_accounting_org(org_id)` | INSERT/UPDATE/DELETE | Checks if current user can modify accounting data |

Both functions verify that `auth.uid()` is an active member of the company that matches `organizations.id`.

---

## Cross-Module Linkage

### Accounting ↔ Companies (1:1 Overlay)
- `organizations.id = companies.id` — same UUID
- Creating a company should also create an organization record

### Invoice Paid → Journal Entry
- `createInvoicePaidJournalEntry()` auto-creates on invoice status → "paid":
  - **Debit:** Cash/Bank (1100) = invoice.total
  - **Credit:** Sales Revenue (4100) = invoice.total

### Procurement Receipt → Journal Entry
- `createReceiptJournalEntry()` auto-creates on goods receipt:
  - **Debit:** Inventory (1400) = total cost
  - **Credit:** Accounts Payable (2100) = total cost

### POS Order → Journal Entry
- `createPosOrderJournalEntry()` auto-creates on POS order completion:
  - **Debit:** Cash/Bank (1100) = order.total
  - **Credit:** Sales Revenue (4100) = order.total

### HR Payroll → Accounting
- `payroll_records.employee_id` → `contacts.id` (type=employee)
- Payroll processing can generate salary expense journal entries
