# Inventory Feature Audit — Cardlink vs Professional Standards

> **Audit date**: 2026-03-22
> **Reference projects**: ERPNext, Odoo Inventory, InvenTree, OpenBoxes
> **Target audience**: SMC (Small & Medium Companies)
> **Methodology**: Feature-by-feature comparison against open-source ERP/inventory leaders

---

## Table of Contents

1. [Professional Function List](#1-professional-function-list)
2. [Professional Workflow List](#2-professional-workflow-list)
3. [Cardlink Feature Audit](#3-cardlink-feature-audit)
4. [Missing Features](#4-missing-features)
5. [SMC Readiness Assessment](#5-smc-readiness-assessment)
6. [Recommendations](#6-recommendations)

---

## 1. Professional Function List

Below is the comprehensive function list a professional inventory management app should have, compiled from ERPNext, Odoo Inventory, InvenTree, and industry best practices.

### A. Product / Item Master

| # | Function | Description |
|---|----------|-------------|
| A1 | Product CRUD | Create, read, update, delete product records |
| A2 | SKU Management | Unique stock-keeping-unit codes per product |
| A3 | Barcode / EAN Support | Assign and scan barcodes (EAN-13, Code-128, etc.) |
| A4 | Product Categories / Groups | Hierarchical category classification |
| A5 | Product Images | Upload and display product photos |
| A6 | Unit of Measure (UoM) | Track items in pcs, kg, litre, box, etc. |
| A7 | Multi-UoM Conversion | Auto-convert between units (e.g., 1 box = 12 pcs) |
| A8 | Item Variants / Attributes | Size, colour, material variants of same product |
| A9 | Product Types | Physical, service, digital, consumable |
| A10 | Active / Inactive Status | Enable or disable products without deletion |
| A11 | Reorder Level / Min Stock | Minimum stock threshold before reorder alert |
| A12 | Maximum Stock Level | Upper stock limit to prevent overstocking |
| A13 | Product Description / Notes | Detailed text descriptions and internal notes |
| A14 | Supplier Link per Product | Preferred supplier(s) per product |
| A15 | Cost Price / Selling Price | Dual pricing (purchase cost and sale price) |

### B. Stock / Warehouse Management

| # | Function | Description |
|---|----------|-------------|
| B1 | Real-time Stock Balances | Live on-hand quantity per product |
| B2 | Stock-In (Goods Receipt) | Record incoming inventory |
| B3 | Stock-Out (Goods Issue) | Record outgoing inventory |
| B4 | Stock Adjustment | Manual corrections for damaged/lost/found items |
| B5 | Multi-Warehouse / Location | Track inventory across multiple warehouses or stores |
| B6 | Internal Stock Transfer | Move stock between warehouses |
| B7 | Batch / Lot Tracking | Track groups of items by batch or lot number |
| B8 | Serial Number Tracking | Track individual items by unique serial number |
| B9 | Expiry Date Management | Track shelf life and expiry dates (FEFO) |
| B10 | Stock Valuation (FIFO/AVCO) | Calculate inventory value using FIFO, LIFO, or Average Cost |
| B11 | Negative Stock Prevention | Block stock-out when balance would go below zero |
| B12 | Cycle Counting | Scheduled partial stock counts (ABC analysis) |
| B13 | Full Physical Inventory | Complete stock-take with reconciliation |
| B14 | Stock Reservation | Reserve stock for pending sales or production orders |
| B15 | Bin / Shelf Location | Track storage position within a warehouse |

### C. Procurement / Purchasing

| # | Function | Description |
|---|----------|-------------|
| C1 | Supplier / Vendor Management | Full CRUD for supplier contacts |
| C2 | Purchase Requests (RFQ) | Internal requests to procure goods |
| C3 | Purchase Order Creation | Generate POs with line items linked to products |
| C4 | PO Approval Workflow | Draft → Approved → Ordered → Received workflow |
| C5 | Goods Receipt against PO | Receive items and auto-update inventory |
| C6 | Partial Receipts | Receive part of a PO; track remaining |
| C7 | Purchase Returns | Return defective goods to supplier |
| C8 | Supplier Contracts | Track contract terms, dates, and values |
| C9 | Landed Cost Allocation | Add shipping/customs/insurance to product cost |
| C10 | Automated Reorder | Auto-generate PO when stock falls below reorder point |

### D. Sales & Order Integration

| # | Function | Description |
|---|----------|-------------|
| D1 | POS Integration | Real-time stock deduction on POS sales |
| D2 | Sales Order Integration | Reserve and deduct stock on sales orders |
| D3 | E-commerce Stock Sync | Sync inventory with online store |
| D4 | Customer Returns / Refunds | Process returns and restock items |
| D5 | Delivery Notes / Packing Slips | Generate delivery documentation |
| D6 | Back-Order Management | Track unfulfilled orders due to stockouts |

### E. Reporting & Analytics

| # | Function | Description |
|---|----------|-------------|
| E1 | Stock Balance Report | Current on-hand by product/warehouse |
| E2 | Stock Movement History | Audit trail of all stock transactions |
| E3 | Inventory Valuation Report | Total inventory value by valuation method |
| E4 | Low Stock / Reorder Report | Products below reorder level |
| E5 | Inventory Aging Report | How long items have been in stock |
| E6 | Stock Turnover Analysis | Rate of inventory sell-through |
| E7 | Demand Forecasting | Predict future demand based on history |
| E8 | Supplier Performance Report | Delivery time, quality, reliability metrics |
| E9 | CSV / PDF Export | Export reports in standard formats |
| E10 | Dashboard / KPI View | Visual overview of key inventory metrics |

### F. Integration & Automation

| # | Function | Description |
|---|----------|-------------|
| F1 | Accounting Integration | Auto journal entries for stock movements |
| F2 | Low Stock Notifications | Alert when stock falls below threshold |
| F3 | Barcode Scanning Workflow | Scan to receive, pick, or adjust stock |
| F4 | API Access | REST/GraphQL API for external integration |
| F5 | Multi-Currency Support | Handle purchases and valuations in multiple currencies |
| F6 | Role-Based Access Control | Restrict inventory operations by user role |
| F7 | Audit Log / History | Track who changed what and when |
| F8 | Data Import / Export | Bulk import products and stock from CSV |
| F9 | Webhook / Event System | Publish events on stock changes |
| F10 | AI-Powered Suggestions | Smart reorder recommendations |

---

## 2. Professional Workflow List

### Workflow 1 — Inbound (Purchasing → Receipt → Stock)

```
Purchase Request (RFQ) → Approval → Purchase Order → Supplier Sends Goods
→ Goods Receipt → Quality Inspection → Stock Updated (Stock-In)
→ Accounting Entry (Debit Inventory / Credit AP)
```

### Workflow 2 — Outbound (Sales → Pick → Ship → Deduct)

```
Sales Order / POS Sale → Stock Reserved → Pick Items from Warehouse
→ Packing / Delivery Note → Ship to Customer → Stock Deducted (Stock-Out)
→ Accounting Entry (Debit COGS / Credit Inventory)
```

### Workflow 3 — Internal Transfer

```
Transfer Request → Approve → Pick from Source Warehouse
→ Transit → Receive at Destination Warehouse → Update Both Balances
```

### Workflow 4 — Stock Adjustment / Reconciliation

```
Schedule Cycle Count or Physical Inventory → Count Stock
→ Record Actual vs System → Generate Discrepancy Report
→ Approve Adjustment → Update Stock Balances
→ Accounting Entry (Adjustment Account)
```

### Workflow 5 — Returns (Customer)

```
Customer Return Request → Inspect Returned Goods
→ Accept Return → Restock (Stock-In) or Write-off (Damaged)
→ Issue Refund / Credit Note → Update Inventory + Accounting
```

### Workflow 6 — Returns (Supplier)

```
Identify Defective Goods → Create Return Request
→ Ship Back to Supplier → Record Stock-Out (Return)
→ Receive Credit Note or Replacement → Update Records
```

### Workflow 7 — Automated Replenishment

```
Stock Falls Below Reorder Level → System Alert / Notification
→ Auto-generate Purchase Request or PO → Approval → Order Sent
```

### Workflow 8 — Reporting & Analysis

```
Select Report Type → Apply Filters (Date, Product, Warehouse)
→ Generate Report → View on Dashboard or Export (CSV/PDF)
```

---

## 3. Cardlink Feature Audit

### A. Product / Item Master

| # | Function | Status | Cardlink Implementation |
|---|----------|--------|------------------------|
| A1 | Product CRUD | ✅ **Yes** | `inv_products` table + API (`/api/inventory/products`) + UI page (`/business/inventory`) |
| A2 | SKU Management | ✅ **Yes** | `sku` field on `inv_products` and `pos_products` |
| A3 | Barcode / EAN Support | ✅ **Yes** | `barcode` field on `pos_products` with input UI; `@zxing/browser` for scanning |
| A4 | Product Categories / Groups | ⚠️ **Partial** | `category` text field on `pos_products` and `store_categories` table for store; no dedicated inventory category hierarchy |
| A5 | Product Images | ✅ **Yes** | `image_url` on `pos_products`; `store_products` has image support |
| A6 | Unit of Measure (UoM) | ✅ **Yes** | `unit` field on `inv_products` (default: 'pcs') |
| A7 | Multi-UoM Conversion | ❌ **No** | Single UoM per product; no conversion tables |
| A8 | Item Variants / Attributes | ❌ **No** | No variant or attribute system |
| A9 | Product Types | ✅ **Yes** | `store_products.product_type` supports physical/service/digital |
| A10 | Active / Inactive Status | ✅ **Yes** | `is_active` boolean on `inv_products` and `pos_products` |
| A11 | Reorder Level / Min Stock | ✅ **Yes** | `reorder_level` on `inv_products` (default: 5); triggers low stock notification |
| A12 | Maximum Stock Level | ❌ **No** | No max stock threshold |
| A13 | Product Description / Notes | ⚠️ **Partial** | `store_products` has description; `inv_products` has name only |
| A14 | Supplier Link per Product | ⚠️ **Partial** | Linked via `proc_purchase_order_items.product_id`; no direct preferred-supplier field on product |
| A15 | Cost Price / Selling Price | ✅ **Yes** | `cost` and `price` on `pos_products`; `unit_cost` on PO items |

### B. Stock / Warehouse Management

| # | Function | Status | Cardlink Implementation |
|---|----------|--------|------------------------|
| B1 | Real-time Stock Balances | ✅ **Yes** | `inv_stock_balances.on_hand` updated atomically by `record_inventory_movement()` |
| B2 | Stock-In (Goods Receipt) | ✅ **Yes** | `movement_type='in'` via API + procurement goods receipt |
| B3 | Stock-Out (Goods Issue) | ✅ **Yes** | `movement_type='out'` via API + POS order auto-deduction |
| B4 | Stock Adjustment | ✅ **Yes** | `movement_type='adjust'` via manual movements |
| B5 | Multi-Warehouse / Location | ❌ **No** | Single company-scoped stock; no warehouse/location entity |
| B6 | Internal Stock Transfer | ❌ **No** | No transfer entity or workflow (requires multi-warehouse) |
| B7 | Batch / Lot Tracking | ❌ **No** | No batch_number or lot fields |
| B8 | Serial Number Tracking | ❌ **No** | No serial number field or entity |
| B9 | Expiry Date Management | ❌ **No** | No expiry_date field |
| B10 | Stock Valuation (FIFO/AVCO) | ❌ **No** | No valuation method; `unit_cost` is manual per PO |
| B11 | Negative Stock Prevention | ✅ **Yes** | `record_inventory_movement()` prevents on_hand going below 0 |
| B12 | Cycle Counting | ❌ **No** | No cycle count scheduling or count entry |
| B13 | Full Physical Inventory | ❌ **No** | No physical inventory / stock-take feature |
| B14 | Stock Reservation | ❌ **No** | No reserved quantity field or workflow |
| B15 | Bin / Shelf Location | ❌ **No** | No bin or shelf location tracking |

### C. Procurement / Purchasing

| # | Function | Status | Cardlink Implementation |
|---|----------|--------|------------------------|
| C1 | Supplier / Vendor Management | ✅ **Yes** | `proc_suppliers` table + UI (`/business/procurement/vendors`) |
| C2 | Purchase Requests (RFQ) | ✅ **Yes** | `proc_purchase_requests` with priority + status workflow |
| C3 | Purchase Order Creation | ✅ **Yes** | `proc_purchase_orders` + `proc_purchase_order_items` with product link |
| C4 | PO Approval Workflow | ✅ **Yes** | Status: draft → ordered → partial → received → cancelled |
| C5 | Goods Receipt against PO | ✅ **Yes** | `process_procurement_receipt()` auto-creates inventory movement + accounting entry |
| C6 | Partial Receipts | ✅ **Yes** | PO status supports 'partial'; receipt can cover subset of items |
| C7 | Purchase Returns | ❌ **No** | No return-to-supplier workflow |
| C8 | Supplier Contracts | ✅ **Yes** | `proc_contracts` table with lifecycle (draft/active/expired/terminated) |
| C9 | Landed Cost Allocation | ❌ **No** | No landed cost calculation or allocation |
| C10 | Automated Reorder | ⚠️ **Partial** | AI rule engine suggests reorders; no auto-PO generation |

### D. Sales & Order Integration

| # | Function | Status | Cardlink Implementation |
|---|----------|--------|------------------------|
| D1 | POS Integration | ✅ **Yes** | POS orders auto-deduct `inv_stock_balances` via `record_inventory_movement()` |
| D2 | Sales Order Integration | ⚠️ **Partial** | POS orders only; no separate sales order module |
| D3 | E-commerce Stock Sync | ⚠️ **Partial** | `store_products` exists separately; optional `inventory_item_id` link but no real-time sync |
| D4 | Customer Returns / Refunds | ⚠️ **Partial** | POS orders support `refunded` status; no automatic re-stock on refund |
| D5 | Delivery Notes / Packing Slips | ❌ **No** | No delivery note or packing slip generation |
| D6 | Back-Order Management | ❌ **No** | No back-order tracking |

### E. Reporting & Analytics

| # | Function | Status | Cardlink Implementation |
|---|----------|--------|------------------------|
| E1 | Stock Balance Report | ⚠️ **Partial** | API returns balances; no formatted report UI/page |
| E2 | Stock Movement History | ⚠️ **Partial** | `inv_stock_movements` table stores all movements; limited UI display |
| E3 | Inventory Valuation Report | ❌ **No** | No valuation report |
| E4 | Low Stock / Reorder Report | ⚠️ **Partial** | Low stock notifications exist; no dedicated report page |
| E5 | Inventory Aging Report | ❌ **No** | No aging analysis |
| E6 | Stock Turnover Analysis | ❌ **No** | No turnover calculation |
| E7 | Demand Forecasting | ❌ **No** | No forecasting engine |
| E8 | Supplier Performance Report | ❌ **No** | No delivery/quality metrics |
| E9 | CSV / PDF Export | ❌ **No** | No export functionality |
| E10 | Dashboard / KPI View | ⚠️ **Partial** | Inventory page shows product/balance counts; no charts or KPI dashboard |

### F. Integration & Automation

| # | Function | Status | Cardlink Implementation |
|---|----------|--------|------------------------|
| F1 | Accounting Integration | ✅ **Yes** | Procurement receipt → journal entry (Debit 1400 / Credit 2100); POS order → revenue entry |
| F2 | Low Stock Notifications | ✅ **Yes** | Urgent notification when `on_hand <= reorder_level` |
| F3 | Barcode Scanning Workflow | ⚠️ **Partial** | `@zxing/browser` scanner component exists; not integrated into receiving/picking workflows |
| F4 | API Access | ✅ **Yes** | REST API endpoints for all inventory operations |
| F5 | Multi-Currency Support | ✅ **Yes** | Company currency settings (MYR, HKD, SGD, USD) |
| F6 | Role-Based Access Control | ✅ **Yes** | RLS on all tables via `can_manage_company()`; company_members roles |
| F7 | Audit Log / History | ✅ **Yes** | `inv_stock_movements` with `created_by`, `operation_id`, `correlation_id`; idempotency keys |
| F8 | Data Import / Export | ❌ **No** | No bulk import or export |
| F9 | Webhook / Event System | ✅ **Yes** | Event types defined (`inventory.product.created`, `inventory.stock.moved`) |
| F10 | AI-Powered Suggestions | ✅ **Yes** | AI rule engine generates reorder action cards with confidence scoring |

---

### Workflow Audit

| # | Workflow | Status | Cardlink Implementation |
|---|----------|--------|------------------------|
| W1 | Inbound (Purchase → Receipt → Stock) | ✅ **Yes** | Purchase Request → PO → Goods Receipt → auto inventory + accounting |
| W2 | Outbound (Sales → Deduct) | ✅ **Yes** | POS order → auto stock-out → accounting entry |
| W3 | Internal Transfer | ❌ **No** | No multi-warehouse support |
| W4 | Stock Adjustment / Reconciliation | ⚠️ **Partial** | Manual adjustment via `movement_type='adjust'`; no cycle count or stock-take |
| W5 | Customer Returns | ⚠️ **Partial** | POS refund status exists; no auto-restock |
| W6 | Supplier Returns | ❌ **No** | No return-to-supplier workflow |
| W7 | Automated Replenishment | ⚠️ **Partial** | AI suggests reorders; manual action still required |
| W8 | Reporting & Analysis | ⚠️ **Partial** | Data stored; limited UI and no export |

---

## 4. Missing Features

### 🔴 Critical for SMC (High Priority)

These features are commonly needed by small and medium companies.

| # | Missing Feature | Impact | Recommendation |
|---|----------------|--------|----------------|
| 1 | **Multi-Warehouse / Location Support** | Cannot track stock across multiple stores, warehouses, or storage locations | Add `warehouses` table and `warehouse_id` to `inv_stock_balances` |
| 2 | **Inventory Reports with Export (CSV/PDF)** | No way to generate and share stock reports with management or accountant | Add report pages with export for balances, movements, valuation |
| 3 | **Stock-Take / Physical Inventory** | Cannot reconcile system stock vs physical count | Add stock count entry with discrepancy detection and adjustment |
| 4 | **Customer Return Re-Stock** | POS refund does not automatically restock items | Trigger `movement_type='in'` on refund approval |
| 5 | **Data Import / Bulk Upload** | Cannot import product catalog from spreadsheet | Add CSV upload for products and opening stock balances |
| 6 | **Inventory Dashboard / KPIs** | No visual overview of key inventory metrics | Add chart-based dashboard (stock value, low stock items, movement trends) |
| 7 | **Product Description on Inventory** | `inv_products` lacks description field | Add `description` text field to `inv_products` |

### 🟡 Important for Growth (Medium Priority)

These features become important as the company grows.

| # | Missing Feature | Impact | Recommendation |
|---|----------------|--------|----------------|
| 8 | **Batch / Lot Tracking** | Cannot trace product batches (important for food, cosmetics, pharma) | Add `batch_number` to stock movements |
| 9 | **Serial Number Tracking** | Cannot track individual high-value items (electronics, equipment) | Add `serial_numbers` entity linked to products |
| 10 | **Expiry Date Management** | Cannot manage perishable products | Add `expiry_date` field to batches |
| 11 | **Stock Valuation Methods** | Cannot calculate accurate COGS or inventory asset value | Implement FIFO or Weighted Average valuation |
| 12 | **Multi-UoM Conversion** | Cannot sell in pieces but purchase in boxes | Add UoM conversion table |
| 13 | **Item Variants / Attributes** | Cannot manage size/colour/material variants of same product | Add variant tables linked to master product |
| 14 | **Automated PO Generation** | AI suggests reorders but doesn't create POs | Connect AI action card approval to PO creation |
| 15 | **Supplier Link per Product** | No quick way to reorder from preferred supplier | Add `preferred_supplier_id` on `inv_products` |
| 16 | **Purchase Returns** | Cannot return defective goods to supplier | Add return workflow and stock-out type |
| 17 | **E-commerce Stock Sync** | Store products not auto-synced with inventory module | Implement real-time sync between `inv_stock_balances` and `store_products` |

### 🟢 Nice to Have (Low Priority)

These are advanced features for maturing businesses.

| # | Missing Feature | Impact | Recommendation |
|---|----------------|--------|----------------|
| 18 | **Internal Stock Transfers** | Needs multi-warehouse first | Build after multi-warehouse |
| 19 | **Bin / Shelf Location Tracking** | For large warehouses with many zones | Add `bin_location` field |
| 20 | **Stock Reservation** | Cannot reserve stock for pending sales | Add `reserved` qty to balances |
| 21 | **Cycle Counting** | Scheduled partial inventory counts | Add cycle count scheduling and entry |
| 22 | **Inventory Aging Report** | Identify slow-moving stock | Calculate age from first receipt date |
| 23 | **Stock Turnover Analysis** | Measure inventory efficiency | Calculate from sales vs avg stock |
| 24 | **Demand Forecasting** | Predict future stock needs | ML-based forecasting from sales history |
| 25 | **Supplier Performance Report** | Rate supplier reliability | Track delivery times and quality |
| 26 | **Delivery Notes / Packing Slips** | Professional shipping documents | Add printable delivery docs |
| 27 | **Back-Order Management** | Track unfulfilled orders | Add back-order entity |
| 28 | **Landed Cost Allocation** | Accurate product costing with freight/customs | Add cost allocation to receipt |
| 29 | **Maximum Stock Level** | Prevent overstocking | Add `max_stock` field to products |
| 30 | **Barcode Scanning for Receiving** | Scan to receive goods faster | Integrate scanner into goods receipt page |

---

## 5. SMC Readiness Assessment

### Scoring Summary

| Category | Functions Reviewed | ✅ Full | ⚠️ Partial | ❌ Missing | Coverage |
|----------|-------------------|---------|------------|-----------|----------|
| A. Product / Item Master | 15 | 9 | 3 | 3 | **73%** |
| B. Stock / Warehouse | 15 | 5 | 0 | 10 | **33%** |
| C. Procurement | 10 | 7 | 1 | 2 | **75%** |
| D. Sales Integration | 6 | 1 | 3 | 2 | **42%** |
| E. Reporting | 10 | 0 | 4 | 6 | **20%** |
| F. Integration & Automation | 10 | 7 | 1 | 2 | **75%** |
| **Workflows** | 8 | 2 | 4 | 2 | **50%** |
| **OVERALL** | **74** | **31** | **16** | **27** | **53%** |

### Readiness Verdict

**Cardlink covers approximately 53% of professional inventory features** when compared against open-source leaders like ERPNext and Odoo.

#### ✅ What Cardlink Does Well

- **Core inventory cycle**: Product → stock in/out/adjust → balance tracking is solid
- **Procurement pipeline**: Full RFQ → PO → Goods Receipt → auto-inventory workflow
- **Cross-module integration**: Procurement auto-posts to inventory and accounting
- **POS → Inventory sync**: Sales auto-deduct stock in real time
- **Low stock alerts**: Notification system with urgency levels
- **AI-powered assistance**: Unique differentiator vs traditional ERP systems
- **Security & multi-tenancy**: RLS, company isolation, role-based access
- **API-first design**: All inventory operations available via REST API
- **Idempotent operations**: Prevents duplicate stock movements

#### ⚠️ Gaps That Limit SMC Usage

1. **No multi-warehouse support** — Most SMCs operate from at least 2 locations (store + storage)
2. **No reporting or export** — SMCs need to share stock reports with owners, accountants, auditors
3. **No stock-take feature** — Physical inventory counting is a legal requirement in many jurisdictions
4. **No bulk data import** — SMCs migrating from spreadsheets need CSV import
5. **No batch/serial tracking** — Required for any SMC dealing with food, cosmetics, or electronics

#### 🏁 Overall Conclusion

> **Cardlink is a strong MVP-level inventory system** with excellent cross-module integration (POS, procurement, accounting, AI). However, it is **not yet comprehensive enough** to be the sole inventory management solution for a typical SMC.
>
> The core transaction engine (stock in/out/adjust, procurement receipt, POS deduction) is production-ready and well-architected. The key gaps are in **warehouse management**, **reporting/analytics**, and **traceability** (batch/serial/expiry).
>
> **To reach SMC-ready status**, prioritize the 7 high-priority items from the missing features list. This would bring coverage to approximately **75-80%** — sufficient for most SMCs in retail, services, and light manufacturing.

---

## 6. Recommendations

### Phase 1 — SMC Essentials (Recommended Next Sprint)

1. Add **inventory reports page** with stock balance, movement history, and CSV export
2. Add **stock-take / physical inventory** workflow for periodic counting
3. Add **product description** field to `inv_products`
4. Auto-restock on **POS refund** (connect refund to `movement_type='in'`)
5. Add **CSV import** for products and opening balances

### Phase 2 — Growth Features (Next 1-2 Months)

6. Implement **multi-warehouse** support with location-based stock balances
7. Add **batch / lot tracking** for traceability
8. Implement **stock valuation** (Weighted Average recommended for SMC simplicity)
9. Connect AI reorder suggestions to **auto-generate purchase orders**
10. Add **real-time sync** between inventory and e-commerce store products

### Phase 3 — Advanced Operations (3-6 Months)

11. Add serial number tracking
12. Implement cycle counting and ABC analysis
13. Add supplier performance metrics
14. Build inventory dashboard with charts and KPIs
15. Implement barcode scanning in goods receipt workflow

---

## Appendix — Feature Sources

| Source | Website | Type |
|--------|---------|------|
| ERPNext | [erpnext.com](https://erpnext.com) | Full ERP with inventory |
| Odoo Inventory | [odoo.com/app/inventory](https://www.odoo.com/app/inventory) | Modular inventory + WMS |
| InvenTree | [inventree.org](https://inventree.org) | Parts/component inventory |
| OpenBoxes | [openboxes.com](https://openboxes.com) | Supply chain / healthcare |

---

*This audit is based on the Cardlink codebase as of 2026-03-22, including 80+ database tables, 75+ API endpoints, and all UI pages across the inventory, POS, procurement, store, and accounting modules.*
