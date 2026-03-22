# Accounting Module — Professional SMC Gap Analysis

> **Date**: 2026-03-22
> **Scope**: Comprehensive comparison of Cardlink's accounting module against industry-standard professional accounting software for Small and Medium Companies (SMCs).
> **References**: GnuCash, Akaunting, ERPNext, Manager.io, Xero, and IFRS for SMEs standards.

---

## Table of Contents

1. [Function List — Complete Inventory](#1-function-list--complete-inventory)
2. [Workflow List — Standard Accounting Workflows](#2-workflow-list--standard-accounting-workflows)
3. [Current Status — What Cardlink Already Has](#3-current-status--what-cardlink-already-has)
4. [Missing Functions — Gap List](#4-missing-functions--gap-list)
5. [Verdict — Is the App Comprehensive Enough?](#5-verdict--is-the-app-comprehensive-enough)
6. [Prioritised Roadmap Recommendations](#6-prioritised-roadmap-recommendations)

---

## 1. Function List — Complete Inventory

Below is the full function list a professional accounting app should have for SMCs, based on open-source references (GnuCash, Akaunting, ERPNext, Manager.io) and industry standards.

### 1.1 General Ledger & Chart of Accounts

| # | Function | Description |
|---|----------|-------------|
| F-GL-01 | Chart of Accounts (CoA) management | Create, edit, deactivate accounts with codes and types |
| F-GL-02 | Account types (5 core) | Assets, Liabilities, Equity, Revenue, Expense |
| F-GL-03 | Sub-account hierarchy | Parent-child account relationships |
| F-GL-04 | Account descriptions | Optional description/notes per account |
| F-GL-05 | Default accounts | System-level default accounts (e.g., default cash, AR, AP, retained earnings) |
| F-GL-06 | Account opening balances | Import or set starting balances for migration |
| F-GL-07 | Account locking | Prevent edits to accounts used in closed periods |

### 1.2 Journal Entries & Transactions

| # | Function | Description |
|---|----------|-------------|
| F-JE-01 | Manual journal entries | Double-entry debit/credit transactions |
| F-JE-02 | Auto-generated entries | System creates entries from invoices, payments, payroll, etc. |
| F-JE-03 | Recurring journal entries | Scheduled/standing entries that post automatically |
| F-JE-04 | Reversing entries | Mark entries for auto-reversal in next period |
| F-JE-05 | Voiding entries | Void posted entries with audit trail |
| F-JE-06 | Adjusting entries | Period-end adjustments (accruals, deferrals, provisions) |
| F-JE-07 | Batch/bulk entry import | CSV/Excel import of multiple journal entries |
| F-JE-08 | Idempotent posting | Prevent duplicate entries on retry |
| F-JE-09 | Transaction search & filter | Search by date, account, reference, amount |
| F-JE-10 | Transaction attachments | Attach supporting documents to entries |

### 1.3 Accounts Receivable (AR)

| # | Function | Description |
|---|----------|-------------|
| F-AR-01 | Customer invoicing | Create and send invoices to customers |
| F-AR-02 | Invoice status lifecycle | Draft → Sent → Paid / Overdue |
| F-AR-03 | Recurring invoices | Auto-generate invoices on a schedule |
| F-AR-04 | Estimates / Quotes | Create estimates that convert to invoices |
| F-AR-05 | Credit notes | Issue credits against invoices |
| F-AR-06 | Payment recording | Record full or partial payments against invoices |
| F-AR-07 | Payment terms | Net 30, Net 60, 2/10 Net 30, etc. |
| F-AR-08 | AR aging report | Age receivables by 30/60/90/120+ days |
| F-AR-09 | Dunning / payment reminders | Automated reminders for overdue invoices |
| F-AR-10 | Customer statements | Generate customer account statements |
| F-AR-11 | Invoice discounts | Line-level and invoice-level discounts |
| F-AR-12 | Invoice email delivery | Send invoices via email directly from the app |
| F-AR-13 | Invoice PDF generation | Export invoices as professional PDF documents |
| F-AR-14 | Invoice templates | Multiple invoice layout templates |
| F-AR-15 | Customer credit limits | Set and enforce credit limits per customer |

### 1.4 Accounts Payable (AP)

| # | Function | Description |
|---|----------|-------------|
| F-AP-01 | Vendor bill entry | Enter bills received from vendors |
| F-AP-02 | Bill status lifecycle | Draft → Approved → Paid |
| F-AP-03 | Purchase order matching | 2-way or 3-way match (PO → Receipt → Bill) |
| F-AP-04 | Bill payment scheduling | Schedule payments by due date |
| F-AP-05 | Debit notes | Issue debit notes to vendors |
| F-AP-06 | AP aging report | Age payables by 30/60/90/120+ days |
| F-AP-07 | Vendor statements | Reconcile vendor accounts |
| F-AP-08 | Early payment discounts | Track and apply prompt-payment discounts |
| F-AP-09 | Expense claims / reimbursements | Employee expense submission and approval |

### 1.5 Banking & Reconciliation

| # | Function | Description |
|---|----------|-------------|
| F-BK-01 | Bank account management | Track multiple bank accounts |
| F-BK-02 | Bank feed integration | Auto-import transactions (Plaid, Open Banking, etc.) |
| F-BK-03 | Bank reconciliation | Match bank transactions to ledger entries |
| F-BK-04 | Manual bank statement import | CSV/OFX/QIF import for bank statements |
| F-BK-05 | Uncleared transaction tracking | Track deposits in transit, outstanding checks |
| F-BK-06 | Bank transfer between accounts | Record inter-account transfers |

### 1.6 Tax Management

| # | Function | Description |
|---|----------|-------------|
| F-TX-01 | Tax rate configuration | Define multiple tax rates (VAT, GST, Sales Tax) |
| F-TX-02 | Tax type categories | Distinguish between sales tax, VAT, GST, WHT, etc. |
| F-TX-03 | Default tax rate per org | Set one default rate for auto-application |
| F-TX-04 | Tax exemption rules | Exempt products/customers/regions from tax |
| F-TX-05 | Compound tax | Calculate tax on tax (e.g., provincial + federal) |
| F-TX-06 | Tax return preparation | Aggregate tax data for filing |
| F-TX-07 | Withholding tax | Track and report taxes withheld at source |
| F-TX-08 | Input tax credit (ITC) tracking | Track reclaimable tax paid on purchases |
| F-TX-09 | Tax audit trail | Log all tax calculations with source references |

### 1.7 Multi-Currency

| # | Function | Description |
|---|----------|-------------|
| F-MC-01 | Currency management | Define supported currencies with symbols |
| F-MC-02 | Exchange rate tracking | Store and update exchange rates |
| F-MC-03 | Multi-currency transactions | Record transactions in foreign currencies |
| F-MC-04 | Auto exchange rate updates | Fetch live rates from an API |
| F-MC-05 | Exchange rate history | Keep historical rates for reference |
| F-MC-06 | Realised FX gain/loss | Calculate gain/loss on settlement |
| F-MC-07 | Unrealised FX gain/loss | Revalue open balances at period-end |
| F-MC-08 | Base currency reporting | Consolidate reports in home currency |

### 1.8 Financial Reporting

| # | Function | Description |
|---|----------|-------------|
| F-RP-01 | Trial Balance | List all account balances with debit/credit totals |
| F-RP-02 | Profit & Loss (Income Statement) | Revenue minus expenses for a period |
| F-RP-03 | Balance Sheet | Assets = Liabilities + Equity at a point in time |
| F-RP-04 | Cash Flow Statement | Cash inflows/outflows by operating/investing/financing |
| F-RP-05 | Comparative reports | Period-over-period comparison (this year vs last year) |
| F-RP-06 | AR aging report | Receivables aged by due date |
| F-RP-07 | AP aging report | Payables aged by due date |
| F-RP-08 | General ledger detail | Transaction-level detail per account |
| F-RP-09 | Tax summary report | Tax collected vs paid for filing |
| F-RP-10 | Custom report builder | User-defined reports with filters |
| F-RP-11 | Report export (PDF/Excel/CSV) | Export reports in multiple formats |
| F-RP-12 | Scheduled report generation | Auto-generate and email reports on schedule |
| F-RP-13 | Cost centre / department reports | Report by department or project |

### 1.9 Budgeting & Forecasting

| # | Function | Description |
|---|----------|-------------|
| F-BG-01 | Budget creation | Create budgets by account and period |
| F-BG-02 | Budget vs actual reports | Variance analysis (actual vs budgeted) |
| F-BG-03 | Rolling forecasts | Forward-looking projections |
| F-BG-04 | Department / project budgets | Budgets segmented by cost centre |

### 1.10 Fixed Assets

| # | Function | Description |
|---|----------|-------------|
| F-FA-01 | Asset register | Record assets with purchase date, cost, location |
| F-FA-02 | Depreciation schedules | Auto-calculate depreciation (straight-line, reducing, etc.) |
| F-FA-03 | Asset disposal | Record sale or write-off of assets |
| F-FA-04 | Depreciation journal entries | Auto-post monthly depreciation to GL |
| F-FA-05 | Asset revaluation | Record changes in asset fair value |

### 1.11 Payroll (Accounting Integration)

| # | Function | Description |
|---|----------|-------------|
| F-PY-01 | Payroll records | Record gross salary, deductions, net pay per employee |
| F-PY-02 | Tax deductions | Income tax, social security, statutory contributions |
| F-PY-03 | Allowances & benefits | Housing, transport, meal allowances |
| F-PY-04 | Payroll journal posting | Auto-create GL entries for payroll runs |
| F-PY-05 | Payslip generation | Generate and distribute payslips |
| F-PY-06 | Overtime & bonus calculation | Track and calculate variable pay |
| F-PY-07 | Statutory compliance reporting | Government-mandated payroll reports |
| F-PY-08 | Encrypted sensitive data | Encrypt bank details and salary information |

### 1.12 Inventory (Accounting Integration)

| # | Function | Description |
|---|----------|-------------|
| F-IN-01 | Inventory items management | SKU, name, quantity, unit cost tracking |
| F-IN-02 | Stock movement tracking | Record purchases, sales, adjustments |
| F-IN-03 | Inventory valuation | FIFO, LIFO, weighted average costing |
| F-IN-04 | Inventory journal entries | Auto-post inventory movements to GL |
| F-IN-05 | Reorder alerts | Alert when stock falls below minimum levels |
| F-IN-06 | Stock-take / count adjustments | Record physical count discrepancies |

### 1.13 Period & Year-End Management

| # | Function | Description |
|---|----------|-------------|
| F-PE-01 | Fiscal year setup | Define financial year start/end |
| F-PE-02 | Accounting periods | Monthly/quarterly period definitions |
| F-PE-03 | Period closing | Lock periods to prevent backdated entries |
| F-PE-04 | Year-end closing entries | Auto-generate closing and opening entries |
| F-PE-05 | Retained earnings rollforward | Transfer net income to equity |

### 1.14 Audit, Compliance & Security

| # | Function | Description |
|---|----------|-------------|
| F-AU-01 | Audit trail | Log all creates, updates, deletes with user and timestamp |
| F-AU-02 | Role-based access control | Admin, Accountant, Viewer roles |
| F-AU-03 | Encryption of sensitive data | Encrypt payroll banks, salary data at rest |
| F-AU-04 | Audit report generation | Exportable audit log reports |
| F-AU-05 | Change reason capture | Require reason for sensitive changes |
| F-AU-06 | Multi-company support | Manage separate books for multiple entities |

### 1.15 Document Management

| # | Function | Description |
|---|----------|-------------|
| F-DM-01 | Document upload | Upload receipts, invoices, contracts |
| F-DM-02 | OCR text extraction | Auto-extract text from scanned documents |
| F-DM-03 | Document linking | Link documents to transactions, invoices, etc. |
| F-DM-04 | Document classification | Categorise documents by type |
| F-DM-05 | Full-text search | Search across OCR-extracted text |

### 1.16 Integration & Automation

| # | Function | Description |
|---|----------|-------------|
| F-IG-01 | POS → GL integration | Auto-post POS sales to accounting |
| F-IG-02 | Procurement → GL integration | Auto-post purchase receipts to accounting |
| F-IG-03 | Invoice → GL integration | Auto-create journal entries on invoice payment |
| F-IG-04 | HR Payroll → GL integration | Auto-post payroll to accounting |
| F-IG-05 | REST API access | API for external integrations |
| F-IG-06 | Data import/export | Bulk import/export via CSV/Excel |
| F-IG-07 | Webhook notifications | Real-time event notifications |

---

## 2. Workflow List — Standard Accounting Workflows

### WF-01: Procure-to-Pay (P2P)
```
Purchase Request → Approval → Purchase Order → Goods Receipt → Vendor Bill → 3-Way Match → Payment → GL Posting
```

### WF-02: Order-to-Cash (O2C)
```
Sales Order / Quote → Delivery → Invoice → Payment Reminder → Payment Receipt → GL Posting
```

### WF-03: Record-to-Report (R2R)
```
Daily Transactions → Period-End Adjustments → Trial Balance → Financial Statements → Review & Close Period
```

### WF-04: Bank Reconciliation
```
Import Bank Statement → Auto-Match Transactions → Manual Match Remaining → Investigate Differences → Post Adjustments → Reconciled
```

### WF-05: Payroll Processing
```
Attendance/Timesheet → Calculate Gross Pay → Apply Deductions (Tax, Benefits) → Approve → Pay Employees → Post Payroll Journal → Generate Payslips
```

### WF-06: Tax Filing
```
Record Taxable Transactions → Calculate Tax Liability → Generate Tax Report → Review → File Return → Record Payment/Refund
```

### WF-07: Fixed Asset Lifecycle
```
Purchase Asset → Record in Asset Register → Calculate Depreciation Monthly → Post Depreciation Journal → Dispose/Retire → Record Gain/Loss
```

### WF-08: Period-End Close
```
Post All Transactions → Record Adjusting Entries → Run Trial Balance → Generate Financial Reports → Review → Lock Period → Rollforward Opening Balances
```

### WF-09: Expense Management
```
Employee Submits Expense → Manager Approval → Record in AP → Reimburse Employee → Post to GL
```

### WF-10: Budget Management
```
Create Budget → Allocate to Departments → Track Actuals → Generate Variance Report → Review → Adjust Forecast
```

---

## 3. Current Status — What Cardlink Already Has

### ✅ Fully Implemented

| Function ID | Function | Notes |
|-------------|----------|-------|
| F-GL-01 | Chart of Accounts management | 5 types, codes, active/inactive |
| F-GL-02 | Account types (5 core) | Assets, Liabilities, Equity, Revenue, Expense |
| F-GL-03 | Sub-account hierarchy | Parent-child via `parent_id` |
| F-JE-01 | Manual journal entries | Full double-entry with debit/credit validation |
| F-JE-05 | Voiding entries | `voided` status supported |
| F-JE-08 | Idempotent posting | Idempotency key prevents duplicates |
| F-AR-01 | Customer invoicing | Full CRUD with line items, tax, currency |
| F-AR-02 | Invoice status lifecycle | draft → sent → paid / overdue |
| F-TX-01 | Tax rate configuration | Multiple rates with name, %, region |
| F-TX-03 | Default tax rate per org | One default with auto-unset |
| F-MC-01 | Currency management | Code, name, symbol, rate per org |
| F-MC-02 | Exchange rate tracking | Stored per currency per org |
| F-MC-03 | Multi-currency transactions | Currency + exchange rate per transaction line |
| F-RP-01 | Trial Balance | Debit/credit totals by account |
| F-RP-02 | Profit & Loss | Revenue vs expense with net income |
| F-RP-03 | Balance Sheet | Assets = Liabilities + Equity validation |
| F-RP-04 | Cash Flow Statement | Basic — based on asset account balances |
| F-PY-01 | Payroll records | Gross, deductions, net per employee per period |
| F-PY-08 | Encrypted sensitive data | AES-256-GCM for bank details and salary notes |
| F-IN-01 | Inventory items management | SKU, quantity, unit cost, category |
| F-IN-02 | Stock movement tracking | Via inventory module (movements API) |
| F-IN-05 | Reorder alerts | Reorder level with balance alerts |
| F-AU-01 | Audit trail | Full logging with old/new values, user, timestamp |
| F-AU-02 | Role-based access control | Admin, Accountant, Viewer roles |
| F-AU-03 | Encryption of sensitive data | AES-256-GCM payroll encryption |
| F-AU-06 | Multi-company support | Multi-tenant with organization isolation |
| F-DM-01 | Document upload | File upload to Supabase Storage |
| F-DM-02 | OCR text extraction | Auto-OCR on upload (configurable) |
| F-DM-03 | Document linking | Polymorphic linking (related_type + related_id) |
| F-IG-01 | POS → GL integration | Auto-post POS orders to accounting |
| F-IG-02 | Procurement → GL integration | Purchase receipts to accounting |
| F-IG-03 | Invoice → GL integration | Auto-journal on invoice payment |
| F-IG-05 | REST API access | Full REST API for all accounting entities |

### ⚠️ Partially Implemented

| Function ID | Function | What Exists | What's Missing |
|-------------|----------|-------------|----------------|
| F-RP-04 | Cash Flow Statement | Basic cash estimate from asset accounts | Operating/Investing/Financing classification |
| F-RP-11 | Report export | API declares PDF/Excel as exportable formats | Actual export generation not implemented |
| F-AR-11 | Invoice discounts | Store-level discounts exist in POS module | Not available in accounting invoices |
| F-JE-02 | Auto-generated entries | Invoice payment creates entries | Payroll and inventory don't auto-post to GL |
| F-BK-01 | Bank account management | Placeholder bank feed route exists | No actual bank account tracking |
| F-IN-04 | Inventory journal entries | Cross-module integration documented | Actual auto-posting not confirmed |

---

## 4. Missing Functions — Gap List

### 🔴 Critical Gaps (Required for SMC Accounting)

| Priority | Function ID | Function | Impact |
|----------|-------------|----------|--------|
| **P1** | F-AP-01 | **Vendor bill entry** | Cannot track money owed to suppliers — core AP gap |
| **P1** | F-AP-02 | **Bill status lifecycle** | No approval or payment workflow for bills |
| **P1** | F-BK-03 | **Bank reconciliation** | Cannot verify bank balance matches books — compliance risk |
| **P1** | F-BK-04 | **Manual bank statement import** | No way to import bank data even manually |
| **P1** | F-PE-01 | **Fiscal year setup** | No period management — no year-end close possible |
| **P1** | F-PE-03 | **Period closing** | Cannot prevent backdated entries — audit risk |
| **P1** | F-PE-04 | **Year-end closing entries** | No retained earnings rollforward |
| **P1** | F-AR-06 | **Payment recording** | Cannot record partial payments or payment methods |
| **P1** | F-RP-06 | **AR aging report** | Cannot assess collection risk |
| **P1** | F-RP-07 | **AP aging report** | Cannot assess payment obligations |
| **P1** | F-PY-04 | **Payroll journal posting** | Payroll not posting to GL — incomplete books |

### 🟡 Important Gaps (Expected in Professional Accounting Software)

| Priority | Function ID | Function | Impact |
|----------|-------------|----------|--------|
| **P2** | F-AR-03 | **Recurring invoices** | Manual work for subscription-based businesses |
| **P2** | F-AR-04 | **Estimates / Quotes** | Cannot create quotes that convert to invoices |
| **P2** | F-AR-05 | **Credit notes** | Cannot issue corrections against invoices |
| **P2** | F-AR-07 | **Payment terms** | No structured terms (Net 30, etc.) |
| **P2** | F-AR-08 | ~~AR aging report~~ | *(See P1 above)* |
| **P2** | F-AR-12 | **Invoice email delivery** | Must send invoices outside the system |
| **P2** | F-AR-13 | **Invoice PDF generation** | Cannot export professional invoice documents |
| **P2** | F-AP-03 | **Purchase order matching** | No 3-way match validation |
| **P2** | F-AP-06 | ~~AP aging report~~ | *(See P1 above)* |
| **P2** | F-AP-09 | **Expense claims** | No employee expense reimbursement tracking |
| **P2** | F-BK-02 | **Bank feed integration** | Manual-only bank data (once import exists) |
| **P2** | F-BK-06 | **Bank transfers** | Cannot record inter-account transfers |
| **P2** | F-TX-02 | **Tax type categories** | All taxes treated the same (no VAT vs GST vs WHT distinction) |
| **P2** | F-TX-06 | **Tax return preparation** | Cannot aggregate tax data for filing |
| **P2** | F-RP-05 | **Comparative reports** | No period-over-period comparison |
| **P2** | F-RP-08 | **General ledger detail** | No per-account transaction detail report |
| **P2** | F-RP-09 | **Tax summary report** | Cannot summarise tax for filing |
| **P2** | F-RP-11 | **Report export (actual)** | Declared but not generating actual files |
| **P2** | F-JE-03 | **Recurring journal entries** | Manual repetition required |
| **P2** | F-JE-07 | **Batch entry import** | Cannot bulk-import transactions |
| **P2** | F-GL-05 | **Default accounts** | No system-configurable default accounts |
| **P2** | F-GL-06 | **Account opening balances** | No migration tool for starting balances |
| **P2** | F-PE-02 | **Accounting periods** | No period definitions |
| **P2** | F-PY-02 | **Tax deductions** | No income tax or statutory deduction calculations |
| **P2** | F-PY-05 | **Payslip generation** | Cannot generate payslips for employees |
| **P2** | F-IG-04 | **HR Payroll → GL integration** | Payroll not auto-posting to general ledger |
| **P2** | F-IG-06 | **Data import/export** | No CSV/Excel bulk import capability |

### 🟢 Nice-to-Have Gaps (Advanced / Growth Features)

| Priority | Function ID | Function | Impact |
|----------|-------------|----------|--------|
| **P3** | F-FA-01 | **Asset register** | Fixed assets tracked manually outside system |
| **P3** | F-FA-02 | **Depreciation schedules** | No auto-depreciation calculation |
| **P3** | F-FA-03 | **Asset disposal** | Cannot record asset write-offs properly |
| **P3** | F-BG-01 | **Budget creation** | No budget tracking capability |
| **P3** | F-BG-02 | **Budget vs actual reports** | No variance analysis |
| **P3** | F-MC-04 | **Auto exchange rate updates** | Rates must be manually entered |
| **P3** | F-MC-06 | **Realised FX gain/loss** | No exchange gain/loss on settlement |
| **P3** | F-MC-07 | **Unrealised FX gain/loss** | No period-end revaluation |
| **P3** | F-MC-08 | **Base currency reporting** | Cannot consolidate in home currency |
| **P3** | F-RP-10 | **Custom report builder** | Fixed report types only |
| **P3** | F-RP-12 | **Scheduled report generation** | Must run reports manually |
| **P3** | F-RP-13 | **Cost centre reports** | No departmental reporting |
| **P3** | F-TX-04 | **Tax exemption rules** | No exemption handling |
| **P3** | F-TX-05 | **Compound tax** | Cannot calculate tax-on-tax |
| **P3** | F-TX-07 | **Withholding tax** | No WHT tracking |
| **P3** | F-TX-08 | **Input tax credit tracking** | Cannot track reclaimable tax |
| **P3** | F-IN-03 | **Inventory valuation** | No FIFO/LIFO/weighted average costing |
| **P3** | F-IN-06 | **Stock-take adjustments** | No physical count reconciliation |
| **P3** | F-AR-09 | **Dunning / reminders** | No automated collection reminders |
| **P3** | F-AR-10 | **Customer statements** | Cannot generate customer statements |
| **P3** | F-AR-14 | **Invoice templates** | Single invoice layout only |
| **P3** | F-AR-15 | **Customer credit limits** | No credit limit enforcement |
| **P3** | F-AP-04 | **Bill payment scheduling** | No payment scheduling for bills |
| **P3** | F-AP-05 | **Debit notes** | Cannot issue debit notes to vendors |
| **P3** | F-AP-07 | **Vendor statements** | Cannot generate vendor statements |
| **P3** | F-AP-08 | **Early payment discounts** | No prompt-payment discount tracking |
| **P3** | F-BK-05 | **Uncleared transaction tracking** | No outstanding check/deposit tracking |
| **P3** | F-PE-05 | **Retained earnings rollforward** | No automated equity transfer at year-end |
| **P3** | F-AU-04 | **Audit report generation** | Audit log exists but no exportable report |
| **P3** | F-AU-05 | **Change reason capture** | No reason required for changes |
| **P3** | F-DM-04 | **Document classification** | No categorisation of uploaded documents |
| **P3** | F-DM-05 | **Full-text search** | Cannot search across OCR text |
| **P3** | F-PY-03 | **Allowances & benefits** | No structured allowance types |
| **P3** | F-PY-06 | **Overtime & bonus** | No variable pay calculations |
| **P3** | F-PY-07 | **Statutory compliance** | No government-mandated payroll reports |
| **P3** | F-JE-04 | **Reversing entries** | No auto-reversal capability |
| **P3** | F-JE-06 | **Adjusting entries** | No dedicated adjustment workflow |
| **P3** | F-JE-09 | **Transaction search** | Limited search/filter on transactions |
| **P3** | F-JE-10 | **Transaction attachments** | Cannot attach documents to journal entries |
| **P3** | F-GL-04 | **Account descriptions** | No description/notes field |
| **P3** | F-GL-07 | **Account locking** | No lock for closed period accounts |
| **P3** | F-IG-07 | **Webhook notifications** | Events emitted but no external webhook delivery |

---

## 5. Verdict — Is the App Comprehensive Enough?

### Summary Scorecard

| Category | Functions Required | Implemented | Partial | Missing | Coverage |
|----------|-------------------|-------------|---------|---------|----------|
| General Ledger | 7 | 3 | 0 | 4 | 43% |
| Journal Entries | 10 | 3 | 1 | 6 | 35% |
| Accounts Receivable | 15 | 2 | 1 | 12 | 17% |
| Accounts Payable | 9 | 0 | 0 | 9 | 0% |
| Banking | 6 | 0 | 1 | 5 | 8% |
| Tax Management | 9 | 2 | 0 | 7 | 22% |
| Multi-Currency | 8 | 3 | 0 | 5 | 38% |
| Financial Reporting | 13 | 4 | 1 | 8 | 35% |
| Budgeting | 4 | 0 | 0 | 4 | 0% |
| Fixed Assets | 5 | 0 | 0 | 5 | 0% |
| Payroll | 8 | 2 | 0 | 6 | 25% |
| Inventory | 6 | 3 | 1 | 2 | 58% |
| Period Management | 5 | 0 | 0 | 5 | 0% |
| Audit & Security | 6 | 4 | 0 | 2 | 67% |
| Document Mgmt | 5 | 3 | 0 | 2 | 60% |
| Integration | 7 | 4 | 1 | 2 | 64% |
| **TOTAL** | **123** | **33** | **6** | **84** | **30%** |

### Verdict

> **The app is NOT yet comprehensive enough to fully handle all accounting needs for a professional SMC.**

**What it does well:**
- ✅ Solid double-entry bookkeeping foundation
- ✅ Good audit trail and security (RBAC, encryption)
- ✅ Multi-company, multi-currency architecture
- ✅ Cross-module integrations (POS, procurement → GL)
- ✅ Modern tech stack with room for extension

**What it critically lacks:**
- ❌ **No Accounts Payable (AP)** — cannot track vendor bills, the single biggest gap
- ❌ **No Bank Reconciliation** — cannot verify books match bank
- ❌ **No Period/Year-End Management** — cannot close books properly
- ❌ **No Payment Tracking** — cannot record partial or multiple payments against invoices
- ❌ **No Aging Reports** — cannot assess AR/AP risk
- ❌ **No Fixed Asset Management** — no depreciation tracking
- ❌ **No Budgeting** — no budget vs actual analysis
- ❌ **No Bill Management** — procurement module exists but doesn't connect to AP

### Comparison with Open-Source References

| Feature | GnuCash | Akaunting | ERPNext | Manager.io | **Cardlink** |
|---------|---------|-----------|---------|------------|--------------|
| General Ledger | ✅ | ✅ | ✅ | ✅ | ✅ |
| AR (Invoicing) | ✅ | ✅ | ✅ | ✅ | ⚠️ Basic |
| AP (Bills) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Bank Recon | ✅ | ✅ | ✅ | ✅ | ❌ |
| Financial Reports | ✅ | ✅ | ✅ | ✅ | ⚠️ Basic |
| Tax Management | ⚠️ | ✅ | ✅ | ✅ | ⚠️ Basic |
| Multi-Currency | ✅ | ✅ | ✅ | ✅ | ⚠️ Basic |
| Budgeting | ✅ | ⚠️ | ✅ | ✅ | ❌ |
| Fixed Assets | ⚠️ | ⚠️ | ✅ | ✅ | ❌ |
| Payroll | ❌ | ⚠️ | ✅ | ❌ | ⚠️ Basic |
| Period Close | ✅ | ✅ | ✅ | ✅ | ❌ |
| Recurring | ✅ | ✅ | ✅ | ✅ | ❌ |
| Audit Trail | ⚠️ | ✅ | ✅ | ⚠️ | ✅ |
| RBAC | ❌ | ✅ | ✅ | ✅ | ✅ |
| Multi-Company | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## 6. Prioritised Roadmap Recommendations

### Objective

Close the critical gaps so that Cardlink's accounting module can serve as the **primary accounting system** for an SMC, eliminating the need for external spreadsheets or third-party tools for core bookkeeping, reporting, and compliance.

### Scope Out

The following are explicitly **out of scope** for the recommended phases and should be deferred:
- ERP-grade features (multi-entity consolidation, inter-company transactions)
- Industry-specific modules (construction, manufacturing, non-profit)
- Government e-filing integration (varies by jurisdiction)
- Advanced AI-driven forecasting beyond basic budgeting

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Database migration complexity for AP tables | Medium | High | Design AP schema to mirror existing AR pattern; reuse contacts table |
| Bank reconciliation matching accuracy | Medium | Medium | Start with manual matching; add auto-match rules incrementally |
| Breaking existing invoice workflow | Low | High | Additive changes only; payment recording extends, not replaces, existing status flow |
| Period closing blocks active users | Medium | Medium | Implement soft-lock with admin override; warn before locking |

### Phase 1 — Core Accounting Completeness (Critical for SMC)

**Target**: Make the accounting module functional enough for an SMC to rely on as their primary system.
**Estimated duration**: 3–4 weeks (3 one-week sprints + 1 week testing/stabilisation).

| # | Feature | Effort | Business Value | Acceptance Criteria |
|---|---------|--------|----------------|---------------------|
| 1 | **Vendor Bills (AP)** — Bill entry, approval, payment, auto-journal | High | Critical | Bills can be created from vendor contacts; status transitions (draft→approved→paid) work; payment auto-creates GL journal entry |
| 2 | **Payment Recording** — Partial payments, payment methods on invoices | Medium | Critical | Invoices support multiple payment records; partial payment updates outstanding balance; overpayment prevented |
| 3 | **Bank Reconciliation** — Manual statement import + matching | High | Critical | CSV bank statement can be imported; transactions matched manually to ledger entries; reconciliation summary shows matched/unmatched counts |
| 4 | **Fiscal Year & Period Management** — Setup, closing, locking | Medium | Critical | Fiscal year can be defined; periods can be closed; closed period rejects new journal entries; admin can reopen |
| 5 | **AR/AP Aging Reports** — 30/60/90/120+ day aging | Medium | Critical | AR aging groups outstanding invoices by days overdue; AP aging groups outstanding bills; export to PDF/CSV |
| 6 | **Payroll → GL Posting** — Auto-create journal entries from payroll | Low | Critical | When payroll status changes to "processed", a journal entry is created debiting expense / crediting cash |

**Test checkpoints (end of each sprint)**:
- Sprint 1: AP bills + payment recording pass end-to-end tests
- Sprint 2: Bank reconciliation + period management pass integration tests
- Sprint 3: Aging reports + payroll GL posting verified; full regression pass

### Phase 2 — Professional Features

**Target**: Bring feature parity with Akaunting / Manager.io for standard SMC workflows.
**Estimated duration**: 4–5 weeks (4 one-week sprints + 1 week testing).

| # | Feature | Effort | Business Value | Acceptance Criteria |
|---|---------|--------|----------------|---------------------|
| 7 | **Recurring Invoices** — Scheduled auto-generation | Medium | High | Invoices can be marked recurring with frequency; system auto-creates next invoice on schedule |
| 8 | **Estimates/Quotes** — Quote-to-invoice conversion | Medium | High | Quotes can be created; accepted quote converts to invoice preserving line items |
| 9 | **Credit Notes** — Issue credits against invoices | Medium | High | Credit note links to original invoice; reduces outstanding balance; creates reversal journal entry |
| 10 | **Invoice PDF & Email** — Generate and send professional invoices | Medium | High | PDF generated from invoice data; email sent via configured SMTP/provider; delivery status tracked |
| 11 | **Report Export** — Actual PDF/Excel generation for reports | Medium | High | All 4 report types generate downloadable PDF and Excel files |
| 12 | **GL Detail Report** — Transaction-level account report | Low | High | Report shows all transactions for a selected account with running balance |
| 13 | **Tax Summary Report** — Aggregate tax for filing | Low | High | Report aggregates tax collected and paid by rate/region for a date range |
| 14 | **Data Import/Export** — CSV import for transactions and contacts | Medium | High | CSV upload creates validated transactions/contacts; error rows reported |
| 15 | **Default Accounts Configuration** — Set default cash, AR, AP accounts | Low | High | Settings page allows selecting default accounts; defaults used in auto-journal generation |

**Test checkpoints**:
- Sprint 1: Recurring invoices + estimates pass unit tests
- Sprint 2: Credit notes + PDF generation verified
- Sprint 3: Report export + GL detail report pass
- Sprint 4: Import/export + default accounts; full regression

### Phase 3 — Advanced Features

**Target**: Differentiate from basic tools; support growing SMCs with complex needs.
**Estimated duration**: 6–8 weeks (ongoing, feature-flag gated).

| # | Feature | Effort | Business Value | Acceptance Criteria |
|---|---------|--------|----------------|---------------------|
| 16 | **Fixed Asset Register & Depreciation** | High | Medium | Assets recorded with purchase cost and useful life; monthly depreciation auto-calculated and posted to GL |
| 17 | **Budgeting & Variance Reports** | High | Medium | Budgets created by account/period; variance report compares actual vs budget with % deviation |
| 18 | **Comparative Reports** | Medium | Medium | P&L and Balance Sheet show current vs prior period side-by-side |
| 19 | **Bank Feed Integration (Plaid)** | High | Medium | Bank transactions auto-imported daily; suggested matches presented for approval |
| 20 | **Expense Claims Workflow** | Medium | Medium | Employees submit expenses; manager approves; approved claims create AP entries |
| 21 | **FX Gain/Loss Calculation** | Medium | Medium | Settlement of FX transactions calculates realised gain/loss; period-end revaluation calculates unrealised |
| 22 | **Advanced Tax Features** | Medium | Medium | Compound tax supported; tax exemption rules by product/customer; withholding tax tracking |

**Test checkpoints**: Each feature gated behind feature flag; integration test suite per feature before flag enabled.

---

### Acceptance Checklist (Overall)

- [ ] Phase 1 complete: All 6 critical functions implemented and tested
- [ ] Phase 2 complete: All 9 professional features implemented and tested
- [ ] Phase 3 complete: At least 4 of 7 advanced features implemented
- [ ] Full regression suite passes after each phase
- [ ] Audit trail covers all new transaction types
- [ ] RBAC enforced on all new API endpoints
- [ ] Documentation updated for each new feature

---

*This analysis was conducted by comparing the Cardlink app against GnuCash, Akaunting, ERPNext, Manager.io, and IFRS for SMEs standards. The function list represents the union of features found across these reference implementations, filtered for relevance to SMCs.*
