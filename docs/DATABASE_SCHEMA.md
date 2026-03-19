# Cardlink Database Schema — Live Reference

> **Source of truth**: Queried directly from production Supabase (2026-03-19).
> **80 tables** across 11 functional groups.
> **Rule**: Every agent must update this file when adding/altering tables.

---

## Group 1 — Core Identity (3 tables)

### profiles (22 cols)
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | — | FK → auth.users |
| email | text | — | |
| full_name | text | — | |
| avatar_url | text | — | |
| plan | text | 'free' | User subscription tier |
| stripe_customer_id | text | — | |
| stripe_subscription_id | text | — | |
| stripe_subscription_status | text | — | |
| stripe_subscription_current_period_end | timestamptz | — | |
| nfc_premium_until | timestamptz | — | |
| premium_until | timestamptz | — | |
| last_payment_at | timestamptz | — | |
| title | text | — | |
| company | text | — | Text label (not FK) |
| bio | text | — | |
| is_banned | boolean | false | |
| banned_at | timestamptz | — | |
| banned_reason | text | — | |
| is_master_user | boolean | false | Super-admin flag |
| business_active_company_id | uuid | — | FK → companies.id |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### companies (35 cols)
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | uuid_generate_v4() | |
| name | text | — | Required |
| slug | text | — | URL-safe identifier |
| description | text | — | |
| logo_url | text | — | |
| cover_url | text | — | |
| website_url | text | — | Legacy; prefer `website` |
| contact_email | text | — | Legacy; prefer `email` |
| contact_phone | text | — | Legacy; prefer `phone` |
| address | text | — | Legacy flat address |
| settings | jsonb | {} | Stores industry, plan, custom config |
| is_active | boolean | true | |
| created_by | uuid | — | FK → auth.users |
| profile_card_id | uuid | — | |
| profile_card_slug | text | — | |
| is_banned | boolean | false | |
| banned_at | timestamptz | — | |
| banned_reason | text | — | |
| deleted_at | timestamptz | — | Soft delete |
| deleted_reason | text | — | |
| business_type | text | — | sole_proprietorship, partnership, corporation, llc, nonprofit, cooperative, franchise, other |
| registration_number | text | — | |
| tax_id | text | — | |
| founded_date | date | — | |
| website | text | — | |
| email | text | — | |
| phone | text | — | |
| fax | text | — | |
| employee_count_range | text | — | 1, 2-10, 11-50, 51-200, 201-500, 501-1000, 1001+ |
| fiscal_year_end | text | — | |
| default_currency | text | 'USD' | |
| timezone | text | 'UTC' | |
| onboarding_completed | boolean | false | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### company_members (9 cols)
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| company_id | uuid PK | — | FK → companies.id |
| user_id | uuid PK | — | FK → auth.users |
| role | text | — | owner, admin, manager, member, etc. |
| status | text | 'active' | active, invited, suspended |
| invited_by | uuid | — | |
| invited_at | timestamptz | now() | |
| joined_at | timestamptz | — | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## Group 2 — Company Extended (7 tables)

### company_addresses (12 cols)
company_id FK → companies.id. Labels: headquarters, branch, warehouse, mailing, billing, other.
Cols: id, company_id, label, address_line_1, address_line_2, city, state_province, postal_code, country (D='US'), is_primary, created_at, updated_at.

### company_key_contacts (10 cols)
company_id FK → companies.id.
Cols: id, company_id, name, title, email, phone, is_primary, notes, created_at, updated_at.

### company_documents (12 cols)
company_id FK → companies.id. doc_type: business_license, tax_certificate, incorporation_cert, insurance, contract, id_proof, other.
Cols: id, company_id, doc_type, name, file_url, file_size, mime_type, expiry_date, notes, uploaded_by (FK → auth.users), created_at, updated_at.

### company_bank_accounts (16 cols)
company_id FK → companies.id. account_type: checking, savings, business, other.
Cols: id, company_id, bank_name, account_name, account_number_last4, account_number_hash, routing_number, swift_code, iban, currency (D='USD'), account_type (D='checking'), is_primary, notes, created_by, created_at, updated_at.

### company_social_profiles (7 cols)
company_id FK → companies.id. UNIQUE(company_id, platform). Platforms: facebook, instagram, twitter, linkedin, youtube, tiktok, wechat, whatsapp, line, other.
Cols: id, company_id, platform, profile_url, handle, created_at, updated_at.

### company_operating_hours (8 cols)
company_id FK → companies.id. UNIQUE(company_id, day_of_week). day_of_week: 0=Sun, 6=Sat.
Cols: id, company_id, day_of_week, open_time, close_time, is_closed, created_at, updated_at.

### company_offers (16 cols)
company_id FK → companies.id. offer_type D='discount'. discount_type: percentage, fixed, etc.
Cols: id, company_id, title, description, offer_type, discount_type, discount_value, points_cost, start_at, end_at, usage_limit, per_member_limit, is_active, created_by, created_at, updated_at.

---

## Group 3 — Business Cards & NFC (8 tables)

### business_cards (17 cols)
user_id FK → auth.users. company_id FK → companies.id (nullable).
Cols: id, user_id, card_name (D='My Card'), is_default, full_name, title, company, bio, slug, background_pattern, background_color, template, company_id, is_company_profile, background_image_url, created_at, updated_at.

### card_fields (8 cols)
card_id FK → business_cards.id.
Cols: id, card_id, field_type, field_label, field_value, visibility (D='public'), sort_order, created_at.

### card_links (7 cols)
card_id FK → business_cards.id.
Cols: id, card_id, label, url, icon (D='link'), sort_order, created_at.

### card_experiences (9 cols)
card_id FK → business_cards.id.
Cols: id, card_id, role, company, start_date, end_date, description, sort_order, created_at.

### card_shares (6 cols)
card_id FK → business_cards.id.
Cols: id, card_id, viewed_by_user_id, share_method, viewer_ip, shared_at.

### nfc_cards (25 cols)
owner_id FK → auth.users. linked_card_id FK → business_cards.id. company_id FK → companies.id.
Key cols: nfc_uid, chip_serial, status (D='unregistered'), subscription_tier, total_taps, intake_batch_id, source (D='admin_intake'), premium_duration_months (D=36).

### nfc_card_intake_batches (13 cols)
company_id FK → companies.id. status: received, etc.
Cols: id, company_id, quantity, total_amount, currency (D='HKD'), supplier_name, purchase_order_no, received_at, notes, status, created_by, created_at, updated_at.

### nfc_tap_logs (10 cols)
nfc_card_id FK → nfc_cards.id.
Cols: id, nfc_card_id, nfc_uid, tapper_user_id, ip_address, user_agent, country, city, referer, tapped_at.

---

## Group 4 — Community & Social (6 tables)

### boards (7 cols)
Cols: id, name, slug, description, icon, sort_order, created_at.

### sub_boards (7 cols)
board_id FK → boards.id.
Cols: id, board_id, name, slug, description, sort_order, created_at.

### forum_posts (14 cols)
sub_board_id FK → sub_boards.id. author_id FK → auth.users.
Cols: id, sub_board_id, author_id, title, body, is_pinned, reply_count, last_activity_at, is_banned, banned_at, banned_by, banned_reason, created_at, updated_at.

### forum_replies (6 cols)
post_id FK → forum_posts.id. author_id FK → auth.users.
Cols: id, post_id, author_id, body, created_at, updated_at.

### posts (9 cols)
user_id FK → auth.users. Social feed posts.
Cols: id, user_id, content, visibility (D='public'), is_banned, banned_at, banned_by, banned_reason, created_at.

### connections (8 cols)
requester_id/receiver_id FK → auth.users.
Cols: id, requester_id, receiver_id, status (D='pending'), met_at_event, met_at_location, connected_at, created_at.

---

## Group 5 — Membership & Loyalty (8 tables)

### membership_programs (11 cols)
company_id FK → companies.id.
Cols: id, company_id, name, description, points_label (D='points'), points_expiry_policy (D='annual'), points_expire_month (D=12), points_expire_day (D=31), is_active, created_at, updated_at.

### membership_tiers (11 cols)
program_id FK → membership_programs.id.
Cols: id, program_id, name, rank, annual_fee, points_multiplier (D=1), benefits (jsonb), is_active, required_spend_amount (D=0), created_at, updated_at.

### membership_accounts (15 cols)
company_id FK, program_id FK, user_id FK, tier_id FK.
Cols: id, company_id, program_id, user_id, tier_id, member_code, status (D='active'), joined_at, expires_at, points_balance (D=0), lifetime_points (D=0), total_spend_amount (D=0), metadata (jsonb), created_at, updated_at.

### membership_transactions (12 cols)
membership_account_id FK, company_id FK.
Cols: id, membership_account_id, company_id, txn_type, status (D='posted'), amount, external_ref, reversed_by_txn_id, created_by_admin_user_id, reason, created_at, reversed_at.

### membership_points_ledger (11 cols)
company_id FK, account_id FK → membership_accounts.id.
Cols: id, company_id, account_id, event_type, points_delta, balance_after, reference_type, reference_id, note, created_by, created_at.

### membership_bobo_point_ledger (11 cols)
membership_account_id FK, company_id FK.
Cols: id, membership_account_id, company_id, txn_type, points, status (D='posted'), reversed_by_ledger_id, created_by_admin_user_id, reason, created_at, reversed_at.

### membership_spend_transactions (12 cols)
company_id FK, account_id FK, user_id FK.
Cols: id, company_id, account_id, user_id, amount, currency (D='HKD'), note, reference_type, reference_id, occurred_at, created_by, created_at.

### offer_redemptions (12 cols)
offer_id FK → company_offers.id, account_id FK, user_id FK.
Cols: id, offer_id, account_id, user_id, redeemed_at, status (D='redeemed'), points_spent, discount_applied, metadata (jsonb), confirmed_by, confirmed_at, reject_reason.

---

## Group 6 — Inventory (3 tables)

### inv_products (8 cols)
company_id FK → companies.id.
Cols: id, company_id, sku, name, unit (D='pcs'), is_active, created_at, updated_at.

### inv_stock_balances (4 cols)
product_id FK → inv_products.id, company_id FK. Composite PK.
Cols: product_id, company_id, on_hand (D=0), updated_at.

### inv_stock_movements (14 cols)
company_id FK, product_id FK.
Cols: id, company_id, product_id, movement_type, qty, reason, reference_type, reference_id, operation_id, correlation_id, idempotency_key, created_by, occurred_at, created_at.

---

## Group 7 — Procurement (7 tables)

### proc_suppliers (7 cols)
company_id FK. Cols: id, company_id, name, contact_name, contact_phone, created_at, updated_at.

### proc_purchase_orders (13 cols)
company_id FK, supplier_id FK. Cols: id, company_id, supplier_id, po_number, status, ordered_at, expected_at, idempotency_key, operation_id, correlation_id, created_by, created_at, updated_at.

### proc_purchase_order_items (6 cols)
po_id FK, product_id FK, company_id FK. Cols: id, company_id, po_id, product_id, qty, unit_cost.

### proc_receipts (10 cols)
po_id FK, company_id FK. Cols: id, company_id, po_id, idempotency_key, operation_id, correlation_id, received_at, received_by, note, created_at.

### proc_receipt_items (6 cols)
receipt_id FK, po_item_id FK, product_id FK. Cols: id, receipt_id, po_item_id, product_id, qty, created_at.

### proc_purchase_requests (14 cols)
company_id FK. Cols: id, company_id, pr_number, title, description, status (D='draft'), priority (D='normal'), requested_by, approved_by, approved_at, total_estimated, notes, created_at, updated_at.

### proc_contracts (14 cols)
company_id FK, supplier_id FK. Cols: id, company_id, supplier_id, title, contract_number, status (D='draft'), start_date, end_date, value, terms, notes, created_by, created_at, updated_at.

---

## Group 8 — POS (7 tables)

### pos_registers (7 cols)
company_id FK. Cols: id, company_id, name, location, is_active, created_at, updated_at.

### pos_products (14 cols)
company_id FK, inv_product_id FK (nullable). Cols: id, company_id, name, sku, barcode, category, price, cost, stock, image_url, is_active, inv_product_id, created_at, updated_at.

### pos_shifts (13 cols)
company_id FK, register_id FK, user_id FK. Cols: id, company_id, register_id, user_id, status (D='open'), opening_cash, closing_cash, expected_cash, variance, notes, started_at, ended_at, created_at.

### pos_orders (15 cols)
company_id FK, shift_id FK. Cols: id, company_id, order_number, status (D='completed'), subtotal, tax_rate, tax, total, payment_method (D='cash'), shift_id, customer_name, notes, created_by, created_at, updated_at.

### pos_order_items (8 cols)
order_id FK, product_id FK. Cols: id, order_id, product_id, product_name, qty, unit_price, subtotal, created_at.

### pos_payment_operations (15 cols)
company_id FK. Cols: id, company_id, order_id, amount, currency, state, operation_id, correlation_id, idempotency_key, provider, provider_event_id, occurred_at, created_by, created_at, updated_at.

### pos_payment_webhook_events (12 cols)
company_id FK. Cols: id, company_id, provider, provider_event_id, event_type, operation_id, correlation_id, idempotency_key, occurred_at, payload (jsonb), processed_at, created_at.

---

## Group 9 — CRM (6 tables)

### crm_leads (13 cols)
company_id FK. Cols: id, company_id, name, email, phone, source (D='manual'), status (D='new'), assigned_to, value (D=0), notes, created_by, created_at, updated_at.

### crm_deals (14 cols)
company_id FK, lead_id FK → crm_leads.id. Cols: id, company_id, title, value (D=0), stage (D='discovery'), probability (D=0), lead_id, contact_name, assigned_to, expected_close_date, notes, created_by, created_at, updated_at.

### crm_contacts (12 cols)
company_id FK. Cols: id, company_id, name, email, phone, company_name, position, tags (text[]), notes, created_by, created_at, updated_at.

### crm_activities (13 cols)
company_id FK. Cols: id, company_id, type (D='task'), title, description, due_date, status (D='pending'), related_type, related_id, assigned_to, created_by, created_at, updated_at.

### crm_campaigns (17 cols)
company_id FK. Cols: id, company_id, name, type (D='email'), status (D='draft'), budget, spent, sent, opened, clicked, converted, start_date, end_date, notes, created_by, created_at, updated_at.

### crm_notes (8 cols)
owner_id FK, contact_id FK. Cols: id, owner_id, contact_id, note_text, tags (text[]), reminder_date, created_at, updated_at.

---

## Group 10 — Accounting (12 tables)

### organizations (5 cols)
id PK FK → companies.id (1:1 overlay). Cols: id, name, currency (D='USD'), tax_id, created_at.

### accounts (8 cols)
org_id FK → organizations.id. type: asset, liability, equity, revenue, expense. parent_id self-ref.
Cols: id, org_id, code, name, type, parent_id, is_active, created_at. UNIQUE(org_id, code).

### transactions (9 cols)
org_id FK. Cols: id, org_id, date, description, reference_number, status (D='posted'), created_by, idempotency_key, created_at. UNIQUE(org_id, idempotency_key).

### transaction_lines (8 cols)
transaction_id FK, account_id FK. Cols: id, transaction_id, account_id, debit (D=0), credit (D=0), currency (D='USD'), exchange_rate (D=1), description.

### contacts (9 cols)
org_id FK. type: customer, vendor, employee. Cols: id, org_id, name, email, phone, type, address, tax_id, created_at.

### invoices (13 cols)
org_id FK. Cols: id, org_id, invoice_number, client_name, client_email, issue_date, due_date, status, total, tax (D=0), currency, notes, created_at. UNIQUE(org_id, invoice_number).

### invoice_items (7 cols)
invoice_id FK. Cols: id, invoice_id, description, quantity, unit_price, tax_rate (D=0), amount.

### tax_rates (7 cols)
org_id FK. Cols: id, org_id, name, rate, region, is_default, created_at.

### currencies (7 cols)
org_id FK. Cols: id, org_id, code, name, symbol, exchange_rate, last_updated. UNIQUE(org_id, code).

### documents (8 cols)
org_id FK. Polymorphic: related_type + related_id. Cols: id, org_id, related_type, related_id, file_url, ocr_text, uploaded_by, created_at.

### payroll_records (12 cols)
org_id FK, employee_id FK → contacts.id. Cols: id, org_id, employee_id, period_start, period_end, gross_salary, deductions (D=0), net_salary, status (D='draft'), encrypted_bank_details, encrypted_salary_note, created_at.

### inventory_items (9 cols)
org_id FK, account_id FK → accounts.id. Cols: id, org_id, name, sku, quantity (D=0), unit_cost (D=0), account_id, category, created_at. UNIQUE(org_id, sku).

### audit_log (9 cols)
org_id FK. Cols: id, org_id, user_id, action, table_name, record_id, old_values (jsonb), new_values (jsonb), created_at.

---

## Group 11 — Admin & Platform (9 tables)

### company_modules (8 cols)
company_id FK. module_name: accounting, pos, procurement, crm, inventory, cards, membership, client. UNIQUE(company_id, module_name).
Cols: id, company_id, module_name, is_enabled (D=false), enabled_at, enabled_by, created_at, updated_at.

### company_security_settings (12 cols)
company_id FK (UNIQUE — 1 row per company).
Cols: id, company_id, two_factor_required, password_expiry_days, session_timeout_minutes, ip_whitelist_enabled, ip_whitelist (text[]), login_alerts_enabled, audit_enabled (D=true), updated_by, created_at, updated_at.

### company_api_keys (12 cols)
company_id FK. Cols: id, company_id, name, key_prefix, key_hash, scopes (text[]), is_active, last_used_at, expires_at, created_by, created_at, revoked_at.

### company_audit_logs (8 cols)
company_id FK. Cols: id, company_id, actor_user_id, action, entity_type, entity_id, payload (jsonb), created_at.

### admin_users (7 cols)
Platform admin accounts. user_id FK → auth.users. Cols: id, user_id, role, is_active, allowlisted_email, created_at, updated_at.

### admin_audit_logs (9 cols)
Cols: id, actor_admin_user_id, actor_user_id, action, target_table, target_id, reason, payload (jsonb), created_at.

### admin_reports (10 cols)
Cols: id, target_type, target_id, status (D='open'), summary, created_by, assigned_admin_user_id, resolved_at, created_at, updated_at.

### admin_action_approvals (8 cols)
Cols: id, action_key, status (D='pending'), requester_admin_user_id, approver_admin_user_id, reason, created_at, decided_at.

### notifications (10 cols)
user_id FK. Cols: id, user_id, type, title, body, related_user_id, related_card_id, related_connection_id, is_read, created_at.

---

## Standalone / Billing (3 tables)

### user_roles (3 cols)
Composite PK (user_id, role). Cols: user_id, role, created_at.

### app_billing_settings (7 cols)
Singleton (id=1). Cols: id, monthly_display_price, yearly_display_price, currency_symbol, updated_by, created_at, updated_at.

### billing_payment_events (14 cols)
Stripe webhook log. Cols: id, stripe_event_id, stripe_checkout_session_id, stripe_payment_intent_id, stripe_subscription_id, stripe_customer_id, user_id, event_type, mode, payment_status, amount_total, currency, raw (jsonb), created_at.

---

## Security Functions (RLS)

| Function | Used by |
|----------|---------|
| `can_manage_company(company_id)` | All company_* tables, CRM, POS, inventory, procurement |
| `can_read_accounting_org(org_id)` | Accounting tables (SELECT) |
| `can_write_accounting_org(org_id)` | Accounting tables (INSERT/UPDATE/DELETE) |

---

## Agent Update Rules

1. **Before any migration**: query the real DB to verify current state.
2. **After any migration**: update this file with the exact new columns.
3. **Never guess columns** — always confirm via OpenAPI spec or direct query.
4. **Store non-column data** (industry, plan) in `settings` JSONB on `companies`.
