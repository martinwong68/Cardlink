# Cardlink March 2026 MVP Execution Plan

## 1) Deep Investigation Summary (Code + Live DB)

### 1.1 Current Product Shape
- Current app is a multi-domain social business card platform, not only a card editor.
- Active domains already in production logic:
  - Digital card and public card pages.
  - NFC card registration, NFC tap routing, and premium extension.
  - Contacts and connection workflow.
  - Company and company member management.
  - Membership program, offers, and redemption flow.
  - Community forum and replies.
  - Stripe checkout, portal, webhook sync, and billing event tracking.

### 1.2 Live DB Observations (queried via Supabase API)
- profiles: 10 rows.
- companies: 4 rows.
- business_cards: 9 rows.
- nfc_cards: 101 rows.
- nfc_tap_logs: 22 rows.
- membership_accounts: 7 rows.
- billing_payment_events: 3 rows.
- app_billing_settings: 1 row.
- forum_posts: 6 rows.

Notes:
- company_members is active and populated. Count query by "id" failed because table uses composite identity (no id column), but select sample succeeded.
- Schema extensions in migrations are reflected in live keys (profile premium tracking, nfc premium grant fields, membership spend support fields).

### 1.3 Core Runtime Logic Confirmed
- Stripe checkout route creates customer when missing, then opens subscription or one-time payment session.
- Stripe webhook updates profile subscription fields and recomputes effective premium via recompute_profile_premium.
- NFC tap route calls handle_nfc_tap RPC and redirects by status/action.
- Free-plan restrictions are enforced in DB triggers for card_fields, card_links, and card_experiences.
- Dashboard/cards page enforces card limits by viewer plan and company-managed account status.

## 2) Strategic Decision for Solo Builder + AI

Decision: Use one app with modular monolith architecture now.

Why:
- Shared auth, billing, company tenancy, and permissions are already implemented.
- Multi-app split now would multiply deployment, auth, API contracts, and release overhead.
- Cross-module workflows (POS -> Inventory -> Accounting) are easier and safer in one codebase at this stage.

Future:
- Keep module boundaries strict in folder, service, and DB event contracts.
- Only split services when scale or team size justifies it.

## 3) One-Month MVP Scope (All Modules, Thin Slice)

### 3.1 Existing module to harden this month
- Namecard (this repo):
  - Company card templates.
  - Lead capture from public card.
  - NFC analytics in dashboard.

### 3.2 New thin modules to add this month
- Inventory: products, stock in/out, current stock list.
- Procurement: supplier list, purchase order, receive into stock.
- POS: cart, checkout, payment method, order record.
- Accounting: auto journal entries from POS and PO receipts, cash summary.
- HR: employee list, role assignment, attendance check-in.
- Online Shop: product listing and simple online order intake.
- Channel (Tunnel): channel partner list and referred order tracking.

## 4) Database Blueprint for March MVP (minimum)

All new tables must include:
- company_id uuid not null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
- created_by uuid null

### 4.1 Inventory + Procurement
- inv_products
- inv_stock_movements
- inv_stock_balances
- proc_suppliers
- proc_purchase_orders
- proc_purchase_order_items
- proc_receipts

### 4.2 POS + Online Shop
- sales_orders
- sales_order_items
- sales_payments
- shop_channels
- shop_orders

### 4.3 Accounting
- acc_chart_accounts
- acc_journal_entries
- acc_journal_lines

### 4.4 HR
- hr_employees
- hr_attendance_logs

### 4.5 Channel
- ch_partners
- ch_referrals
- ch_commissions

## 5) Weekly Delivery Plan (March)

### Week 1
- Freeze requirements for all MVP thin slices.
- Build shared module shell UI and navigation.
- Add DB migrations for inventory/procurement/pos/accounting/hr/channel base tables.
- Add common service layer contracts.

### Week 2
- Deliver Inventory + Procurement end-to-end.
- Deliver POS order creation and payment record.
- Emit accounting journal records from POS and receipt events.

### Week 3
- Deliver HR basics and online shop intake.
- Extend Namecard lead capture to CRM table.
- Add dashboard KPI cards across modules.

### Week 4
- Stabilization, bug fixing, seed data, and QA scripts.
- Mobile responsive review (iPhone + iPad layout checks).
- Prepare release checklist for web + app wrappers.

## 6) Development Workflow (for this repo now)

- Branch naming: feat/<module>-<task>, fix/<module>-<task>.
- Migration naming: YYYYMMDD_<domain>_<change>.sql.
- Definition of done for each task:
  - migration applied
  - one service path works end-to-end
  - one dashboard view renders
  - one smoke test passes

## 7) Risks and Controls

- Risk: schema drift from parallel AI tasks.
  - Control: single migration queue and daily integration window.
- Risk: implicit cross-module coupling.
  - Control: event contract doc and strict service ownership.
- Risk: over-scoping in one month.
  - Control: thin-slice only, max 2 core use cases per module.

## 8) Immediate Next Actions (start now)

1. Create March migrations for module base tables.
2. Build module navigation and empty dashboards.
3. Implement Inventory first as reference module pattern.
4. Reuse the pattern to roll out other modules quickly.
