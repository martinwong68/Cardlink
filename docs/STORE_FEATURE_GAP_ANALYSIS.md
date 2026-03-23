# Store Feature Gap Analysis for SMC

> **Generated:** 2025-07-17
> **Benchmark:** WooCommerce · Medusa.js · Saleor · PrestaShop · Shopify (open-source alternatives)
> **Scope:** Online Store / E-commerce for SMC (Small & Medium Company)

---

## 1. Objective

Audit the Cardlink store module against professional open-source e-commerce platforms
to determine whether the application is comprehensive enough to serve as a full online
store for an SMC. Identify gaps, prioritize missing features, and recommend a path to
feature completeness.

## 2. Scope In

- Online store product catalog & management
- Category & taxonomy management
- Order management & lifecycle
- Customer management
- Inventory & stock management
- Pricing, discounts & promotions
- Payment processing
- Shipping & delivery
- Tax management
- Store analytics & reporting
- Store design & customization
- SEO & marketing
- Store configuration
- Multi-channel & integration
- Security & compliance

## 3. Scope Out

- Restaurant-specific features (menu modifiers, kitchen display, table service)
- POS terminal features (covered in POS_FEATURE_GAP_ANALYSIS.md)
- B2B wholesale features (custom pricing tiers, quote-to-order)
- Marketplace / multi-vendor storefront
- Enterprise logistics (multi-warehouse routing, 3PL integration)
- Payment gateway provider-side implementation

**Rationale:** These are excluded because the analysis targets SMC online retail / service
store operations. POS-specific features are covered in a separate analysis. Enterprise
and marketplace features serve different market segments.

## 3a. Assumptions

- The benchmark is general retail / service SMC (1–50 employees, online-first or hybrid)
- Feature parity with mid-tier open-source e-commerce (WooCommerce, Medusa.js) is the target
- Cardlink's multi-tenant SaaS architecture (Next.js + Supabase) is the deployment model
- Existing cross-module integration contracts (Store → POS → Inventory → Accounting) are stable
- POS module provides order management, checkout, payment, and reporting capabilities
- Database schema columns referenced in this analysis exist in the live Supabase instance

---

## 4. Comprehensive Function List & Current Status

Below is every function a professional online store should have, grouped by category.
Each row shows whether Cardlink already implements it.

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented |
| ⚠️ | Partially implemented — detail in Notes |
| ❌ | Missing — needs to be added |

> **Cross-module note:** Where a feature exists in another Cardlink module (POS, Inventory,
> Accounting) but is not surfaced or integrated in the store module, it is marked ⚠️ Partial.

---

### 4.1 Product Management

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 1 | Create / edit / delete products | ✅ | Full CRUD in `store/products/page.tsx` |
| 2 | Product name & description | ✅ | Text fields with validation |
| 3 | Product slug (URL-friendly) | ✅ | Auto-generated unique slug per company |
| 4 | Product pricing (base price) | ✅ | `price` field (numeric) |
| 5 | Compare-at / strike-through price | ✅ | `compare_at_price` for sale display |
| 6 | Product images (multiple) | ✅ | JSONB array with compression (1024px, 0.8 JPEG) |
| 7 | Image gallery with reorder | ❌ | Images stored as array but no drag-to-reorder UI |
| 8 | Product types (physical / service / digital) | ✅ | Three types with type-specific fields |
| 9 | SKU (Stock Keeping Unit) | ✅ | Optional SKU field |
| 10 | Barcode / UPC / EAN | ❌ | No barcode field on store products (exists on POS products) |
| 11 | Product weight | ✅ | `weight` field for physical products |
| 12 | Product dimensions (L×W×H) | ❌ | No dimension fields in schema |
| 13 | Digital product file attachment | ✅ | `file_url` field for digital products |
| 14 | Service duration | ✅ | `duration_minutes` for service products |
| 15 | Product active / inactive toggle | ✅ | `is_active` boolean with UI toggle |
| 16 | Product variants (size, color, etc.) | ❌ | No variant schema; single product record only |
| 17 | Variant-level pricing | ❌ | No variant support |
| 18 | Variant-level stock tracking | ❌ | No variant support |
| 19 | Variant-level images | ❌ | No variant support |
| 20 | Product attributes / custom fields | ❌ | No custom metadata or attribute schema |
| 21 | Product tags | ❌ | No tagging system |
| 22 | Related / upsell products | ❌ | No product relationship schema |
| 23 | Product reviews & ratings | ❌ | No review schema or UI |
| 24 | Bulk product import (CSV / Excel) | ❌ | No import functionality |
| 25 | Bulk product export | ❌ | No export functionality |
| 26 | Product duplication / clone | ❌ | No clone action in UI |
| 27 | Product search & filter (admin) | ⚠️ | Category filter exists; no text search in admin list |
| 28 | Low stock alerts | ❌ | No notification when stock is low |
| 29 | Product collections / bundles | ❌ | No bundle or collection schema |
| 30 | Downloadable file management | ⚠️ | `file_url` exists but no download tracking or expiry |

**Subtotal: 13 ✅ · 2 ⚠️ · 15 ❌**

---

### 4.2 Category & Taxonomy

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 31 | Create / edit / delete categories | ✅ | Full CRUD in `store/categories/page.tsx` |
| 32 | Category name & slug | ✅ | Auto-slugify with unique per company |
| 33 | Category description | ✅ | Optional text description |
| 34 | Category icon | ✅ | Icon field for display |
| 35 | Category sort order | ✅ | Drag-to-reorder via `sort_order` |
| 36 | Category active / inactive toggle | ✅ | `is_active` boolean |
| 37 | Product count per category | ✅ | Displayed in category list UI |
| 38 | Category image / banner | ❌ | No image field; only icon |
| 39 | Nested / hierarchical categories | ❌ | Flat structure; no `parent_id` field |
| 40 | Category-based navigation | ✅ | StorePreview has category filter tabs |
| 41 | Category SEO metadata | ❌ | No meta_title / meta_description |
| 42 | Product tags / labels | ❌ | No tag taxonomy system |
| 43 | Product filtering by attributes | ❌ | No attribute-based filtering |
| 44 | Breadcrumb navigation | ❌ | No breadcrumb UI on storefront |

**Subtotal: 8 ✅ · 0 ⚠️ · 6 ❌**

---

### 4.3 Order Management

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 45 | Create order (online checkout) | ❌ | No online checkout flow; POS module has checkout |
| 46 | Order list with filters | ⚠️ | Exists in POS (`pos/orders`); not in store module |
| 47 | Order detail view | ⚠️ | Exists in POS; not linked from store |
| 48 | Order status tracking | ⚠️ | POS has `completed/voided/refunded`; missing `pending/processing/shipped/delivered` |
| 49 | Order number (human-readable) | ⚠️ | POS has `order_number`; not in store |
| 50 | Order notes (admin & customer) | ⚠️ | POS has `notes` field; no customer-facing notes |
| 51 | Order email notifications | ❌ | No email triggers on order events |
| 52 | Order confirmation page | ❌ | No post-checkout confirmation UI |
| 53 | Order history (customer-facing) | ❌ | No customer order history page |
| 54 | Order invoice generation | ❌ | No PDF / printable invoice from store |
| 55 | Order editing (modify after placed) | ❌ | No order edit capability |
| 56 | Order cancellation | ⚠️ | POS has `voided` status; no customer-facing cancel |
| 57 | Partial order fulfillment | ❌ | No fulfillment tracking schema |
| 58 | Backorder support | ❌ | No backorder capability |
| 59 | Guest checkout (no account needed) | ❌ | No online checkout at all |
| 60 | Draft / manual orders | ❌ | No draft order creation |

**Subtotal: 0 ✅ · 6 ⚠️ · 10 ❌**

---

### 4.4 Customer Management

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 61 | Customer registration | ❌ | No customer-facing account creation for store |
| 62 | Customer login / authentication | ❌ | No customer auth for storefront |
| 63 | Customer profile management | ❌ | No customer profile page |
| 64 | Customer address book | ❌ | No address management |
| 65 | Customer order history | ❌ | No customer-facing order history |
| 66 | Customer groups / segments | ❌ | No customer grouping in store context |
| 67 | Customer wishlist | ❌ | No wishlist feature |
| 68 | Customer communication (email) | ❌ | No customer email from store |
| 69 | CRM integration | ⚠️ | POS has `customer_id` FK to CRM; store has no customer linkage |
| 70 | Loyalty points integration | ⚠️ | Membership module tables exist; no store integration |
| 71 | Customer notes (admin) | ❌ | No customer notes in store context |

**Subtotal: 0 ✅ · 2 ⚠️ · 9 ❌**

---

### 4.5 Inventory & Stock

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 72 | Stock quantity per product | ✅ | `stock_quantity` field on store products |
| 73 | Inventory module linkage | ✅ | `inventory_item_id` FK to `inv_products` |
| 74 | Auto-deduct on sale | ⚠️ | POS auto-deducts via `record_inventory_movement()`; no store online deduction |
| 75 | Auto-restock on refund | ⚠️ | POS refund restocks; no store refund flow |
| 76 | Stock status display (in stock / out of stock) | ❌ | No stock badge on storefront product cards |
| 77 | Low stock threshold alerts | ❌ | No configurable threshold or notification |
| 78 | Stock reservation (cart hold) | ❌ | No stock reservation during checkout |
| 79 | Backorder / pre-order toggle | ❌ | No backorder capability |
| 80 | Multi-location stock | ❌ | Single stock quantity; no warehouse-level stock |
| 81 | Stock history / audit log | ⚠️ | Inventory module has `inv_stock_movements`; not surfaced in store |
| 82 | Bulk stock update | ❌ | No bulk stock adjustment in store UI |
| 83 | Stock sync across channels | ❌ | Store and POS have separate stock; no real-time sync |

**Subtotal: 2 ✅ · 3 ⚠️ · 7 ❌**

---

### 4.6 Pricing & Discounts

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 84 | Base price per product | ✅ | `price` field |
| 85 | Compare-at / original price | ✅ | `compare_at_price` for sale display |
| 86 | Percentage discount | ✅ | `discount_type = 'percentage'` |
| 87 | Fixed amount discount | ✅ | `discount_type = 'fixed'` |
| 88 | Discount applies to all products | ✅ | `applies_to = 'all'` |
| 89 | Discount applies to category | ✅ | `applies_to = 'category'` with target_id |
| 90 | Discount applies to specific product | ✅ | `applies_to = 'product'` with target_id |
| 91 | Discount date range (start / end) | ✅ | `start_date` / `end_date` with status badges |
| 92 | Discount active toggle | ✅ | `is_active` boolean |
| 93 | Discount status (active / expired / scheduled) | ✅ | Computed from dates in UI |
| 94 | Coupon codes | ❌ | No coupon code schema or input |
| 95 | Usage limit per coupon | ❌ | No usage tracking |
| 96 | Usage limit per customer | ❌ | No per-customer limit |
| 97 | Minimum order amount for discount | ❌ | No `min_order` field (POS discounts have it) |
| 98 | Buy-X-get-Y promotions | ❌ | No BOGO rule engine |
| 99 | Bulk / tiered pricing | ❌ | No quantity-based price breaks |
| 100 | Customer group pricing | ❌ | No group-based pricing |
| 101 | Flash sale scheduling | ⚠️ | Date ranges exist but no flash sale UI or countdown |
| 102 | Free shipping discount trigger | ❌ | No discount → shipping integration |
| 103 | Automatic discount application (storefront) | ❌ | Discounts defined but not auto-applied in public store |

**Subtotal: 10 ✅ · 1 ⚠️ · 9 ❌**

---

### 4.7 Payment Processing

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 104 | Cash payment | ⚠️ | POS supports cash; store settings has cash toggle but no online checkout |
| 105 | Bank transfer | ⚠️ | Store settings has bank toggle; no verification flow |
| 106 | Online payment gateway (Stripe/PayPal) | ⚠️ | POS has `pos_payment_operations` with Stripe; store has toggle only |
| 107 | Payment method selection at checkout | ❌ | No online checkout flow |
| 108 | Credit / debit card processing | ❌ | No card processing in store (POS has it) |
| 109 | Mobile wallet (Apple Pay / Google Pay) | ❌ | No mobile wallet integration |
| 110 | Payment status tracking | ⚠️ | POS tracks `pending/completed/failed`; not in store |
| 111 | Payment receipt / confirmation | ❌ | No receipt generation for store orders |
| 112 | Refund processing | ⚠️ | POS has refund flow; no store refund |
| 113 | Partial refund | ⚠️ | POS supports partial refund; no store refund |
| 114 | Payment retry / failure handling | ❌ | No retry flow |
| 115 | Saved payment methods | ❌ | No saved cards / payment methods |
| 116 | Checkout idempotency | ⚠️ | POS has idempotency_key on payment_operations; not in store |

**Subtotal: 0 ✅ · 7 ⚠️ · 6 ❌**

---

### 4.8 Shipping & Delivery

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 117 | Enable / disable delivery | ✅ | Store settings delivery toggle |
| 118 | Flat-rate delivery fee | ✅ | Configurable delivery fee |
| 119 | Free delivery threshold | ✅ | Free delivery above amount |
| 120 | Shipping address collection | ❌ | No address form at checkout |
| 121 | Multiple shipping methods | ❌ | Single flat-rate only |
| 122 | Shipping rate calculation (weight-based) | ❌ | No weight-based rate calculation |
| 123 | Shipping zone / region rates | ❌ | No zone-based shipping |
| 124 | Real-time carrier rates (API) | ❌ | No carrier API integration |
| 125 | Order tracking number | ❌ | No tracking number field |
| 126 | Shipment tracking page | ❌ | No tracking page |
| 127 | Pickup in store option | ❌ | No pickup option |
| 128 | Delivery time estimates | ❌ | No estimated delivery display |
| 129 | Shipping label generation | ❌ | No label generation |
| 130 | International shipping | ❌ | No international shipping rules |

**Subtotal: 3 ✅ · 0 ⚠️ · 11 ❌**

---

### 4.9 Tax Management

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 131 | Tax rate configuration | ⚠️ | POS has `pos_tax_config` table; not used in store |
| 132 | Tax included / excluded pricing | ❌ | No tax display mode setting |
| 133 | Tax per product / category | ❌ | No per-product tax class |
| 134 | Tax by region / zone | ❌ | No region-based tax |
| 135 | Automatic tax calculation | ❌ | No tax applied in store context |
| 136 | Tax-exempt customers | ❌ | No tax-exempt flag |
| 137 | Tax report generation | ❌ | No tax-specific reports (POS daily summary includes total_tax) |
| 138 | Tax display on product page | ❌ | No tax info on storefront |
| 139 | Tax display on checkout | ❌ | No online checkout |
| 140 | VAT / GST number collection | ❌ | No tax ID collection |

**Subtotal: 0 ✅ · 1 ⚠️ · 9 ❌**

---

### 4.10 Store Analytics & Reporting

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 141 | Total sales dashboard | ⚠️ | POS has daily summaries; store dashboard shows counts only |
| 142 | Revenue over time chart | ❌ | No revenue chart in store |
| 143 | Orders over time chart | ❌ | No order trends in store |
| 144 | Top-selling products | ❌ | No product sales ranking |
| 145 | Sales by category | ❌ | No category-level reporting |
| 146 | Sales by payment method | ⚠️ | POS daily summary has cash/card/wallet breakdowns; not in store |
| 147 | Customer acquisition metrics | ❌ | No customer tracking |
| 148 | Conversion rate tracking | ❌ | No visitor → order funnel |
| 149 | Average order value | ❌ | No AOV calculation |
| 150 | Inventory value report | ❌ | No inventory valuation in store |
| 151 | Discount performance report | ❌ | No discount usage tracking |
| 152 | Abandoned cart analytics | ❌ | No cart tracking |
| 153 | Export reports (CSV / PDF) | ⚠️ | POS has CSV export; not in store |
| 154 | Real-time sales dashboard | ❌ | No real-time feed |

**Subtotal: 0 ✅ · 3 ⚠️ · 11 ❌**

---

### 4.11 Store Design & Customization

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 155 | Store banner image | ✅ | Upload with compression in setup |
| 156 | Store name & description | ✅ | Configured in setup wizard |
| 157 | Theme color selection | ✅ | 8 preset colors in setup |
| 158 | Store preview (admin) | ✅ | StorePreview component with live preview |
| 159 | Public storefront page | ✅ | Public access to active products / categories |
| 160 | Custom pages (About, Contact) | ❌ | No CMS or custom page builder |
| 161 | Footer customization | ❌ | No footer settings |
| 162 | Navigation menu customization | ❌ | No custom menus |
| 163 | Product page layout options | ❌ | Single fixed layout |
| 164 | Custom CSS / theme editor | ❌ | No custom styling beyond theme color |
| 165 | Template / theme selection | ❌ | No theme system |
| 166 | Mobile-responsive storefront | ⚠️ | Next.js responsive; but no mobile-specific design controls |
| 167 | Favicon / logo upload | ❌ | No favicon or logo configuration |
| 168 | Social media links | ❌ | No social links section |

**Subtotal: 5 ✅ · 1 ⚠️ · 8 ❌**

---

### 4.12 SEO & Marketing

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 169 | Product SEO title / meta description | ❌ | No SEO metadata on products |
| 170 | Category SEO metadata | ❌ | No SEO metadata on categories |
| 171 | Sitemap generation (XML) | ❌ | No sitemap generator |
| 172 | Open Graph / social sharing tags | ❌ | No OG tags for products |
| 173 | Canonical URLs | ⚠️ | Slugs exist but no canonical tag implementation |
| 174 | Email marketing integration | ❌ | No email marketing tools |
| 175 | Abandoned cart recovery emails | ❌ | No cart recovery |
| 176 | Product sharing (social) | ❌ | No share buttons |
| 177 | Promotional banners | ❌ | No banner management beyond store banner |
| 178 | Blog / content marketing | ❌ | No blog engine |
| 179 | Google Analytics integration | ❌ | No analytics tracking code |
| 180 | Facebook Pixel integration | ❌ | No pixel integration |
| 181 | Newsletter signup | ❌ | No email collection |

**Subtotal: 0 ✅ · 1 ⚠️ · 12 ❌**

---

### 4.13 Store Configuration

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 182 | Store setup wizard | ✅ | 2-step wizard: Branding + Preferences |
| 183 | Publish / unpublish toggle | ✅ | Draft / Published status control |
| 184 | Operating hours | ✅ | Per-day operating hours in setup |
| 185 | Store policies (terms / privacy / returns) | ✅ | Free-text policies in settings |
| 186 | Delivery option configuration | ✅ | Enable, fee, free threshold |
| 187 | Payment method toggles | ✅ | Cash / bank / online toggles |
| 188 | Currency configuration | ❌ | No currency setting; assumed single currency |
| 189 | Multi-currency support | ❌ | No multi-currency pricing |
| 190 | Timezone configuration | ❌ | No timezone setting |
| 191 | Email notification templates | ❌ | No email template configuration |
| 192 | Checkout page customization | ❌ | No online checkout to customize |
| 193 | Legal / compliance pages | ⚠️ | Store policies exist; not full legal page system |
| 194 | Maintenance mode | ❌ | No maintenance mode beyond unpublish |

**Subtotal: 6 ✅ · 1 ⚠️ · 6 ❌**

---

### 4.14 Multi-channel & Integration

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 195 | POS integration | ⚠️ | POS is a separate module with own products; no shared catalog |
| 196 | Inventory module sync | ✅ | `inventory_item_id` FK links store products to inventory |
| 197 | Accounting integration | ⚠️ | POS orders create journal entries; store has no order → accounting flow |
| 198 | Booking module sync | ✅ | `syncBookingServiceToStore()` / `syncStoreProductToBookingService()` |
| 199 | CRM integration | ⚠️ | CRM module exists; no linkage from store customers |
| 200 | Social media selling | ❌ | No social commerce integration |
| 201 | Marketplace listing | ❌ | No marketplace export |
| 202 | API for external integrations | ❌ | No public store API (POS has contract-based API) |
| 203 | Webhook / event system | ❌ | No store event webhooks |
| 204 | Import / export data | ❌ | No CSV / JSON import-export |

**Subtotal: 2 ✅ · 3 ⚠️ · 5 ❌**

---

### 4.15 Security & Compliance

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 205 | Row Level Security (data isolation) | ✅ | RLS policies on all store tables; company-level isolation |
| 206 | Company context guard | ✅ | `requireBusinessActiveCompanyContext()` on all API routes |
| 207 | Public data scoping | ✅ | Only `is_active` products / categories visible publicly |
| 208 | User action audit log | ❌ | No audit trail for admin actions |
| 209 | GDPR data export | ❌ | No customer data export |
| 210 | GDPR data deletion | ❌ | No customer data purge |
| 211 | PCI compliance (payment) | ❌ | No payment handling in store (POS delegates to Stripe) |
| 212 | SSL / HTTPS enforcement | ✅ | Inherits from Next.js / Vercel deployment |
| 213 | Rate limiting | ❌ | No rate limiting on store endpoints |
| 214 | CAPTCHA / bot protection | ❌ | No bot protection on checkout or forms |
| 215 | Content Security Policy | ❌ | No CSP headers configured for store |

**Subtotal: 4 ✅ · 0 ⚠️ · 7 ❌**

---

## 5. Gap Summary

| Category | ✅ Implemented | ⚠️ Partial | ❌ Missing | Total |
|----------|---------------|------------|-----------|-------|
| 4.1 Product Management | 13 | 2 | 15 | 30 |
| 4.2 Category & Taxonomy | 8 | 0 | 6 | 14 |
| 4.3 Order Management | 0 | 6 | 10 | 16 |
| 4.4 Customer Management | 0 | 2 | 9 | 11 |
| 4.5 Inventory & Stock | 2 | 3 | 7 | 12 |
| 4.6 Pricing & Discounts | 10 | 1 | 9 | 20 |
| 4.7 Payment Processing | 0 | 7 | 6 | 13 |
| 4.8 Shipping & Delivery | 3 | 0 | 11 | 14 |
| 4.9 Tax Management | 0 | 1 | 9 | 10 |
| 4.10 Store Analytics & Reporting | 0 | 3 | 11 | 14 |
| 4.11 Store Design & Customization | 5 | 1 | 8 | 14 |
| 4.12 SEO & Marketing | 0 | 1 | 12 | 13 |
| 4.13 Store Configuration | 6 | 1 | 6 | 13 |
| 4.14 Multi-channel & Integration | 2 | 3 | 5 | 10 |
| 4.15 Security & Compliance | 4 | 0 | 7 | 11 |
| **TOTAL** | **53** | **31** | **131** | **215** |

### Overall Completion

| Metric | Count | Percentage |
|--------|-------|------------|
| ✅ Implemented | 53 | 24.7% |
| ⚠️ Partial | 31 | 14.4% |
| ❌ Missing | 131 | 60.9% |
| **Total Functions** | **215** | **100%** |

### Completion by Tier

| Tier | Description | Completion |
|------|-------------|------------|
| Catalog (Product + Category + Discount) | Core listing & pricing | **48 / 64 (75.0%)** |
| Commerce (Order + Payment + Shipping + Tax) | Transactional engine | **7 / 53 (13.2%)** |
| Customer & Marketing (Customer + SEO + Analytics) | Growth & retention | **3 / 38 (7.9%)** |
| Operations (Inventory + Config + Integration + Security) | Platform backbone | **26 / 60 (43.3%)** |

---

## 6. Key E-commerce Workflows

### 6.1 Product Listing Workflow

```
Admin creates product → Sets type/price/images → Assigns category
  → Toggles active → Product appears on public storefront
```

| Step | Status | Notes |
|------|--------|-------|
| Create product with details | ✅ | Full form with all fields |
| Upload & compress images | ✅ | Client-side compression |
| Assign category | ✅ | Category dropdown |
| Set pricing & compare-at price | ✅ | Both fields available |
| Define variants (size/color) | ❌ | No variant system |
| Set stock quantity | ✅ | Stock field available |
| Link to inventory module | ✅ | `inventory_item_id` FK |
| Add SEO metadata | ❌ | No SEO fields |
| Preview & publish | ✅ | StorePreview + active toggle |

**Workflow completion: 7/9 steps (78%)**

---

### 6.2 Order Processing Workflow

```
Customer browses → Adds to cart → Checkout → Payment → Confirmation
  → Admin fulfills → Ships → Delivered → Review
```

| Step | Status | Notes |
|------|--------|-------|
| Browse products & categories | ✅ | Public storefront |
| Add to cart | ❌ | No shopping cart |
| Checkout form (address, payment) | ❌ | No checkout page |
| Payment processing | ❌ | No online payment |
| Order confirmation | ❌ | No confirmation page |
| Admin views new order | ⚠️ | POS has order list; no store orders |
| Fulfillment processing | ❌ | No fulfillment tracking |
| Shipping & tracking | ❌ | No shipping tracking |
| Delivery confirmation | ❌ | No delivery status |
| Customer review | ❌ | No review system |

**Workflow completion: 1/10 steps (10%)**

---

### 6.3 Payment Workflow

```
Customer selects method → Enters details → Authorization → Capture
  → Confirmation → Receipt
```

| Step | Status | Notes |
|------|--------|-------|
| Display payment options | ⚠️ | Store settings has toggles; no checkout UI |
| Credit card form | ❌ | No card form |
| Payment authorization | ⚠️ | POS has checkout-intents; not in store |
| Payment capture | ⚠️ | POS completes via webhook; not in store |
| Payment confirmation | ❌ | No confirmation flow |
| Receipt / invoice generation | ❌ | No receipt for store |
| Payment failure handling | ❌ | No retry / error handling |

**Workflow completion: 0/7 steps (0%) — all partial or missing**

---

### 6.4 Shipping & Fulfillment Workflow

```
Order placed → Pick items → Pack → Generate label → Ship → Track → Deliver
```

| Step | Status | Notes |
|------|--------|-------|
| Order triggers fulfillment | ❌ | No order system |
| Pick list generation | ❌ | No pick list |
| Pack & weight verification | ❌ | No packing UI |
| Shipping label generation | ❌ | No label system |
| Carrier selection | ❌ | No carrier integration |
| Tracking number assignment | ❌ | No tracking field |
| Customer tracking notification | ❌ | No email notifications |
| Delivery confirmation | ❌ | No delivery status |

**Workflow completion: 0/8 steps (0%)**

---

### 6.5 Returns & Refunds Workflow

```
Customer requests return → Admin reviews → Approve → Receive item
  → Process refund → Restock inventory
```

| Step | Status | Notes |
|------|--------|-------|
| Customer return request | ❌ | No return request UI |
| Admin review & approval | ❌ | No return management |
| Return shipping label | ❌ | No return label |
| Receive & inspect return | ❌ | No return receiving |
| Process refund (full/partial) | ⚠️ | POS has refund; not in store |
| Restock inventory | ⚠️ | POS refund restocks via inventory module |
| Customer refund notification | ❌ | No email notifications |
| Return reason analytics | ❌ | No return reporting |

**Workflow completion: 0/8 steps (0%) — 2 partial via POS**

---

### 6.6 Customer Lifecycle Workflow

```
Visit → Browse → Register → Purchase → Review → Repeat → Loyalty
```

| Step | Status | Notes |
|------|--------|-------|
| Store discovery (SEO / social) | ❌ | No SEO or marketing |
| Browse catalog | ✅ | Public storefront |
| Create account | ❌ | No customer registration |
| First purchase | ❌ | No checkout flow |
| Order tracking | ❌ | No tracking page |
| Post-purchase email | ❌ | No email automation |
| Leave review | ❌ | No review system |
| Loyalty points accrual | ❌ | Membership tables exist; no integration |
| Repeat purchase | ❌ | No saved carts / reorder |

**Workflow completion: 1/9 steps (11%)**

---

### 6.7 Inventory Replenishment Workflow

```
Stock falls below threshold → Alert → Purchase order → Receive → Restock
```

| Step | Status | Notes |
|------|--------|-------|
| Monitor stock levels | ⚠️ | Stock quantity visible in admin; no automated monitoring |
| Low stock alert trigger | ❌ | No alert system |
| Generate purchase order | ⚠️ | Procurement module exists; not linked to store |
| Receive inventory | ⚠️ | Inventory module has stock movements; not triggered from store |
| Update stock quantities | ⚠️ | Inventory module can update; manual process |
| Stock level verification | ⚠️ | Inventory stock takes exist |

**Workflow completion: 0/6 steps (0%) — 5 partial via other modules**

---

### 6.8 Discount Campaign Workflow

```
Plan promotion → Create discount → Set rules → Activate → Monitor → End
```

| Step | Status | Notes |
|------|--------|-------|
| Create discount rule | ✅ | Discount CRUD with type & target |
| Set percentage or fixed amount | ✅ | Both types supported |
| Target all / category / product | ✅ | Three targeting modes |
| Set date range | ✅ | Start/end dates with scheduling |
| View status (active/expired/scheduled) | ✅ | Status badges in UI |
| Apply coupon code | ❌ | No coupon code system |
| Monitor redemption count | ❌ | No usage tracking |
| Performance analytics | ❌ | No discount reporting |

**Workflow completion: 5/8 steps (63%)**

---

### 6.9 Store Setup Workflow

```
Create store → Brand → Configure → Add products → Preview → Publish
```

| Step | Status | Notes |
|------|--------|-------|
| Setup wizard launch | ✅ | 2-step wizard |
| Banner & branding | ✅ | Banner upload, name, description |
| Theme color selection | ✅ | 8 preset colors |
| Operating hours | ✅ | Per-day configuration |
| Delivery settings | ✅ | Enable, fee, free threshold |
| Payment method settings | ✅ | Cash / bank / online toggles |
| Store policies | ✅ | Free-text policies |
| Add categories | ✅ | Category management |
| Add products | ✅ | Product management |
| Preview storefront | ✅ | StorePreview component |
| Publish store | ✅ | Publish toggle |

**Workflow completion: 11/11 steps (100%)**

---

### 6.10 Analytics & Reporting Workflow

```
Collect data → Aggregate → Display dashboard → Filter → Export
```

| Step | Status | Notes |
|------|--------|-------|
| Collect order / sales data | ⚠️ | POS collects; store has no orders |
| Daily summary aggregation | ⚠️ | POS has `pos_daily_summaries`; not for store |
| Dashboard with key metrics | ⚠️ | Store dashboard shows product/category/discount counts only |
| Revenue & order charts | ❌ | No chart visualizations |
| Filter by date / category / product | ❌ | No report filtering |
| Export CSV / PDF | ⚠️ | POS has CSV export; not for store |
| Real-time monitoring | ❌ | No real-time feed |

**Workflow completion: 0/7 steps (0%) — 4 partial via POS**

---

### Workflow Summary

| # | Workflow | Completion | Rating |
|---|----------|------------|--------|
| 1 | Product Listing | 78% | 🟢 Good |
| 2 | Order Processing | 10% | 🔴 Critical Gap |
| 3 | Payment | 0% | 🔴 Critical Gap |
| 4 | Shipping & Fulfillment | 0% | 🔴 Critical Gap |
| 5 | Returns & Refunds | 0% | 🔴 Critical Gap |
| 6 | Customer Lifecycle | 11% | 🔴 Critical Gap |
| 7 | Inventory Replenishment | 0% | 🔴 Critical Gap |
| 8 | Discount Campaign | 63% | 🟡 Moderate |
| 9 | Store Setup | 100% | 🟢 Complete |
| 10 | Analytics & Reporting | 0% | 🔴 Critical Gap |

---

## 7. Priority Recommendations for SMC

The following 10 features are ranked by impact on an SMC's ability to operate
a functional online store. Priority considers: revenue impact, customer experience,
operational necessity, and implementation complexity.

| Rank | Feature | Category | Why Critical for SMC | Effort |
|------|---------|----------|---------------------|--------|
| **1** | **Shopping Cart & Online Checkout** | Order Management | Without checkout, the store is a catalog — no revenue. This is the single most critical gap. | Large |
| **2** | **Online Payment Gateway Integration** | Payment Processing | Checkout without payment is incomplete. Integrate Stripe or similar with the existing POS payment infrastructure. | Medium |
| **3** | **Order Management (store-side)** | Order Management | Admin needs to view, process, and fulfill online orders. Can extend POS order system with e-commerce statuses (pending → processing → shipped → delivered). | Medium |
| **4** | **Product Variants (size/color)** | Product Management | Physical product stores need variants. Most SMCs sell products in multiple sizes or colors. Without variants, each must be a separate product. | Medium |
| **5** | **Customer Registration & Accounts** | Customer Management | Returning customers need accounts for order history, saved addresses, and loyalty. Builds customer lifetime value. | Medium |
| **6** | **Order Email Notifications** | Order Management | Customers expect order confirmation, shipping updates, and delivery notifications. Critical for trust. | Small |
| **7** | **Basic Analytics Dashboard** | Analytics | Store owners need revenue, order count, and top products at minimum. Can leverage existing POS daily summary infrastructure. | Small |
| **8** | **Shipping Address & Basic Tracking** | Shipping & Delivery | Physical product stores need address collection and basic tracking number assignment. | Small |
| **9** | **Coupon Codes** | Pricing & Discounts | Primary marketing tool for SMC stores. Discount rules exist; add a code field and redemption logic. | Small |
| **10** | **Stock Status & Low-Stock Alerts** | Inventory & Stock | Prevent overselling and automate reorder notifications. Stock data already exists; add display and alert logic. | Small |

### Estimated Implementation Roadmap

| Phase | Duration | Features | Unlock |
|-------|----------|----------|--------|
| **Phase 1: Transactable Store** | 3–4 weeks | Cart, Checkout, Payment, Order Management | Revenue generation |
| **Phase 2: Customer Experience** | 2–3 weeks | Customer accounts, Email notifications, Order history | Retention & trust |
| **Phase 3: Product Depth** | 2 weeks | Variants, Stock display, Low-stock alerts | Catalog completeness |
| **Phase 4: Growth Tools** | 2 weeks | Coupon codes, Analytics dashboard, Basic SEO | Marketing & optimization |

---

## 8. Comparative Benchmark

How Cardlink's store compares to open-source e-commerce platforms on core capabilities:

| Capability | WooCommerce | Medusa.js | Saleor | PrestaShop | Cardlink |
|------------|-------------|-----------|--------|------------|----------|
| Product catalog | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Good |
| Product variants | ✅ | ✅ | ✅ | ✅ | ❌ |
| Shopping cart | ✅ | ✅ | ✅ | ✅ | ❌ |
| Online checkout | ✅ | ✅ | ✅ | ✅ | ❌ |
| Payment gateways | ✅ 100+ | ✅ Stripe/PayPal | ✅ 10+ | ✅ 50+ | ⚠️ POS only |
| Order management | ✅ | ✅ | ✅ | ✅ | ⚠️ POS only |
| Customer accounts | ✅ | ✅ | ✅ | ✅ | ❌ |
| Shipping management | ✅ | ✅ | ✅ | ✅ | ⚠️ Basic |
| Tax engine | ✅ | ✅ | ✅ | ✅ | ❌ |
| Discount / coupons | ✅ | ✅ | ✅ | ✅ | ⚠️ No coupons |
| Analytics | ✅ | ✅ | ✅ | ✅ | ❌ |
| SEO tools | ✅ | ⚠️ | ✅ | ✅ | ❌ |
| Multi-language | ✅ Plugin | ✅ | ✅ | ✅ | ✅ 4 locales |
| POS integration | ⚠️ Plugin | ❌ | ❌ | ⚠️ Plugin | ✅ Built-in |
| Inventory integration | ⚠️ Plugin | ✅ | ✅ | ✅ | ✅ Built-in |
| Accounting integration | ❌ | ❌ | ❌ | ❌ | ✅ Built-in |
| Booking integration | ⚠️ Plugin | ❌ | ❌ | ❌ | ✅ Built-in |

**Cardlink's unique strengths:** Built-in POS, inventory, accounting, and booking integration.
No competitor has this level of cross-module integration out of the box.

---

## 9. Conclusion

### Current State

The Cardlink store module is a **well-built product catalog** with strong foundations in
product management, category organization, and discount rules. Its cross-module integration
with POS, Inventory, Accounting, and Booking is a **significant competitive advantage** that
no single open-source e-commerce platform offers natively.

However, at **24.7% feature completion** (53 of 215 functions), the store is currently a
**product showcase / digital catalog** rather than a transactable e-commerce store. The critical
gap is the complete absence of:

- Shopping cart
- Online checkout
- Online payment processing
- Store-side order management
- Customer accounts

### Is It Comprehensive Enough for an SMC?

**Not yet.** An SMC requires at minimum the ability to accept orders and payments online.
The store currently serves as a product listing that drives customers to contact the business
(phone, in-person, or via POS), which works for a storefront / catalog use case but does not
meet the standard of a modern e-commerce store.

### Path to SMC-Ready

With the **Phase 1 implementation** (cart, checkout, payment, order management — estimated
3–4 weeks), the store would become transactable and viable for SMC use. Phases 2–4 would
bring it to feature parity with mid-tier e-commerce solutions while retaining the unique
advantage of integrated POS, inventory, and accounting.

### Key Strengths to Preserve

1. **Cross-module integration** — POS, Inventory, Accounting, Booking sync
2. **Multi-language support** — 4 locales (en, zh-CN, zh-HK, zh-TW)
3. **Product type flexibility** — Physical, Service, Digital products
4. **Strong data model** — RLS, company isolation, idempotent operations
5. **Booking ↔ Store sync** — Service products link to appointments

### Final Assessment

| Dimension | Score | Notes |
|-----------|-------|-------|
| Catalog & Listing | 8/10 | Strong product and category management |
| Transactional Commerce | 1/10 | No cart, checkout, or online payment |
| Customer Experience | 1/10 | No accounts, order history, or notifications |
| Operations & Fulfillment | 3/10 | Good inventory integration; no fulfillment |
| Marketing & Growth | 1/10 | No SEO, analytics, or coupons |
| Platform & Integration | 9/10 | Best-in-class cross-module integration |
| **Overall** | **3.8/10** | **Catalog-ready; not commerce-ready** |

> **Bottom line:** Cardlink's store is ~25% complete for e-commerce but has an exceptional
> integration foundation. Implementing cart + checkout + payment (Phase 1) would immediately
> elevate it to a functional SMC store, with subsequent phases building toward full
> competitive parity.
