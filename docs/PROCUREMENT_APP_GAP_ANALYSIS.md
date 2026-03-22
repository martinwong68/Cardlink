# Procurement & Accounting Gap Analysis for SMC

> **Reference Systems:** ERPNext (open-source), Odoo (open-source), SAP Business One, Microsoft Dynamics 365 Business Central
>
> **Target:** Confirm whether Cardlink is comprehensive enough to handle all accounting and procurement needs for a **Small and Medium Company (SMC)**.
>
> **Date:** 2026-03-22

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | **Exists** — Feature is fully implemented in Cardlink |
| ⚠️ | **Partial** — Feature exists but incomplete or limited |
| ❌ | **Missing** — Feature is not implemented |

---

## Part 1: Function List — Procurement Module

### 1.1 Supplier / Vendor Management

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Supplier master data (name, contact, address) | ✅ | `proc_suppliers` table with name, contact, phone, company_id |
| 2 | Supplier categorization / grouping | ❌ | No category or group field on suppliers |
| 3 | Supplier performance tracking / scorecard | ❌ | No delivery performance, quality, or lead-time metrics |
| 4 | Supplier payment terms management | ❌ | No payment_terms field on supplier record |
| 5 | Supplier tax ID / registration | ❌ | Not on supplier record (exists on company_profiles) |
| 6 | Supplier bank account details | ❌ | No bank details linked to suppliers |
| 7 | Supplier price lists (per product) | ❌ | No supplier pricing / price-list table |
| 8 | Multiple contacts per supplier | ❌ | Only single contact_name + phone per supplier |
| 9 | Supplier portal (self-service) | ❌ | Not applicable for current MVP scope |
| 10 | Supplier contract management | ✅ | `proc_contracts` table with status, dates, value, terms |

### 1.2 Purchase Requisition / Request

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Purchase request creation | ✅ | `proc_purchase_requests` table, API `/api/procurement/requests` |
| 2 | PR number auto-generation | ✅ | `pr_number` field exists |
| 3 | Priority levels (low, normal, high, urgent) | ✅ | `priority` enum field |
| 4 | Multi-level approval workflow | ⚠️ | Single `approved_by` / `approved_at` — no multi-level chain |
| 5 | Budget check at requisition | ❌ | No budget module or budget-limit validation |
| 6 | Estimated cost tracking | ✅ | `estimated_cost` field exists |
| 7 | Status flow (draft → pending → approved → rejected → cancelled) | ✅ | Full status enum |
| 8 | Convert approved PR → Purchase Order | ❌ | No automated PR-to-PO conversion workflow |
| 9 | Attach supporting documents to PR | ❌ | No document attachment on purchase requests |
| 10 | Requested delivery date | ❌ | No `needed_by` or requested delivery date field |

### 1.3 Request for Quotation (RFQ)

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Send RFQ to multiple suppliers | ⚠️ | `proc_purchase_requests` acts as RFQ but no multi-supplier quoting |
| 2 | Supplier quotation submission & tracking | ❌ | No `supplier_quotation` table |
| 3 | Quotation comparison matrix | ❌ | No comparison or scoring feature |
| 4 | Auto-select best quotation | ❌ | Not implemented |
| 5 | Convert quotation → Purchase Order | ❌ | Not implemented |

### 1.4 Purchase Order Management

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | PO creation with line items | ✅ | `proc_purchase_orders` + `proc_purchase_order_items` |
| 2 | PO number auto-generation | ✅ | `po_number` field |
| 3 | PO status workflow (draft → submitted → received) | ✅ | Status flow implemented |
| 4 | Link PO to supplier | ✅ | `supplier_id` FK → `proc_suppliers` |
| 5 | Line items link to inventory products | ✅ | `product_id` FK → `inv_products` |
| 6 | Unit cost and quantity per line | ✅ | `qty` and `unit_cost` fields |
| 7 | Expected delivery date | ✅ | `expected_delivery` field on PO |
| 8 | PO total calculation | ⚠️ | No `total_amount` stored on PO (must be computed from items) |
| 9 | PO amendment / version tracking | ❌ | No versioning or amendment history |
| 10 | PO terms and conditions | ❌ | No terms field on PO (exists on contracts) |
| 11 | Tax calculation on PO | ❌ | No tax fields on PO or PO items |
| 12 | Discount on PO line items | ❌ | No discount field |
| 13 | PO approval workflow | ❌ | No approval fields on PO (auto-submittable) |
| 14 | PO cancellation with reason | ⚠️ | Cancelled status exists but no cancellation reason field |
| 15 | Partial receipt against PO | ⚠️ | `partial` status exists but tracking per-line partial qty unclear |
| 16 | PO printing / PDF export | ❌ | No print/export feature |

### 1.5 Goods Receipt / Purchase Receipt

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Receive goods against PO | ✅ | `proc_receipts` + `proc_receipt_items` tables |
| 2 | Receipt creates inventory stock-in movement | ✅ | `process_procurement_receipt()` DB function |
| 3 | Received quantity tracking | ✅ | `received_qty` on receipt items |
| 4 | Receipt note / comments | ✅ | `note` field on receipt |
| 5 | Receipt timestamp | ✅ | `received_at` field |
| 6 | Received by user tracking | ✅ | `received_by` FK → auth.users |
| 7 | Idempotency (prevent duplicate receipts) | ✅ | `idempotency_key` field |
| 8 | Partial delivery receipt | ⚠️ | Receipt items can have partial qty; PO goes to `partial` status |
| 9 | Quality inspection on receipt | ❌ | No quality check or inspection workflow |
| 10 | Return to supplier (debit note) | ❌ | No return / debit note process |
| 11 | Receipt auto-generates accounting entry | ✅ | Debit Inventory (1400) / Credit AP (2100) journal entry |

### 1.6 Accounts Payable (Procurement Side)

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Supplier invoice management | ⚠️ | `invoices` table exists but not specifically linked to PO/receipt |
| 2 | 3-way match (PO ↔ Receipt ↔ Invoice) | ❌ | No matching process |
| 3 | Payment scheduling / due date tracking | ⚠️ | `due_date` on invoices exists; no payment scheduling engine |
| 4 | Supplier payment processing | ❌ | No supplier payment workflow |
| 5 | Supplier aging report (AP aging) | ❌ | No AP aging report |
| 6 | Withholding tax on supplier payments | ❌ | Not implemented |
| 7 | Early payment discount tracking | ❌ | Not implemented |

---

## Part 2: Function List — Inventory Module

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Product master data (SKU, name, unit) | ✅ | `inv_products` table |
| 2 | Real-time stock balances | ✅ | `inv_stock_balances` with `on_hand` qty |
| 3 | Stock movements (in, out, adjust) | ✅ | `inv_stock_movements` with full audit trail |
| 4 | Movement reference tracking (PO, POS order) | ✅ | `reference_type` + `reference_id` fields |
| 5 | Barcode scanning | ✅ | `@zxing/browser` integrated for barcode scanning |
| 6 | Multi-warehouse support | ❌ | No warehouse or location concept; single stock pool per company |
| 7 | Bin / shelf location tracking | ❌ | No bin/rack/shelf tracking |
| 8 | Reorder point / minimum stock level | ❌ | No reorder point or minimum stock field |
| 9 | Auto-reorder (generate PO on low stock) | ❌ | No auto-reorder trigger |
| 10 | Stock valuation (FIFO, LIFO, avg cost) | ❌ | No valuation method; unit_cost is per-PO-item only |
| 11 | Batch / lot tracking | ❌ | No batch or lot number fields |
| 12 | Serial number tracking | ❌ | No serial number support |
| 13 | Expiry date tracking | ❌ | No expiry date on products |
| 14 | Cycle count / stock audit | ❌ | No stock count or audit workflow |
| 15 | Stock transfer between locations | ❌ | N/A — single warehouse model |
| 16 | Landed cost allocation | ❌ | Not implemented |
| 17 | Low stock alerts | ✅ | AI rule engine monitors low stock and sends notifications |
| 18 | Inventory reporting / turnover analysis | ⚠️ | Movement data available; no built-in turnover reports |
| 19 | Product categories | ⚠️ | `store_categories` exists for e-commerce but not for core inventory |
| 20 | Unit of measure conversion | ❌ | Single `unit` field; no UoM conversion table |

---

## Part 3: Function List — Accounting Module

### 3.1 General Ledger & Chart of Accounts

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Chart of Accounts (hierarchical) | ✅ | `accounts` table with `parent_id` tree structure |
| 2 | Account types (asset, liability, equity, revenue, expense) | ✅ | Full type enum |
| 3 | Account codes with uniqueness | ✅ | `code` field with org-level uniqueness |
| 4 | Standard accounts (Cash, AP, AR, Inventory, Revenue) | ✅ | 1100, 1400, 2100, 4100 predefined |
| 5 | Multi-currency support | ✅ | `currencies` table with exchange rates |
| 6 | Journal entry (double-entry bookkeeping) | ✅ | `transactions` + `transaction_lines` (debit/credit) |
| 7 | Draft / posted / voided status | ✅ | Full status workflow |
| 8 | Transaction reference numbering | ✅ | `reference_number` field |
| 9 | Fiscal period management (open/close) | ❌ | No fiscal period table or period lock mechanism |
| 10 | Recurring journal entries | ❌ | No recurring entry template |
| 11 | Inter-company eliminations | ❌ | Not applicable for SMC (single entity) |
| 12 | Audit trail for all GL changes | ✅ | `audit_log` table tracking all changes with old/new values |
| 13 | Sub-ledger integration (AP, AR, inventory) | ✅ | Cross-module journal entries auto-created |

### 3.2 Accounts Receivable (AR)

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Customer invoicing | ✅ | `invoices` + `invoice_items` tables |
| 2 | Invoice numbering | ✅ | `invoice_number` field |
| 3 | Invoice status (draft → sent → paid → overdue) | ✅ | Full status workflow |
| 4 | Tax rate application on invoices | ✅ | `tax_rates` table linked to invoices |
| 5 | Invoice due date tracking | ✅ | `due_date` field |
| 6 | Payment recording (invoice paid → journal entry) | ✅ | Auto debit Cash (1100) / credit Sales Revenue (4100) |
| 7 | Overdue invoice tracking | ✅ | AI rule engine monitors overdue invoices |
| 8 | Customer credit limits | ❌ | No credit limit field on contacts |
| 9 | Dunning / collection reminders | ❌ | No automated dunning letter or reminder workflow |
| 10 | AR aging report | ❌ | No AR aging report |
| 11 | Partial payment tracking | ❌ | No partial payment concept; invoice is fully paid or not |
| 12 | Credit notes / refunds | ❌ | No credit note or refund process |
| 13 | Recurring invoices | ❌ | No recurring invoice template |

### 3.3 Accounts Payable (AP)

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Supplier invoice recording | ⚠️ | Invoices exist but vendor-type invoice flow is limited |
| 2 | AP journal entries on receipt | ✅ | Auto debit Inventory (1400) / credit AP (2100) |
| 3 | Payment processing to suppliers | ❌ | No supplier payment workflow |
| 4 | AP aging report | ❌ | Not implemented |
| 5 | 3-way match (PO ↔ GRN ↔ Invoice) | ❌ | Not implemented |
| 6 | Debit notes | ❌ | Not implemented |
| 7 | Supplier advance payments | ❌ | Not implemented |

### 3.4 Tax Management

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Tax rate definitions | ✅ | `tax_rates` table with name, rate, region |
| 2 | Tax on invoices | ✅ | Tax applied on invoice items |
| 3 | GST / VAT / Sales tax support | ✅ | Configurable tax rates by type |
| 4 | Tax on purchase orders | ❌ | No tax fields on PO items |
| 5 | Tax reporting (GST return, VAT return) | ❌ | No tax summary or filing report |
| 6 | Withholding tax | ❌ | Not implemented |
| 7 | Tax ID on company profile | ✅ | `tax_id` on organizations and company_profiles |

### 3.5 Financial Reporting

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Balance Sheet | ⚠️ | Reports page exists; report generation capability present |
| 2 | Profit & Loss Statement | ⚠️ | Reports page exists; report generation capability present |
| 3 | Cash Flow Statement | ❌ | No cash flow report |
| 4 | Trial Balance | ❌ | No trial balance report |
| 5 | General Ledger detail report | ❌ | No GL drill-down report |
| 6 | Accounts Receivable aging | ❌ | Not implemented |
| 7 | Accounts Payable aging | ❌ | Not implemented |
| 8 | Custom financial statements | ❌ | No report builder |
| 9 | Report export (PDF / Excel) | ❌ | No export feature |
| 10 | Dashboard with KPIs | ✅ | Accounting dashboard at `/business/accounting/dashboard` |
| 11 | Real-time analytics | ⚠️ | Charts via Recharts; limited built-in analytics |

### 3.6 Payroll

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Employee payroll records | ✅ | `payroll_records` (accounting) + `hr_payroll` (HR) |
| 2 | Gross salary, deductions, net salary | ✅ | Fields exist on payroll records |
| 3 | Payroll period tracking | ✅ | `period_start`, `period_end` fields |
| 4 | Payroll approval workflow (draft → approved → paid) | ✅ | Full status workflow |
| 5 | Bank details for salary transfer | ⚠️ | `bank_details` field exists with encryption support |
| 6 | Payroll → accounting journal entry | ⚠️ | Salary expense entries mentioned but integration not fully automated |
| 7 | Statutory deductions (EPF, SOCSO, tax) | ❌ | No statutory deduction breakdown |
| 8 | Payslip generation / printing | ❌ | No payslip template or PDF generation |
| 9 | Year-end tax forms (EA, CP8D equivalent) | ❌ | No tax form generation |

### 3.7 Bank & Cash Management

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Bank account tracking | ✅ | `company_bank_accounts` table |
| 2 | Bank feed / statement import | ✅ | `/api/accounting/bank-feed` API exists |
| 3 | Bank reconciliation | ⚠️ | AI rule engine monitors bank reconciliation; manual matching unclear |
| 4 | Cash account management | ✅ | Cash/Bank account (1100) in chart of accounts |
| 5 | Multi-bank account support | ✅ | Multiple bank accounts per company |
| 6 | Cash flow forecasting | ❌ | Not implemented |
| 7 | Petty cash management | ❌ | No petty cash workflow |

### 3.8 Fixed Asset Management

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Asset register | ❌ | No fixed asset table or tracking |
| 2 | Depreciation calculation | ❌ | Not implemented |
| 3 | Asset disposal | ❌ | Not implemented |
| 4 | Asset categories | ❌ | Not implemented |

### 3.9 Budgeting

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Budget creation by account/department | ❌ | No budget module |
| 2 | Budget vs. actual comparison | ❌ | Not implemented |
| 3 | Budget approval workflow | ❌ | Not implemented |
| 4 | Budget alerts on overspend | ❌ | Not implemented |

### 3.10 Document Management

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Document attachment to records | ✅ | `documents` table (polymorphic) |
| 2 | OCR text extraction | ✅ | `ocr_text` field on documents |
| 3 | Document types (invoices, contracts, receipts) | ✅ | `related_type` field |
| 4 | Document search | ⚠️ | OCR text available for search; no dedicated search UI |

---

## Part 4: Function List — Supporting Modules

### 4.1 CRM (Customer Relationship Management)

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Lead management | ✅ | `crm_leads` table |
| 2 | Deal / opportunity pipeline | ✅ | `crm_deals` table |
| 3 | Contact management | ✅ | `crm_contacts` table |
| 4 | Activity tracking (tasks, calls, emails) | ✅ | `crm_activities` table |
| 5 | Marketing campaigns | ✅ | `crm_campaigns` table |
| 6 | Contact notes | ✅ | `crm_notes` table |

### 4.2 Human Resources (HR)

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Employee master | ✅ | `hr_employees` table |
| 2 | Leave management with approval | ✅ | `hr_leave_requests` table |
| 3 | Attendance tracking | ✅ | `hr_attendance` table |
| 4 | Payroll management | ✅ | `hr_payroll` table |
| 5 | Employment types (full-time, part-time, contract) | ✅ | Enum field |
| 6 | Department tracking | ✅ | `department` field |
| 7 | Performance reviews | ❌ | No performance appraisal module |
| 8 | Training management | ❌ | Not implemented |
| 9 | Employee self-service portal | ❌ | Not implemented |

### 4.3 Point of Sale (POS) & E-commerce

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | POS registers | ✅ | `pos_registers` table |
| 2 | POS product catalog | ✅ | `pos_products` with link to inventory |
| 3 | Shift management | ✅ | `pos_shifts` table |
| 4 | Order processing | ✅ | `pos_orders` + `pos_order_items` |
| 5 | Payment processing (Stripe, cash) | ✅ | `pos_payment_operations` + Stripe integration |
| 6 | POS → inventory deduction | ✅ | Auto-deducts stock on order completion |
| 7 | POS → accounting journal entry | ✅ | Auto debit Cash (1100) / credit Sales Revenue (4100) |
| 8 | Online store / e-commerce | ✅ | `store_settings`, `store_products`, `store_categories` |
| 9 | Discount management | ✅ | `store_discounts` table |
| 10 | Webhook payment verification | ✅ | `pos_payment_webhook_events` |

### 4.4 Booking & Services

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Service definitions | ✅ | `booking_services` table |
| 2 | Availability management | ✅ | `booking_availability` table |
| 3 | Appointment booking | ✅ | `booking_appointments` table |

### 4.5 Platform & Admin

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Role-based access control | ✅ | `company_members` with roles + RLS policies |
| 2 | API key management | ✅ | `company_api_keys` table |
| 3 | Audit logging | ✅ | Multi-level: `audit_log`, `company_audit_logs`, `admin_audit_logs` |
| 4 | Security settings | ✅ | `company_security_settings` table |
| 5 | Module enablement per company | ✅ | `company_modules` table |
| 6 | Two-person approval for admin | ✅ | `admin_action_approvals` table |
| 7 | Notification system | ✅ | `business_notifications` with module/entity linking |
| 8 | Multi-language (i18n) | ✅ | `next-intl` integration |
| 9 | AI-powered insights | ✅ | `ai_action_cards`, `ai_conversations`, rule engine |
| 10 | Subscription / billing management | ✅ | Full Stripe integration with plans |

---

## Part 5: Workflow Coverage

### 5.1 Procure-to-Pay (P2P) Workflow

| Step | Description | Cardlink Status | Notes |
|------|-------------|----------------|-------|
| 1 | Requirement identification | ✅ | Purchase request creation |
| 2 | Purchase requisition with approval | ✅ | `proc_purchase_requests` with approval |
| 3 | Supplier selection & RFQ | ⚠️ | RFQ exists but no multi-supplier quoting or comparison |
| 4 | Purchase order issuance | ✅ | Full PO management |
| 5 | Goods receipt (GRN) | ✅ | Receipt with auto inventory movement |
| 6 | Invoice receipt & matching | ❌ | No PO-to-invoice matching (3-way match) |
| 7 | Payment processing to supplier | ❌ | No AP payment workflow |
| 8 | Document archiving | ✅ | Document management with OCR |

**P2P Coverage: ~60%** — Strong on requisition through receipt; weak on invoice matching and payment.

### 5.2 Order-to-Cash (O2C) Workflow

| Step | Description | Cardlink Status | Notes |
|------|-------------|----------------|-------|
| 1 | Receive customer order | ✅ | POS orders + store orders |
| 2 | Order validation | ✅ | POS checkout flow with validation |
| 3 | Order fulfillment (pick, pack, ship) | ⚠️ | POS immediate fulfillment; no pick/pack/ship workflow |
| 4 | Generate & send invoice | ✅ | Invoice creation |
| 5 | Receive payment | ✅ | Stripe + cash payment processing |
| 6 | Apply payment & reconcile | ⚠️ | Payment auto-creates journal entry; reconciliation is basic |
| 7 | Collections (overdue management) | ⚠️ | Overdue tracking via AI alerts; no dunning letters |

**O2C Coverage: ~70%** — Good for POS/retail flow; weaker on B2B order management and collections.

### 5.3 Hire-to-Retire (H2R) Workflow

| Step | Description | Cardlink Status | Notes |
|------|-------------|----------------|-------|
| 1 | Recruitment & hiring | ❌ | No recruitment module |
| 2 | Onboarding | ⚠️ | Employee record creation; no onboarding checklist |
| 3 | Core HR (attendance, leave, payroll) | ✅ | All three implemented |
| 4 | Performance management | ❌ | No appraisal module |
| 5 | Employee development / training | ❌ | Not implemented |
| 6 | Transfers / role changes | ⚠️ | Can update employee record; no formal transfer workflow |
| 7 | Offboarding / termination | ⚠️ | `terminated` status exists; no offboarding checklist |

**H2R Coverage: ~40%** — Core HR (attendance, leave, payroll) is solid; lifecycle management is limited.

### 5.4 Record-to-Report (R2R) Workflow

| Step | Description | Cardlink Status | Notes |
|------|-------------|----------------|-------|
| 1 | Transaction recording | ✅ | Double-entry journal entries |
| 2 | Journal entry posting | ✅ | Draft → posted workflow |
| 3 | Period close activities | ❌ | No period closing or adjusting entries workflow |
| 4 | Financial consolidation | ❌ | Not needed for SMC (single entity) |
| 5 | Report preparation (P&L, BS, CF) | ⚠️ | Reports page exists; completeness unclear |
| 6 | Management review / disclosure | ⚠️ | Dashboard with KPIs; no formal approval or filing |

**R2R Coverage: ~45%** — Good on transaction recording; weak on period close and comprehensive reporting.

### 5.5 Inventory Management Workflow

| Step | Description | Cardlink Status | Notes |
|------|-------------|----------------|-------|
| 1 | Product master setup | ✅ | inv_products table |
| 2 | Stock receipt (from procurement) | ✅ | Auto stock-in on goods receipt |
| 3 | Stock issuance (from POS) | ✅ | Auto stock-out on POS sale |
| 4 | Manual adjustments | ✅ | Movement type `adjust` supported |
| 5 | Stock balance monitoring | ✅ | Real-time balances + low stock alerts |
| 6 | Reorder trigger | ❌ | No automatic reorder |
| 7 | Stock count / audit | ❌ | No cycle count workflow |
| 8 | Stock valuation for accounting | ❌ | No FIFO/LIFO/avg cost calculation |

**Inventory Coverage: ~55%** — Solid on movement tracking; weak on advanced management features.

---

## Part 6: Missing Functions Summary

### Critical Missing (High Priority for SMC Accounting)

These are **essential** for a complete SMC accounting solution:

| # | Missing Function | Module | Why Critical |
|---|-----------------|--------|-------------|
| 1 | **Accounts Payable aging report** | Accounting | Required to manage supplier payment obligations |
| 2 | **Accounts Receivable aging report** | Accounting | Required to manage customer collections |
| 3 | **Trial Balance report** | Accounting | Fundamental financial report for period-end |
| 4 | **Profit & Loss statement** (confirmed working) | Accounting | Core financial statement — verify completeness |
| 5 | **Balance Sheet** (confirmed working) | Accounting | Core financial statement — verify completeness |
| 6 | **3-way match (PO ↔ GRN ↔ Invoice)** | Procurement | Prevents overpayment; standard accounting control |
| 7 | **Supplier payment workflow** | AP | Need to track and process supplier payments |
| 8 | **Fiscal period management** | Accounting | Must be able to close months/years to prevent backdating |
| 9 | **Tax reporting (GST/VAT return)** | Tax | Required for statutory compliance |
| 10 | **Cash Flow Statement** | Reporting | One of the three essential financial statements |

### Important Missing (Medium Priority)

| # | Missing Function | Module | Business Value |
|---|-----------------|--------|---------------|
| 1 | Budget module (creation, tracking, variance) | Accounting | Spend control and planning |
| 2 | Fixed asset register & depreciation | Accounting | Track company assets and calculate depreciation |
| 3 | Credit notes / refunds | AR | Handle customer returns and adjustments |
| 4 | Partial payment tracking | AR | Track installment payments |
| 5 | Stock valuation (FIFO/avg cost) | Inventory | Required for accurate COGS calculation |
| 6 | Reorder point & auto-reorder | Inventory | Prevent stockouts automatically |
| 7 | Supplier payment terms | Procurement | Manage payment schedules |
| 8 | Tax on purchase orders | Procurement | Accurate cost calculation including tax |
| 9 | PR → PO conversion workflow | Procurement | Streamline procurement approval to ordering |
| 10 | Multi-level approval workflows | Procurement | Better spend control for larger SMCs |
| 11 | Recurring invoices | AR | Automate recurring billing |
| 12 | Recurring journal entries | Accounting | Automate monthly accruals/adjustments |
| 13 | Report export (PDF/Excel) | Reporting | Share and archive financial reports |
| 14 | Payslip generation | Payroll | Employee communication requirement |
| 15 | Statutory deductions (EPF, SOCSO, PCB) | Payroll | Required for Malaysian/HK/SG compliance |

### Nice-to-Have (Lower Priority for SMC)

| # | Missing Function | Module | Notes |
|---|-----------------|--------|-------|
| 1 | Multi-warehouse support | Inventory | Only needed if company has multiple locations |
| 2 | Batch / lot / serial tracking | Inventory | Needed for manufacturing or perishable goods |
| 3 | Supplier performance scorecard | Procurement | Nice for vendor evaluation |
| 4 | Supplier portal | Procurement | Useful but not essential for SMC |
| 5 | Quotation comparison matrix | RFQ | Nice for competitive sourcing |
| 6 | Cash flow forecasting | Banking | Useful for financial planning |
| 7 | Petty cash management | Banking | Common in Asian SMC operations |
| 8 | Dunning / collection letters | AR | Automation of payment reminders |
| 9 | Performance reviews | HR | Employee management improvement |
| 10 | Recruitment module | HR | Hiring workflow |

---

## Part 7: SMC Accounting Completeness Assessment

### Overall Score: ⭐⭐⭐½ out of 5 (70% complete for SMC accounting)

### What Cardlink Does Well ✅

1. **Double-entry bookkeeping** — Proper GL with debit/credit transaction lines
2. **Chart of Accounts** — Hierarchical with standard accounts predefined
3. **Cross-module integration** — Procurement receipt → Inventory → Accounting auto-journal entries; POS → Inventory → Accounting auto-journal entries
4. **Invoice management** — Full customer invoice lifecycle
5. **Multi-currency support** — Currency table with exchange rates
6. **Tax rate management** — Configurable tax rates by region
7. **Audit trail** — Comprehensive logging across all modules
8. **Payroll** — Basic payroll with approval workflow
9. **Bank feed** — Bank statement import capability
10. **AI-powered insights** — Proactive monitoring of overdue invoices, low stock, month-end tasks
11. **Document management with OCR** — Attach and search supporting documents

### What Needs Improvement ⚠️

1. **Financial reporting suite** — Need confirmed P&L, Balance Sheet, Trial Balance, Cash Flow
2. **Accounts Payable workflow** — AP journal entry exists but full payment cycle missing
3. **Bank reconciliation** — Needs more robust matching and clearing workflow
4. **Procurement-to-payment flow** — Need invoice matching and payment processing

### What Is Missing ❌

1. **Period closing** — Cannot lock fiscal periods
2. **Aging reports** (AR and AP) — Essential for cash management
3. **Budget management** — No budget tracking or variance analysis
4. **Fixed assets** — No asset register or depreciation
5. **Tax filing reports** — No GST/VAT return report
6. **Credit notes / refunds** — Cannot process customer returns
7. **3-way match** — Cannot prevent overpayment to suppliers

### Verdict

> **Cardlink is approximately 70% complete as an SMC accounting solution.** The foundation is strong — double-entry bookkeeping, chart of accounts, invoice management, cross-module integration (procurement ↔ inventory ↔ accounting), and comprehensive audit trails are all in place.
>
> **For a basic SMC** that needs invoicing, payroll, procurement, inventory, and POS with automatic journal entries, **Cardlink is functional today**.
>
> **To be fully production-ready** for professional SMC accounting, the top priorities are:
> 1. Complete the financial reporting suite (P&L, BS, Trial Balance, Cash Flow)
> 2. Add AP/AR aging reports
> 3. Implement fiscal period management
> 4. Add the PO → Invoice 3-way match
> 5. Implement supplier payment workflow
> 6. Add tax return / filing reports
>
> These improvements would bring Cardlink to **~90% parity** with professional SMC accounting tools like ERPNext or Odoo for small company needs.

---

## Part 8: Reference Open-Source Projects

| Project | URL | Relevance |
|---------|-----|-----------|
| **ERPNext** | https://github.com/frappe/erpnext | Full ERP with procurement, accounting, inventory, HR, CRM |
| **Odoo** | https://github.com/odoo/odoo | Modular ERP with strong procurement and accounting |
| **Akaunting** | https://github.com/akaunting/akaunting | Lightweight accounting for SMEs |
| **InvoicePlane** | https://github.com/InvoicePlane/InvoicePlane | Simple invoicing |
| **Crater** | https://github.com/crater-invoice/crater | Invoice management for SMEs |

---

*This analysis was generated by comparing Cardlink's implemented features against industry-standard ERP functionality from ERPNext, Odoo, SAP Business One, and Microsoft Dynamics 365 Business Central.*
