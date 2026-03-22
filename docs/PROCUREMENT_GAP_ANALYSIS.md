# Procurement Module — Gap Analysis & SMC Readiness Assessment

> **Date:** 2026-03-22
> **Reference systems:** ERPNext (Buying Module), Odoo (Purchase Module), Procuman
> **Target audience:** SMC (Small-Medium Company) procurement operations

---

## 1. Objective

Evaluate whether the Cardlink procurement module is comprehensive enough to
handle **all procurement information** for a typical SMC by comparing it
against industry-standard open-source procurement platforms.

---

## 2. Professional Procurement — Complete Function List

The table below maps every function found in ERPNext, Odoo, and Procuman to
the current state of the Cardlink app.

| # | Function | Reference System | Cardlink Status | Notes |
|---|----------|-----------------|----------------|-------|
| **A. Supplier / Vendor Management** | | | | |
| A1 | Create supplier record | ERPNext, Odoo, Procuman | ✅ Implemented | `POST /api/procurement/suppliers` |
| A2 | List / search suppliers | ERPNext, Odoo, Procuman | ✅ Implemented | `GET /api/procurement/suppliers` |
| A3 | Edit supplier details | ERPNext, Odoo | ✅ Implemented | `PATCH /api/procurement/suppliers/[id]` |
| A4 | Supplier address & multi-contact | ERPNext, Odoo | ✅ Implemented | `address`, `city`, `country`, `email` fields added |
| A5 | Supplier categorisation / tags | ERPNext, Odoo, Procuman | ✅ Implemented | `category` field on supplier |
| A6 | Supplier performance rating / scorecard | ERPNext, Odoo | ❌ Missing | No rating, on-time %, quality score |
| A7 | Supplier compliance documents | ERPNext, Procuman | ❌ Missing | No document attachment on supplier record |
| A8 | Supplier portal (self-service) | ERPNext, Odoo | ❌ Missing | Suppliers cannot log in or submit quotations |
| A9 | Supplier payment terms | Odoo | ✅ Implemented | `payment_terms` field with 7 options (immediate to net_90) |
| A10 | Multi-currency supplier pricing | Odoo, ERPNext | ⚠️ Schema only | `currency` field added to supplier; PO-level currency pending |
| **B. Purchase Requisition / Request** | | | | |
| B1 | Create purchase request | ERPNext, Odoo | ✅ Implemented | `POST /api/procurement/requests` |
| B2 | List / filter requests by status | ERPNext, Odoo | ✅ Implemented | Filter: draft, pending, approved, rejected |
| B3 | Priority levels | ERPNext | ✅ Implemented | low, normal, high, urgent |
| B4 | Approval workflow (submit → approve / reject) | ERPNext, Odoo | ✅ Implemented | `PATCH /api/procurement/requests/[id]` |
| B5 | Multi-level / threshold-based approval | Odoo, ERPNext | ❌ Missing | Single-level only; no amount threshold routing |
| B6 | Link request line items to products | ERPNext, Odoo | ❌ Missing | Request has only title + total_estimated; no item lines |
| B7 | Auto-generate request from low stock (reorder) | Odoo, ERPNext | ❌ Missing | No automatic reorder trigger |
| B8 | Budget check on requisition | ERPNext, Procuman | ❌ Missing | No budget module or spend-limit validation |
| B9 | Convert approved request → RFQ or PO | ERPNext, Odoo | ✅ Implemented | `POST /api/procurement/requests/[id]/convert-to-po` |
| **C. Request for Quotation (RFQ)** | | | | |
| C1 | Create RFQ and send to multiple suppliers | ERPNext, Odoo, Procuman | ❌ Missing | No RFQ entity; PR serves as internal request only |
| C2 | Receive supplier quotations | ERPNext, Odoo | ❌ Missing | No quotation response tracking |
| C3 | Compare quotations (price, lead time) | ERPNext, Odoo | ❌ Missing | No comparison tooling |
| C4 | Convert best quotation → PO | ERPNext, Odoo | ❌ Missing | No quotation-to-PO flow |
| **D. Purchase Order Management** | | | | |
| D1 | Create PO with line items | ERPNext, Odoo | ✅ Implemented | `POST /api/procurement/purchase-orders` with items[] |
| D2 | List / filter POs by status | ERPNext, Odoo | ✅ Implemented | Filter: draft, submitted, received, cancelled |
| D3 | PO status workflow | ERPNext, Odoo | ✅ Implemented | draft → submitted → received → cancelled |
| D4 | Update / amend PO | ERPNext, Odoo | ✅ Implemented | `PATCH /api/procurement/purchase-orders/[id]` |
| D5 | PO approval workflow | Odoo, ERPNext | ❌ Missing | POs created directly in "submitted" status |
| D6 | PO versioning / amendment history | ERPNext | ❌ Missing | No revision tracking |
| D7 | Expected delivery date tracking | Odoo, ERPNext | ✅ Implemented | `expected_at` field on PO |
| D8 | Partial delivery / backorder tracking | Odoo, ERPNext | ⚠️ Partial | DB supports "partial" status but API only marks "received" |
| D9 | PO print / PDF export | ERPNext, Odoo | ❌ Missing | No print or PDF generation |
| D10 | PO terms & conditions | Odoo, ERPNext | ✅ Implemented | `terms` and `notes` fields on PO |
| D11 | Link PO to purchase request | ERPNext, Odoo | ✅ Implemented | `request_id` FK on PO, convert-to-po endpoint |
| D12 | Idempotency protection | — (best practice) | ✅ Implemented | `idempotency_key` prevents duplicate POs |
| D13 | PO-level discount / tax | Odoo, ERPNext | ✅ Implemented | `discount_percent`, `tax_percent`, `shipping_cost` fields |
| **E. Goods Receipt / Receiving** | | | | |
| E1 | Record goods received against PO | ERPNext, Odoo | ✅ Implemented | `POST /api/procurement/receipts` |
| E2 | List receipts | ERPNext, Odoo | ✅ Implemented | `GET /api/procurement/receipts` with nested items |
| E3 | Item-level receipt with quantities | ERPNext, Odoo | ✅ Implemented | `proc_receipt_items` with qty per product |
| E4 | Over-receive prevention | ERPNext | ✅ Implemented | DB function validates qty ≤ ordered |
| E5 | Auto-update inventory on receipt | Odoo, ERPNext | ✅ Implemented | Triggers `inv_stock_movements` |
| E6 | Auto-create accounting journal entry | ERPNext, Odoo | ✅ Implemented | Debit Inventory (1400) / Credit AP (2100) |
| E7 | Quality inspection on receipt | ERPNext, Odoo | ❌ Missing | No inspection workflow or rejection tracking |
| E8 | Partial receipt / backorder | Odoo, ERPNext | ⚠️ Partial | DB supports it; API doesn't update PO to "partial" |
| E9 | Return to supplier (debit note) | ERPNext, Odoo | ❌ Missing | No return or debit note functionality |
| **F. Vendor Contracts** | | | | |
| F1 | Create vendor contract | ERPNext, Odoo | ✅ Implemented | `POST /api/procurement/contracts` |
| F2 | Contract status lifecycle | ERPNext, Odoo | ✅ Implemented | `PATCH /api/procurement/contracts/[id]` — draft → active → expired/terminated |
| F3 | Contract value & term tracking | ERPNext, Odoo | ✅ Implemented | value, terms, start_date, end_date via API |
| F4 | Blanket orders / framework agreements | Odoo | ❌ Missing | No blanket order concept |
| F5 | Contract renewal alerts | Odoo, ERPNext | ❌ Missing | No notification on expiry |
| **G. Invoice & Payment (Procure-to-Pay)** | | | | |
| G1 | Vendor invoice creation | ERPNext, Odoo | ✅ Implemented | `POST /api/procurement/vendor-bills` with line items |
| G2 | 3-way matching (PO ↔ receipt ↔ invoice) | ERPNext, Odoo | ⚠️ Partial | Bill can link to PO + receipt; automated matching not yet built |
| G3 | Invoice approval workflow | ERPNext, Odoo | ❌ Missing | No vendor invoice concept |
| G4 | Payment scheduling & tracking | ERPNext, Odoo | ⚠️ Partial | Bill paid triggers journal entry; no aging report yet |
| G5 | Payment term management | Odoo, ERPNext | ✅ Implemented | `payment_terms` on supplier + PO + bill records |
| **H. Reporting & Analytics** | | | | |
| H1 | Procurement spend report | ERPNext, Odoo, Procuman | ❌ Missing | No procurement-specific reports |
| H2 | Supplier performance analytics | ERPNext, Odoo | ❌ Missing | No rating or metrics tracking |
| H3 | Purchase order status dashboard | ERPNext, Odoo | ✅ Implemented | Main procurement page shows stats |
| H4 | Delivery lead time analysis | ERPNext, Odoo | ❌ Missing | No lead time tracking or reporting |
| H5 | Budget vs. actual spend | ERPNext, Procuman | ❌ Missing | No budget module |
| **I. Cross-Module Integration** | | | | |
| I1 | Inventory auto-update on receipt | ERPNext, Odoo | ✅ Implemented | Via `process_procurement_receipt()` RPC |
| I2 | Accounting journal on receipt | ERPNext, Odoo | ✅ Implemented | Via `createReceiptJournalEntry()` |
| I3 | Event emission for audit trail | — (best practice) | ✅ Implemented | `procurement.po.created`, `procurement.po.received` |
| I4 | Idempotency & correlation tracking | — (best practice) | ✅ Implemented | `idempotency_key`, `operation_id`, `correlation_id` |
| I5 | Link to manufacturing / BOM | ERPNext | ❌ Missing | N/A for non-manufacturing SMC |
| **J. Platform & UX** | | | | |
| J1 | Role-based access control | ERPNext, Odoo | ✅ Implemented | RLS policies: `can_manage_company()` |
| J2 | Multi-company support | ERPNext, Odoo | ✅ Implemented | `company_id` scoping on all tables |
| J3 | Mobile-responsive UI | Odoo | ✅ Implemented | Tailwind responsive layout |
| J4 | Email notifications on status change | Odoo, ERPNext | ❌ Missing | No email/notification integration in procurement |
| J5 | Document attachment on records | ERPNext, Odoo | ❌ Missing | No file upload on PO, receipt, or supplier |
| J6 | Audit log for procurement actions | ERPNext, Odoo | ⚠️ Partial | General `company_audit_logs` exists; not procurement-specific |

---

## 3. Workflow Comparison

### 3.1 Industry-Standard Procure-to-Pay Workflow

```
┌──────────────┐    ┌───────────┐    ┌──────────┐    ┌──────────────┐
│ 1. Identify  │───▶│ 2. Create │───▶│ 3. Approve│───▶│ 4. Send RFQ  │
│    Need      │    │ Requisition│   │ Request   │    │ to Suppliers │
└──────────────┘    └───────────┘    └──────────┘    └──────────────┘
                                                            │
       ┌────────────────────────────────────────────────────┘
       ▼
┌──────────────┐    ┌───────────┐    ┌──────────┐    ┌──────────────┐
│ 5. Receive & │───▶│ 6. Create │───▶│ 7. Approve│───▶│ 8. Send PO   │
│ Compare Quotes│   │ PO        │    │ PO        │    │ to Supplier  │
└──────────────┘    └───────────┘    └──────────┘    └──────────────┘
                                                            │
       ┌────────────────────────────────────────────────────┘
       ▼
┌──────────────┐    ┌───────────┐    ┌──────────┐    ┌──────────────┐
│ 9. Receive   │───▶│ 10. Match │───▶│ 11. Approve│──▶│ 12. Process  │
│ Goods+Inspect│    │ PO/GR/Inv │    │ Invoice   │    │ Payment      │
└──────────────┘    └───────────┘    └──────────┘    └──────────────┘
```

### 3.2 Cardlink Current Workflow Coverage

```
┌──────────────┐    ┌───────────┐    ┌──────────┐
│ 1. Identify  │───▶│ 2. Create │───▶│ 3. Approve│───▶  ✖ No RFQ
│    Need      │    │ Request ✅│    │ Request ✅│       flow
└──────────────┘    └───────────┘    └──────────┘

                    ┌───────────┐                     ┌──────────────┐
          ✖ No ───▶ │ 6. Create │───▶  ✖ No PO  ───▶ │ 8. PO sent   │
         link       │ PO ✅     │     approval        │ (status only)│
                    └───────────┘                     └──────────────┘
                                                            │
       ┌────────────────────────────────────────────────────┘
       ▼
┌──────────────┐
│ 9. Receive   │───▶  ✖ No 3-way match  ───▶  ✖ No vendor invoice
│ Goods ✅     │      ✖ No inspection         ✖ No payment tracking
└──────────────┘
```

**Workflow steps supported:** 5 of 12 (42%)

---

## 4. Missing Functions — Summary

### 4.1 Critical Missing (blocks core procurement flow)

| # | Missing Function | Impact |
|---|-----------------|--------|
| 1 | ~~Contracts API~~ | ✅ **Fixed in Phase 1** |
| 2 | ~~Receipts GET API~~ | ✅ **Fixed in Phase 1** |
| 3 | ~~Suppliers PATCH API~~ | ✅ **Fixed in Phase 1** |
| 4 | ~~Purchase Orders PATCH API~~ | ✅ **Fixed in Phase 1** |
| 5 | ~~Vendor invoice / bill~~ | ✅ **Fixed in Phase 1** — vendor bills with AP journal entries |
| 6 | **3-way matching** (PO ↔ receipt ↔ invoice) | ⚠️ Partial — manual linking exists; automated engine pending |

### 4.2 Important Missing (expected by professional users)

| # | Missing Function | Impact |
|---|-----------------|--------|
| 7 | RFQ to multiple suppliers | Cannot solicit competitive bids |
| 8 | Quotation comparison | Cannot evaluate best-price sourcing |
| 9 | Multi-level PO approval | No spend controls above single approver |
| 10 | ~~Purchase request → PO conversion~~ | ✅ **Fixed in Phase 1** — `convert-to-po` endpoint |
| 11 | Supplier performance tracking | No vendor quality accountability |
| 12 | ~~Payment terms on supplier / PO~~ | ✅ **Fixed in Phase 1** — `payment_terms` field on all records |
| 13 | Procurement reports & spend analytics | No data-driven decision support |
| 14 | PO print / PDF export | Cannot send formal POs to suppliers |

### 4.3 Nice to Have (advanced features)

| # | Missing Function | Impact |
|---|-----------------|--------|
| 15 | Auto-reorder from low stock | Manual monitoring required |
| 16 | Supplier portal | Suppliers cannot self-serve |
| 17 | Quality inspection on receipt | No formal QC process |
| 18 | Return to supplier / debit notes | Manual return handling |
| 19 | Blanket orders / framework agreements | No recurring order optimization |
| 20 | Document attachment on procurement records | No file management per PO/supplier |
| 21 | Email notifications on procurement events | Team not alerted on status changes |
| 22 | Budget vs. actual spend tracking | No budget module |
| 23 | Multi-currency procurement | Single-currency only |
| 24 | Contract renewal alerts | Manual expiry monitoring |

---

## 5. What Cardlink Does Well

Despite the gaps, Cardlink has strong foundations:

| Strength | Detail |
|----------|--------|
| **Database schema** | All 7 procurement tables are well-designed with proper FKs, RLS, and audit fields |
| **Idempotency** | PO creation and receipt processing use idempotency keys — a best practice many ERPs lack |
| **Cross-module integration** | Receipts auto-create inventory movements AND accounting journal entries atomically |
| **Event-driven architecture** | Procurement events emitted for downstream consumers |
| **Correlation tracking** | `operation_id` and `correlation_id` support distributed tracing |
| **Atomic receipt processing** | Server-side RPC function ensures data consistency |
| **Multi-company scoping** | All tables company-scoped with RLS — ready for multi-tenant use |
| **Purchase request workflow** | Full draft → pending → approved → rejected lifecycle with approver tracking |

---

## 6. SMC Readiness Assessment

### Verdict: ✅ **Phase 1 Complete — Approaching SMC-Ready**

After the Phase 1 rebuild (2026-03-22), the Cardlink procurement module now covers
the core procure-to-pay cycle. All previously broken APIs are fixed, vendor bills
(AP invoices) are implemented with accounting integration, and the PR→PO conversion
workflow is operational.

### Readiness Scorecard (Post Phase 1)

| Area | Before | After | Status |
|------|--------|-------|--------|
| Supplier management | 40% | **75%** | CRUD + address + payment terms + category + rating schema |
| Purchase requisitions | 70% | **80%** | Workflow + PR→PO conversion |
| Purchase orders | 55% | **75%** | CRUD + line items + status update + PR linkage |
| Goods receipt | 60% | **80%** | CRUD + item-level receipt + inventory + accounting |
| Vendor contracts | 10% | **70%** | Full CRUD with status lifecycle |
| Vendor invoicing / AP | 0% | **60%** | Bills CRUD + paid journal entry; 3-way matching still manual |
| 3-way matching | 0% | **20%** | Bill links to PO + receipt; automated matching not yet built |
| RFQ / quotation | 0% | 0% | Not started |
| Reporting / analytics | 10% | 10% | Dashboard stats only |
| **Overall** | **≈ 35%** | **≈ 60%** | **Core P2P cycle functional; approaching SMC-ready** |

### Remaining to Reach ≈ 80%:

**Phase 2 — Professional features**
1. RFQ and quotation comparison
2. Multi-level PO approval workflow (threshold-based)
3. Procurement spend reports
4. PO PDF/print export
5. Automated 3-way matching engine

**Phase 3 — Advanced features**
6. Supplier performance rating UI
7. Email notifications on status changes
8. Document attachments on records
9. Auto-reorder from inventory levels
10. Budget vs. actual spend tracking

---

## 7. References

- [ERPNext Buying Module](https://docs.erpnext.com/docs/user/manual/en/buying)
- [Odoo Purchase Module](https://www.odoo.com/app/purchase)
- [Procuman — Open Source e-Procurement](https://procuman.com/)
- [Procurement Workflow Best Practices — Ramp](https://ramp.com/blog/procurement-workflow-examples)
- [Procure-to-Pay Guide — Moxo](https://www.moxo.com/blog/procurement-purchasing-processes-guide)
