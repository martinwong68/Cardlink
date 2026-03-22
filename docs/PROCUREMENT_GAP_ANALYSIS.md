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
| A3 | Edit supplier details | ERPNext, Odoo | ⚠️ UI exists, API missing | `PATCH /api/procurement/suppliers/[id]` not implemented |
| A4 | Supplier address & multi-contact | ERPNext, Odoo | ❌ Missing | Only single `contact_name` + `contact_phone` stored |
| A5 | Supplier categorisation / tags | ERPNext, Odoo, Procuman | ❌ Missing | No category, industry, or tag fields |
| A6 | Supplier performance rating / scorecard | ERPNext, Odoo | ❌ Missing | No rating, on-time %, quality score |
| A7 | Supplier compliance documents | ERPNext, Procuman | ❌ Missing | No document attachment on supplier record |
| A8 | Supplier portal (self-service) | ERPNext, Odoo | ❌ Missing | Suppliers cannot log in or submit quotations |
| A9 | Supplier payment terms | Odoo | ❌ Missing | No payment terms (Net 30, etc.) on supplier record |
| A10 | Multi-currency supplier pricing | Odoo, ERPNext | ❌ Missing | No currency field on supplier or PO |
| **B. Purchase Requisition / Request** | | | | |
| B1 | Create purchase request | ERPNext, Odoo | ✅ Implemented | `POST /api/procurement/requests` |
| B2 | List / filter requests by status | ERPNext, Odoo | ✅ Implemented | Filter: draft, pending, approved, rejected |
| B3 | Priority levels | ERPNext | ✅ Implemented | low, normal, high, urgent |
| B4 | Approval workflow (submit → approve / reject) | ERPNext, Odoo | ✅ Implemented | `PATCH /api/procurement/requests/[id]` |
| B5 | Multi-level / threshold-based approval | Odoo, ERPNext | ❌ Missing | Single-level only; no amount threshold routing |
| B6 | Link request line items to products | ERPNext, Odoo | ❌ Missing | Request has only title + total_estimated; no item lines |
| B7 | Auto-generate request from low stock (reorder) | Odoo, ERPNext | ❌ Missing | No automatic reorder trigger |
| B8 | Budget check on requisition | ERPNext, Procuman | ❌ Missing | No budget module or spend-limit validation |
| B9 | Convert approved request → RFQ or PO | ERPNext, Odoo | ❌ Missing | No link between request and PO creation |
| **C. Request for Quotation (RFQ)** | | | | |
| C1 | Create RFQ and send to multiple suppliers | ERPNext, Odoo, Procuman | ❌ Missing | No RFQ entity; PR serves as internal request only |
| C2 | Receive supplier quotations | ERPNext, Odoo | ❌ Missing | No quotation response tracking |
| C3 | Compare quotations (price, lead time) | ERPNext, Odoo | ❌ Missing | No comparison tooling |
| C4 | Convert best quotation → PO | ERPNext, Odoo | ❌ Missing | No quotation-to-PO flow |
| **D. Purchase Order Management** | | | | |
| D1 | Create PO with line items | ERPNext, Odoo | ✅ Implemented | `POST /api/procurement/purchase-orders` with items[] |
| D2 | List / filter POs by status | ERPNext, Odoo | ✅ Implemented | Filter: draft, submitted, received, cancelled |
| D3 | PO status workflow | ERPNext, Odoo | ✅ Implemented | draft → submitted → received → cancelled |
| D4 | Update / amend PO | ERPNext, Odoo | ⚠️ UI exists, API missing | `PATCH /api/procurement/purchase-orders/[id]` not implemented |
| D5 | PO approval workflow | Odoo, ERPNext | ❌ Missing | POs created directly in "submitted" status |
| D6 | PO versioning / amendment history | ERPNext | ❌ Missing | No revision tracking |
| D7 | Expected delivery date tracking | Odoo, ERPNext | ✅ Implemented | `expected_at` field on PO |
| D8 | Partial delivery / backorder tracking | Odoo, ERPNext | ⚠️ Partial | DB supports "partial" status but API only marks "received" |
| D9 | PO print / PDF export | ERPNext, Odoo | ❌ Missing | No print or PDF generation |
| D10 | PO terms & conditions | Odoo, ERPNext | ❌ Missing | No terms field on PO |
| D11 | Link PO to purchase request | ERPNext, Odoo | ❌ Missing | No `request_id` FK on PO |
| D12 | Idempotency protection | — (best practice) | ✅ Implemented | `idempotency_key` prevents duplicate POs |
| D13 | PO-level discount / tax | Odoo, ERPNext | ❌ Missing | No discount or tax fields |
| **E. Goods Receipt / Receiving** | | | | |
| E1 | Record goods received against PO | ERPNext, Odoo | ✅ Implemented | `POST /api/procurement/receipts` |
| E2 | List receipts | ERPNext, Odoo | ⚠️ UI exists, API missing | `GET /api/procurement/receipts` not implemented |
| E3 | Item-level receipt with quantities | ERPNext, Odoo | ✅ Implemented | `proc_receipt_items` with qty per product |
| E4 | Over-receive prevention | ERPNext | ✅ Implemented | DB function validates qty ≤ ordered |
| E5 | Auto-update inventory on receipt | Odoo, ERPNext | ✅ Implemented | Triggers `inv_stock_movements` |
| E6 | Auto-create accounting journal entry | ERPNext, Odoo | ✅ Implemented | Debit Inventory (1400) / Credit AP (2100) |
| E7 | Quality inspection on receipt | ERPNext, Odoo | ❌ Missing | No inspection workflow or rejection tracking |
| E8 | Partial receipt / backorder | Odoo, ERPNext | ⚠️ Partial | DB supports it; API doesn't update PO to "partial" |
| E9 | Return to supplier (debit note) | ERPNext, Odoo | ❌ Missing | No return or debit note functionality |
| **F. Vendor Contracts** | | | | |
| F1 | Create vendor contract | ERPNext, Odoo | ⚠️ DB & UI exist, API missing | `proc_contracts` table exists; no API endpoints |
| F2 | Contract status lifecycle | ERPNext, Odoo | ⚠️ Schema only | draft → active → expired → terminated (DB only) |
| F3 | Contract value & term tracking | ERPNext, Odoo | ⚠️ Schema only | Fields exist in DB; not accessible via API |
| F4 | Blanket orders / framework agreements | Odoo | ❌ Missing | No blanket order concept |
| F5 | Contract renewal alerts | Odoo, ERPNext | ❌ Missing | No notification on expiry |
| **G. Invoice & Payment (Procure-to-Pay)** | | | | |
| G1 | Vendor invoice creation | ERPNext, Odoo | ❌ Missing | Only customer invoices exist in accounting module |
| G2 | 3-way matching (PO ↔ receipt ↔ invoice) | ERPNext, Odoo | ❌ Missing | No matching engine |
| G3 | Invoice approval workflow | ERPNext, Odoo | ❌ Missing | No vendor invoice concept |
| G4 | Payment scheduling & tracking | ERPNext, Odoo | ❌ Missing | No AP payment tracking |
| G5 | Payment term management | Odoo, ERPNext | ❌ Missing | No payment terms on suppliers or POs |
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
| 1 | **Contracts API** (`GET/POST/PATCH /api/procurement/contracts`) | Contracts page is non-functional |
| 2 | **Receipts GET API** (`GET /api/procurement/receipts`) | Cannot view past goods receipts |
| 3 | **Suppliers PATCH API** (`PATCH /api/procurement/suppliers/[id]`) | Cannot edit vendor details |
| 4 | **Purchase Orders PATCH API** (`PATCH /api/procurement/purchase-orders/[id]`) | Cannot update PO status from UI |
| 5 | **Vendor invoice / bill** | Cannot complete procure-to-pay cycle |
| 6 | **3-way matching** (PO ↔ receipt ↔ invoice) | No fraud/error prevention |

### 4.2 Important Missing (expected by professional users)

| # | Missing Function | Impact |
|---|-----------------|--------|
| 7 | RFQ to multiple suppliers | Cannot solicit competitive bids |
| 8 | Quotation comparison | Cannot evaluate best-price sourcing |
| 9 | Multi-level PO approval | No spend controls above single approver |
| 10 | Purchase request → PO conversion | Manual re-entry required |
| 11 | Supplier performance tracking | No vendor quality accountability |
| 12 | Payment terms on supplier / PO | No AP aging or due-date tracking |
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

### Verdict: ⚠️ **Not Yet Production-Ready for SMC Procurement**

The Cardlink procurement module has a **solid architectural foundation** (database
schema, cross-module integration, idempotency) that surpasses many SMC tools.
However, it is currently at **MVP stage** with several broken API endpoints and
missing core workflows.

### Readiness Scorecard

| Area | Score | Status |
|------|-------|--------|
| Supplier management | 40% | Create/list works; edit, rating, terms missing |
| Purchase requisitions | 70% | Good workflow; no item lines or PO linkage |
| Purchase orders | 55% | Create works; update/amend, approval, print missing |
| Goods receipt | 60% | Core receipt works; list API, inspection, partial missing |
| Vendor contracts | 10% | DB schema only; API completely missing |
| Vendor invoicing / AP | 0% | Not started |
| 3-way matching | 0% | Not started |
| RFQ / quotation | 0% | Not started |
| Reporting / analytics | 10% | Dashboard stats only |
| **Overall** | **≈ 35%** | **MVP foundation; not SMC-ready** |

### To Reach SMC-Ready (≈ 80%), Prioritise:

**Phase 1 — Fix broken endpoints (1–2 days)**
1. Implement `PATCH /api/procurement/suppliers/[id]`
2. Implement `PATCH /api/procurement/purchase-orders/[id]`
3. Implement `GET /api/procurement/receipts`
4. Implement `GET/POST/PATCH /api/procurement/contracts`

**Phase 2 — Complete procure-to-pay (1–2 weeks)**
5. Add vendor invoice / bill entity and matching
6. Add purchase request → PO conversion
7. Add supplier payment term fields
8. Add PO approval workflow (threshold-based)
9. Add procurement spend reports

**Phase 3 — Professional features (2–4 weeks)**
10. Add RFQ and quotation comparison
11. Add supplier performance rating
12. Add PO PDF/print export
13. Add email notifications
14. Add document attachments
15. Add auto-reorder from inventory levels

---

## 7. References

- [ERPNext Buying Module](https://docs.erpnext.com/docs/user/manual/en/buying)
- [Odoo Purchase Module](https://www.odoo.com/app/purchase)
- [Procuman — Open Source e-Procurement](https://procuman.com/)
- [Procurement Workflow Best Practices — Ramp](https://ramp.com/blog/procurement-workflow-examples)
- [Procure-to-Pay Guide — Moxo](https://www.moxo.com/blog/procurement-purchasing-processes-guide)
