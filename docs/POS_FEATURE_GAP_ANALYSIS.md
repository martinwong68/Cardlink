# POS Feature Gap Analysis for SMC

> **Generated:** 2026-03-22
> **Benchmark:** Square POS · Loyverse · uniCenta (open-source) · Shopify POS
> **Scope:** Retail / Service SMC (Small & Medium Company)

---

## 1. Objective

Audit the Cardlink POS module against professional POS systems to determine whether
the application is comprehensive enough to handle all POS requirements for an SMC.

## 2. Scope In

- POS terminal checkout
- Product & catalogue management
- Order management
- Payment processing
- Shift & register management
- Customer / CRM integration
- Membership & loyalty integration
- Inventory integration
- Accounting integration
- Reporting & analytics
- Tax & discount management
- Receipt & printing
- Online-store sync
- Security & compliance

## 3. Scope Out

- Restaurant-specific features (kitchen display, table mapping, menu modifiers)
- Enterprise multi-warehouse logistics
- Hardware firmware / driver development
- Payment gateway provider-side implementation

**Rationale:** These are excluded because the analysis targets general retail / service
SMC operations. Restaurant-specific and enterprise logistics features serve different
market segments. Hardware and gateway provider-side work is vendor-dependent.

## 3a. Assumptions

- The benchmark is general retail / service SMC (1–50 employees, 1–5 locations)
- Feature parity with mid-tier POS products (Square Free–Plus, Loyverse Pro) is the target
- Cardlink's multi-tenant SaaS architecture (Next.js + Supabase) is the deployment model
- Existing cross-module integration contracts (POS → Inventory → Accounting) are stable
- Database schema columns referenced in this analysis exist in the live Supabase instance

---

## 4. Comprehensive Function List & Current Status

Below is every function a professional POS should have, grouped by category.
Each row shows whether Cardlink already implements it.

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented |
| ⚠️ | Partially implemented |
| ❌ | Missing — needs to be added |

---

### 4.1 Sales & Checkout (Terminal)

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 1 | Product search by name | ✅ | `terminal/page.tsx` — search input filters by name |
| 2 | Product search by SKU | ✅ | `terminal/page.tsx` — search also matches SKU |
| 3 | Barcode scanning lookup | ❌ | Barcode field exists on product but no scanner integration |
| 4 | Add item to cart | ✅ | Cart state in terminal with quantity tracking |
| 5 | Remove / adjust cart item quantity | ✅ | Remove button, quantity display per line |
| 6 | Apply line-item discount | ❌ | No discount field on cart items |
| 7 | Apply order-level discount | ❌ | No discount input on checkout screen |
| 8 | Apply coupon / promo code | ❌ | No coupon code input at terminal |
| 9 | Auto-calculate tax | ⚠️ | Hardcoded 8 %; no dynamic tax rate lookup |
| 10 | Multi-tax-rate support (per product/region) | ❌ | Single flat rate; `tax_rates` table exists in accounting but not used |
| 11 | Display real-time subtotal, tax, total | ✅ | Calculated on every cart change |
| 12 | Select payment method (cash / card / wallet) | ✅ | Three buttons on terminal |
| 13 | Split payment (multiple methods per order) | ❌ | Only one method recorded per order |
| 14 | Accept gift card / voucher | ❌ | No gift-card data model or UI |
| 15 | Hold / park sale (save for later) | ❌ | No saved-cart / parked-sale feature |
| 16 | Retrieve parked sale | ❌ | — |
| 17 | Customer lookup at checkout | ❌ | No customer association field on terminal |
| 18 | Attach customer to order | ❌ | `pos_orders.customer_name` exists but no picker UI |
| 19 | Award loyalty points on sale | ❌ | Membership tables ready but not triggered from POS |
| 20 | Redeem loyalty points / offer at checkout | ❌ | `offer_redemptions` table ready but no POS UI |
| 21 | Custom notes on order | ❌ | `pos_orders.notes` column exists but no UI input |
| 22 | Offline mode / queue sales when disconnected | ❌ | Cloud-only |
| 23 | Quick-add favourites / shortcut buttons | ❌ | No favourites panel |
| 24 | Product image display in terminal | ❌ | `image_url` column exists but terminal doesn't render images |

**Subtotal: 6 ✅ · 1 ⚠️ · 17 ❌**

---

### 4.2 Order Management

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 25 | View order history | ✅ | `orders/page.tsx` — filterable list |
| 26 | Filter orders by status | ✅ | All / completed / pending / cancelled / refunded tabs |
| 27 | Filter orders by date range | ❌ | No date picker on orders page |
| 28 | Filter orders by payment method | ❌ | Not implemented |
| 29 | View order detail / receipt | ⚠️ | Shows totals but no expandable line-item detail view |
| 30 | Print receipt | ❌ | No print or PDF generation |
| 31 | Email receipt to customer | ❌ | No email integration |
| 32 | Re-print / duplicate receipt | ❌ | — |
| 33 | Full refund | ✅ | `orders/[id]/route.ts` — PATCH to status `refunded` |
| 34 | Partial refund (specific items) | ❌ | Only full-order status change |
| 35 | Refund restocks inventory automatically | ❌ | No reverse `record_inventory_movement` on refund |
| 36 | Refund reverses accounting entry | ❌ | No reverse journal entry on refund |
| 37 | Refund adjusts loyalty points | ❌ | No point reversal on refund |
| 38 | Exchange (return + new sale) | ❌ | No exchange workflow |
| 39 | Void / cancel order before completion | ❌ | No void workflow |
| 40 | Order number / receipt search | ❌ | No search input on orders page |

**Subtotal: 3 ✅ · 1 ⚠️ · 12 ❌**

---

### 4.3 Product & Catalogue Management

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 41 | Create product | ✅ | `products/page.tsx` — inline form |
| 42 | Edit product | ✅ | `products/[id]/route.ts` — PATCH |
| 43 | Delete / deactivate product | ⚠️ | `is_active` toggle; no hard-delete |
| 44 | Product name, SKU, barcode | ✅ | All three fields in form |
| 45 | Product category | ✅ | Category text field |
| 46 | Category hierarchy / nesting | ❌ | Flat text; no parent-child structure |
| 47 | Product price & cost (margin) | ✅ | Both fields captured |
| 48 | Product variants (size, colour, etc.) | ❌ | No variant data model |
| 49 | Product images | ⚠️ | `image_url` column exists; no upload UI in POS products page |
| 50 | Product weight / dimensions | ❌ | Not in schema |
| 51 | Bulk import (CSV / Excel) | ❌ | No import feature |
| 52 | Bulk export | ❌ | No export feature |
| 53 | Product tags / labels | ❌ | No tags column |
| 54 | Low-stock indicator | ✅ | Red text when stock ≤ 5 |
| 55 | Stock count (local POS stock) | ✅ | `stock` field on `pos_products` |
| 56 | Link to central inventory | ✅ | `inv_product_id` FK to `inv_products` |
| 57 | Barcode label printing | ❌ | No print feature |
| 58 | Composite / bundle products | ❌ | No bundle data model |
| 59 | Product modifiers / add-ons | ❌ | No modifiers table |
| 60 | Unit of measure (pcs, kg, etc.) | ⚠️ | Hardcoded `unit='pcs'` in API; no UI selector |

**Subtotal: 8 ✅ · 3 ⚠️ · 9 ❌**

---

### 4.4 Payment Processing

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 61 | Cash payment | ✅ | Terminal supports cash |
| 62 | Card payment (credit / debit) | ⚠️ | UI has "card" option; no real gateway integration |
| 63 | Mobile wallet (Apple Pay / Google Pay) | ⚠️ | UI has "wallet" option; no real gateway integration |
| 64 | Payment state machine | ✅ | `checkout-intents/route.ts` — created → authorized → captured |
| 65 | Payment webhook processing | ✅ | `webhooks/payment/route.ts` — state transitions |
| 66 | Idempotent payment creation | ✅ | Idempotency key prevents duplicates |
| 67 | Split payment (multiple tenders) | ❌ | Single `payment_method` per order |
| 68 | Gift card acceptance | ❌ | No gift card module |
| 69 | Store credit | ❌ | No store credit balance tracking |
| 70 | Tips / gratuity | ❌ | No tip field on order |
| 71 | Change due calculation (cash) | ❌ | No cash tendered / change UI |
| 72 | Payment receipt | ❌ | No receipt generation on payment |
| 73 | PCI DSS compliance documentation | ❌ | Not documented |
| 74 | Contactless / NFC payment | ❌ | No hardware integration |

**Subtotal: 4 ✅ · 2 ⚠️ · 8 ❌**

---

### 4.5 Shift & Register Management

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 75 | Define registers | ✅ | `pos_registers` table + `/api/pos/registers` |
| 76 | Open shift (with opening cash) | ✅ | `shifts/page.tsx` — form with register selector |
| 77 | Close shift (with closing cash) | ✅ | `shifts/[id]/close/route.ts` |
| 78 | Cash variance calculation | ✅ | `variance` = expected − closing |
| 79 | Shift sales total | ✅ | `expected_cash` field tracked |
| 80 | Shift history | ✅ | Shifts list page shows all shifts |
| 81 | Restrict checkout without active shift | ⚠️ | Warning shown; but orders still allowed |
| 82 | Cash-in / cash-out (petty cash) | ❌ | No mid-shift cash drawer events |
| 83 | Blind close (cashier can't see expected) | ❌ | Expected cash visible |
| 84 | Shift report printout | ❌ | No print / PDF |
| 85 | Multi-register per shift | ❌ | One register per shift only |

**Subtotal: 6 ✅ · 1 ⚠️ · 4 ❌**

---

### 4.6 Customer Management (CRM Integration)

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 86 | Customer profiles | ✅ | `crm_contacts` table (name, email, phone, tags) |
| 87 | Link customer to POS order | ❌ | No FK on `pos_orders` → `crm_contacts`; `customer_name` is free-text |
| 88 | Purchase history per customer | ❌ | No customer-scoped order query |
| 89 | Customer search at terminal | ❌ | No customer lookup in terminal UI |
| 90 | Customer notes / preferences | ✅ | `crm_contacts.notes` field |
| 91 | Customer groups / segments | ⚠️ | `crm_contacts.tags` exists; no formal group table |
| 92 | Marketing opt-in tracking | ❌ | No consent field |
| 93 | Birthday / anniversary tracking | ❌ | No date-of-birth field on contacts |

**Subtotal: 2 ✅ · 1 ⚠️ · 5 ❌**

---

### 4.7 Membership & Loyalty Integration

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 94 | Loyalty program definition | ✅ | `membership_programs` table (3 rows) |
| 95 | Tier levels (Silver / Gold / Platinum) | ✅ | `membership_tiers` table (3 rows) |
| 96 | Points earn on POS purchase | ❌ | Tables ready; POS order API does not trigger point award |
| 97 | Points redeem at POS checkout | ❌ | No redemption UI on terminal |
| 98 | Offer / coupon redeem at POS | ❌ | `offer_redemptions` ready; no POS integration |
| 99 | Member lookup at terminal | ❌ | No member search UI |
| 100 | Auto tier upgrade on spend | ⚠️ | Schema supports it; no automation trigger |
| 101 | Points expiry processing | ❌ | No scheduled expiry job |
| 102 | Points reversal on refund | ❌ | No reverse logic |
| 103 | Member spend tracking from POS | ❌ | `membership_spend_transactions` ready; not triggered |

**Subtotal: 2 ✅ · 1 ⚠️ · 7 ❌**

---

### 4.8 Inventory Integration

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 104 | Auto stock deduction on sale | ✅ | `record_inventory_movement(out)` on order create |
| 105 | Idempotent stock movement | ✅ | Idempotency key per order-item |
| 106 | Stock movement audit trail | ✅ | `inv_stock_movements` table with reference |
| 107 | Stock balance view | ✅ | `inv_stock_balances` table + API |
| 108 | Low-stock alert / notification | ⚠️ | UI badge on POS dashboard; no push/email notification |
| 109 | Auto reorder / purchase order generation | ❌ | `procurement` module exists but no auto-PO trigger |
| 110 | Stock adjustment (manual count) | ⚠️ | `movement_type='adjust'` supported; no dedicated POS UI |
| 111 | Multi-location stock view | ❌ | Single company scope; no warehouse/location dimension |
| 112 | Stock transfer between locations | ❌ | — |
| 113 | Stock return on refund | ❌ | Refund does not call `record_inventory_movement(in)` |
| 114 | Batch / serial number tracking | ❌ | Not in schema |
| 115 | Expiry date tracking | ❌ | Not in schema |

**Subtotal: 4 ✅ · 2 ⚠️ · 6 ❌**

---

### 4.9 Accounting Integration

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 116 | Auto journal entry on sale | ✅ | `createPosOrderJournalEntry()` — Dr Cash / Cr Revenue |
| 117 | Idempotent journal entry | ✅ | `idempotency_key = 'pos-order-{id}'` |
| 118 | Account auto-creation | ✅ | Default accounts 1100, 4100 created if missing |
| 119 | Reverse journal on refund | ❌ | No reversal logic |
| 120 | Tax liability entry | ❌ | Tax collected not booked to liability account |
| 121 | COGS entry on sale | ❌ | No Cost of Goods Sold journal (Dr COGS / Cr Inventory) |
| 122 | Shift reconciliation → accounting | ❌ | Cash variance not posted to GL |
| 123 | Multi-currency POS | ❌ | Orders assumed single currency |

**Subtotal: 3 ✅ · 0 ⚠️ · 5 ❌**

---

### 4.10 Reporting & Analytics

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 124 | Daily sales summary | ❌ | No dedicated report view |
| 125 | Sales by product report | ❌ | — |
| 126 | Sales by category report | ❌ | — |
| 127 | Sales by employee / cashier | ❌ | — |
| 128 | Sales by payment method | ❌ | — |
| 129 | Sales by time-of-day / hourly | ❌ | — |
| 130 | Gross profit report | ❌ | Cost data exists but no report |
| 131 | Tax collected report | ❌ | — |
| 132 | Discount / promotion report | ❌ | — |
| 133 | Inventory valuation report | ❌ | — |
| 134 | Top-selling products | ❌ | — |
| 135 | Slow-moving products | ❌ | — |
| 136 | Customer purchase frequency | ❌ | — |
| 137 | Dashboard KPI widgets | ⚠️ | POS landing shows today's sales & order count; minimal |
| 138 | Export reports (CSV / PDF) | ❌ | No export |
| 139 | Scheduled report email | ❌ | No scheduled reports |

**Subtotal: 0 ✅ · 1 ⚠️ · 15 ❌**

---

### 4.11 Tax & Discount Configuration

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 140 | Tax rate configuration | ⚠️ | `tax_rates` table in accounting module; POS uses hardcoded 8% |
| 141 | Multiple tax rates per region | ❌ | Table supports it; POS doesn't query it |
| 142 | Tax-inclusive / tax-exclusive pricing | ❌ | No toggle |
| 143 | Tax exemption for specific products | ❌ | — |
| 144 | Discount types (% / fixed) | ⚠️ | `company_offers` table supports both; not used in POS terminal |
| 145 | Discount rules (min purchase, member-only) | ⚠️ | `company_offers` has `usage_limit`; not integrated |
| 146 | Scheduled promotions (start / end date) | ❌ | `company_offers` has dates; POS doesn't check |
| 147 | Automatic discount application | ❌ | — |

**Subtotal: 0 ✅ · 3 ⚠️ · 5 ❌**

---

### 4.12 Receipt & Printing

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 148 | Generate receipt number | ✅ | `RCP-{timestamp}` format on order |
| 149 | Customisable receipt template | ❌ | No template system |
| 150 | Thermal printer support | ❌ | No printing integration |
| 151 | PDF receipt generation | ❌ | — |
| 152 | Email receipt | ❌ | — |
| 153 | SMS receipt | ❌ | — |
| 154 | QR code on receipt (for returns) | ❌ | — |
| 155 | Receipt branding (logo, footer) | ❌ | — |

**Subtotal: 1 ✅ · 0 ⚠️ · 7 ❌**

---

### 4.13 Employee / User Management at POS

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 156 | Cashier login per session | ⚠️ | `pos_shifts.user_id` tracks user; but no PIN-based fast switch |
| 157 | Role-based POS permissions | ⚠️ | `company_members.role` exists; not granularly enforced in POS |
| 158 | Manager override for discounts / voids | ❌ | No approval workflow |
| 159 | Employee sales tracking | ❌ | `pos_orders.created_by` exists; no reporting |
| 160 | Commission / incentive tracking | ❌ | — |
| 161 | Clock-in / clock-out | ⚠️ | HR module `hr_attendance` exists; not linked to POS shift |
| 162 | Employee PIN for quick switch | ❌ | — |

**Subtotal: 0 ✅ · 3 ⚠️ · 4 ❌**

---

### 4.14 Online Store Sync (Omnichannel)

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 163 | Shared product catalogue | ⚠️ | `store_products` and `pos_products` are separate tables; can be linked |
| 164 | Unified inventory across channels | ❌ | Separate stock fields; no real-time sync |
| 165 | Online order visible in POS | ❌ | No store-order → POS-order bridge |
| 166 | Unified customer profile (online + in-store) | ❌ | — |
| 167 | Click-and-collect / BOPIS | ❌ | — |

**Subtotal: 0 ✅ · 1 ⚠️ · 4 ❌**

---

### 4.15 Security & Compliance

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 168 | Row-Level Security on all POS tables | ✅ | RLS via `can_manage_company()` |
| 169 | Authentication required for all routes | ✅ | `requireBusinessActiveCompanyContext()` guard |
| 170 | Audit log for sensitive actions | ⚠️ | `admin_audit_log` table exists; not triggered from POS |
| 171 | PCI DSS documentation | ❌ | Not present |
| 172 | GDPR / privacy compliance | ❌ | No data retention or consent features |
| 173 | Data backup / export capability | ❌ | No self-service backup |

**Subtotal: 2 ✅ · 1 ⚠️ · 3 ❌**

---

### 4.16 Hardware & Device Support

| # | Function | Status | Cardlink Evidence |
|---|----------|--------|-------------------|
| 174 | Barcode scanner input | ❌ | No scanner integration |
| 175 | Receipt printer support | ❌ | — |
| 176 | Cash drawer trigger | ❌ | — |
| 177 | Customer-facing display | ❌ | — |
| 178 | Tablet / mobile responsive POS | ⚠️ | Web-based; responsive framework but not optimised for tablet POS |

**Subtotal: 0 ✅ · 1 ⚠️ · 4 ❌**

---

## 5. Summary Scorecard

| Category | Total | ✅ Done | ⚠️ Partial | ❌ Missing | Coverage |
|----------|-------|---------|------------|-----------|----------|
| 4.1 Sales & Checkout | 24 | 6 | 1 | 17 | 25 % |
| 4.2 Order Management | 16 | 3 | 1 | 12 | 19 % |
| 4.3 Product & Catalogue | 20 | 8 | 3 | 9 | 40 % |
| 4.4 Payment Processing | 14 | 4 | 2 | 8 | 29 % |
| 4.5 Shift & Register | 11 | 6 | 1 | 4 | 55 % |
| 4.6 Customer / CRM | 8 | 2 | 1 | 5 | 25 % |
| 4.7 Membership & Loyalty | 10 | 2 | 1 | 7 | 20 % |
| 4.8 Inventory Integration | 12 | 4 | 2 | 6 | 33 % |
| 4.9 Accounting Integration | 8 | 3 | 0 | 5 | 38 % |
| 4.10 Reporting & Analytics | 16 | 0 | 1 | 15 | 0 % |
| 4.11 Tax & Discount | 8 | 0 | 3 | 5 | 0 % |
| 4.12 Receipt & Printing | 8 | 1 | 0 | 7 | 13 % |
| 4.13 Employee / User | 7 | 0 | 3 | 4 | 0 % |
| 4.14 Online Store Sync | 5 | 0 | 1 | 4 | 0 % |
| 4.15 Security & Compliance | 6 | 2 | 1 | 3 | 33 % |
| 4.16 Hardware & Device | 5 | 0 | 1 | 4 | 0 % |
| **TOTAL** | **178** | **41** | **22** | **115** | **23 %** |

> **Overall coverage: 41 fully implemented out of 178 functions (23 %).**
> Including partial implementations: 63 / 178 (35 %).

---

## 6. Workflow Coverage

### 6.1 Checkout Workflow

| Step | Professional POS | Cardlink Status |
|------|-----------------|-----------------|
| 1. Scan / search products | ✅ Search by name & SKU | ⚠️ No barcode scan |
| 2. Add to cart | ✅ Implemented | |
| 3. Apply discounts / coupons | ❌ Not implemented | |
| 4. Identify customer (loyalty lookup) | ❌ Not implemented | |
| 5. Select payment method | ✅ Cash / card / wallet | |
| 6. Process payment | ⚠️ State machine ready; no live gateway | |
| 7. Print / email receipt | ❌ Not implemented | |
| 8. Update inventory | ✅ Auto stock deduction | |
| 9. Award loyalty points | ❌ Not implemented | |
| 10. Record in accounting | ✅ Auto journal entry | |

**Workflow completeness: 4/10 steps fully done**

---

### 6.2 Refund / Return Workflow

| Step | Professional POS | Cardlink Status |
|------|-----------------|-----------------|
| 1. Look up original order / receipt | ⚠️ Order list exists; no search by receipt # | |
| 2. Validate return eligibility | ❌ No return-policy engine | |
| 3. Select items to return | ❌ Only full-order refund | |
| 4. Process refund to original method | ❌ Status change only; no payment reversal | |
| 5. Restock returned items | ❌ No inventory reversal | |
| 6. Reverse loyalty points | ❌ Not implemented | |
| 7. Reverse accounting entry | ❌ Not implemented | |
| 8. Issue refund receipt | ❌ Not implemented | |

**Workflow completeness: 0/8 steps fully done**

---

### 6.3 End-of-Day / Shift Close Workflow

| Step | Professional POS | Cardlink Status |
|------|-----------------|-----------------|
| 1. Count cash in drawer | ✅ Closing cash input | |
| 2. Compare to system total | ✅ Variance calculation | |
| 3. Record cash over / short | ✅ Variance shown | |
| 4. Print shift summary report | ❌ No print / PDF | |
| 5. Reconcile card payments | ❌ No card batch settlement | |
| 6. Secure cash / prepare deposit | ❌ No cash deposit tracking | |
| 7. Sync to accounting | ❌ Shift variance not posted to GL | |
| 8. Lock POS for next day | ❌ No lock-down state | |

**Workflow completeness: 3/8 steps fully done**

---

### 6.4 Stock Management Workflow

| Step | Professional POS | Cardlink Status |
|------|-----------------|-----------------|
| 1. Receive goods from supplier | ✅ Procurement module creates receipt | |
| 2. Verify against purchase order | ✅ `process_procurement_receipt()` validates | |
| 3. Update stock levels | ✅ `record_inventory_movement(in)` | |
| 4. Cycle count / physical audit | ⚠️ Manual adjust supported; no count UI | |
| 5. Low-stock alerts | ⚠️ UI badge; no push notification | |
| 6. Auto reorder (generate PO) | ❌ Not implemented | |
| 7. Returns to supplier | ❌ Not implemented | |
| 8. Shrinkage / damage recording | ⚠️ adjust movement type; no specific reason category | |
| 9. Inventory valuation report | ❌ Not implemented | |

**Workflow completeness: 3/9 steps fully done**

---

### 6.5 Customer Loyalty Workflow

| Step | Professional POS | Cardlink Status |
|------|-----------------|-----------------|
| 1. Customer signs up for membership | ✅ Membership account creation exists | |
| 2. Member identified at POS | ❌ No member lookup at terminal | |
| 3. Points earned on purchase | ❌ Not triggered from POS | |
| 4. Points shown on receipt | ❌ No receipt integration | |
| 5. Member redeems points / offer | ❌ No redemption at POS | |
| 6. Tier upgrade on threshold | ⚠️ Schema supports; no automation | |
| 7. Points expire on schedule | ❌ No expiry job | |

**Workflow completeness: 1/7 steps fully done**

---

### 6.6 Product Management Workflow

| Step | Professional POS | Cardlink Status |
|------|-----------------|-----------------|
| 1. Create product with details | ✅ Name, SKU, barcode, category, price, cost | |
| 2. Set pricing & cost | ✅ Price & cost fields | |
| 3. Assign category | ✅ Category text field | |
| 4. Upload product image | ❌ No upload UI | |
| 5. Set tax class | ❌ No per-product tax | |
| 6. Link to inventory | ✅ `inv_product_id` FK | |
| 7. Print barcode label | ❌ Not implemented | |
| 8. Bulk import products | ❌ Not implemented | |

**Workflow completeness: 4/8 steps fully done**

---

## 7. Critical Missing Functions (Priority List)

The following are **must-have** features for a professional SMC POS, ranked by business impact:

### Priority 1 — Essential (Blocks daily operations)

| # | Missing Function | Impact | Effort |
|---|-----------------|--------|--------|
| 1 | **Dynamic tax rate** — Use `tax_rates` table instead of hardcoded 8% | Tax compliance | Low |
| 2 | **Refund with inventory reversal** — Call `record_inventory_movement(in)` on refund | Stock accuracy | Medium |
| 3 | **Refund with accounting reversal** — Create reverse journal entry | GL accuracy | Medium |
| 4 | **Partial refund** — Refund specific line items | Customer service | Medium |
| 5 | **Receipt printing / PDF** — Generate printable receipt | Customer expectation | Medium |
| 6 | **Order-level discount** — Apply discount before payment | Daily promotions | Low |
| 7 | **Customer attach to order** — Link CRM contact or membership | Customer tracking | Low |
| 8 | **Cash change calculation** — Show amount tendered & change due | Cashier accuracy | Low |
| 9 | **Daily sales report** — Summary of sales, tax, payment methods | Management visibility | Medium |

### Priority 2 — Important (Required within first quarter)

| # | Missing Function | Impact | Effort |
|---|-----------------|--------|--------|
| 10 | **Loyalty points earn on POS sale** | Customer retention | Medium |
| 11 | **Loyalty points redeem at checkout** | Customer engagement | Medium |
| 12 | **Barcode scanner integration** | Checkout speed | Low |
| 13 | **Sales by product / category report** | Buying decisions | Medium |
| 14 | **Split payment** | Customer convenience | Medium |
| 15 | **Hold / park sale** | Multi-customer handling | Medium |
| 16 | **Employee sales tracking report** | Performance management | Low |
| 17 | **Date range filter on orders** | Order lookup | Low |
| 18 | **Product image display in terminal** | Visual identification | Low |

### Priority 3 — Nice to Have (Enhances competitiveness)

| # | Missing Function | Impact | Effort |
|---|-----------------|--------|--------|
| 19 | Email receipt to customer | Paperless option | Medium |
| 20 | Bulk product import / export | Setup efficiency | Medium |
| 21 | Product variants (size, colour) | Catalogue richness | High |
| 22 | Gift card / store credit | Additional payment method | High |
| 23 | Scheduled promotions | Marketing automation | Medium |
| 24 | Offline mode | Reliability | High |
| 25 | Multi-location inventory | Growth readiness | High |
| 26 | Customer-facing display | Transparency | Medium |
| 27 | Audit log for POS actions | Compliance | Low |

---

## 8. Verdict: Is the App Comprehensive Enough?

### Current Assessment

| Criteria | Verdict |
|----------|---------|
| Can it process a basic sale? | ✅ Yes |
| Can it handle daily retail operations end-to-end? | ❌ No — missing discounts, proper refunds, reports |
| Is it comparable to Square / Loyverse? | ❌ No — at ~23% feature coverage |
| Is the foundation solid for expansion? | ✅ Yes — schema, cross-module integration, state machines are well-designed |

### What the App Does Well

1. **Cross-module integration architecture** — POS → Inventory → Accounting pipeline is production-ready with idempotency
2. **Payment state machine** — Professional webhook-based payment flow with state transitions
3. **Database schema design** — All 7 POS tables are well-normalised with proper FKs
4. **Security** — RLS, authentication guards, company isolation
5. **Shift management** — Cash reconciliation with variance tracking

### What Needs Work

1. **Reporting is completely absent** — No sales reports, analytics, or export
2. **Refund workflow is incomplete** — No inventory/accounting reversal
3. **Customer & loyalty at POS is missing** — Tables ready but no integration
4. **Tax is hardcoded** — Must be dynamic for compliance
5. **Discounts not functional at POS** — Structure exists in `company_offers` but not wired
6. **Receipt generation missing** — No print or digital receipt capability
7. **Hardware integration absent** — No barcode scanner, printer, or cash drawer support

### Conclusion

> **The Cardlink POS is a solid MVP skeleton (23% coverage) with excellent infrastructure
> (idempotency, state machines, cross-module hooks), but it is NOT yet comprehensive enough
> for daily SMC operations.** The 9 Priority-1 items must be addressed before the POS can
> be considered production-ready for a small-medium company.

---

## 9. Risks and Mitigations

| Risk | Likelihood | Mitigation | Done Condition |
|------|-----------|------------|----------------|
| Tax non-compliance due to hardcoded rate | High | Wire `tax_rates` table to POS terminal (Priority 1) | Tax calculation matches `tax_rates` table for 100 % of transactions; hardcoded 8 % removed |
| Inventory drift from unprocessed refunds | High | Implement refund → stock reversal | Refund of order N creates `inv_stock_movements` record with `movement_type='in'` and balance incremented |
| GL imbalance from refunds without reversal | High | Implement refund → accounting reversal | Reverse journal entry created (Dr Revenue / Cr Cash) with idempotency key; GL net-zero for refunded orders |
| Poor customer retention without loyalty | Medium | Connect membership earn/redeem to POS | Points awarded on order completion; redeemable at terminal; validated with 10+ test transactions in staging |
| Inability to troubleshoot with no reports | High | Build daily sales summary as first report | `/api/pos/reports/daily` returns totals by payment method, tax collected, and order count for any date range |

---

## 10. Acceptance Checklist (for "Comprehensive POS")

A Cardlink POS can be considered **comprehensive for an SMC** when:

- [ ] Dynamic tax rates pulled from configuration
- [ ] Discounts can be applied at checkout (% and fixed)
- [ ] Full and partial refunds with inventory + accounting reversal
- [ ] Receipt generation (PDF or print)
- [ ] Customer / member association on orders
- [ ] Loyalty points earned and redeemable at POS
- [ ] Daily sales summary report
- [ ] Sales by product and category reports
- [ ] Barcode scanner input supported
- [ ] Cash change calculation displayed
- [ ] Split payment across multiple methods
- [ ] Date-range filtering on order history
- [ ] Employee sales tracking
- [ ] Shift close report printable
- [ ] Audit log entries for refunds and voids
