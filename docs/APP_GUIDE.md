# Cardlink — Application Guide

> A comprehensive multi-module business management platform built with
> **Next.js 16**, **Supabase** (PostgreSQL), **Stripe**, and **React 19**.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Module Reference](#module-reference)
4. [Billing & Subscription Flow](#billing--subscription-flow)
5. [Trial / Demo Data](#trial--demo-data)
6. [What Is Done vs Not Done](#what-is-done-vs-not-done)
7. [Environment Variables](#environment-variables)

---

## Quick Start

```bash
# 1. Install dependencies
cd cardlink
npm install

# 2. Configure environment
cp .env.example .env.local
#    Fill in Supabase + Stripe keys (see "Environment Variables" below)

# 3. Apply database migrations
#    In Supabase Dashboard → SQL Editor, run each file in
#    supabase/migrations/ in filename order.
#    Or use supabase CLI: supabase db push

# 4. Seed subscription plans (required)
#    Run supabase/migrations/20260318_005_seed_subscription_plans.sql

# 5. (Optional) Seed demo data
node scripts/seed-trial-data.mjs demo@cardlink.test

# 6. Start dev server
npm run dev
#    Open http://localhost:3000
```

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│           Next.js App Router        │
│  ┌──────────┐  ┌──────────────────┐ │
│  │  Pages    │  │  API Routes      │ │
│  │ /business │  │  /api/...        │ │
│  │ /settings │  │  /api/stripe/... │ │
│  └──────────┘  └──────────────────┘ │
│         ↕               ↕            │
│    Supabase Client   Supabase Admin  │
│         ↕               ↕            │
│  ┌──────────────────────────────────┐│
│  │  Supabase (PostgreSQL + Auth)   ││
│  │  80+ tables · RLS policies      ││
│  └──────────────────────────────────┘│
│         ↕                            │
│  ┌──────────────┐                    │
│  │    Stripe    │ (Checkout, Portal, │
│  │              │  Webhooks)         │
│  └──────────────┘                    │
└─────────────────────────────────────┘
```

**Tech Stack:**
| Layer       | Technology                 |
|-------------|----------------------------|
| Framework   | Next.js 16.1.6 (App Router) |
| UI          | React 19 + Tailwind CSS 4  |
| Database    | Supabase (PostgreSQL)      |
| Auth        | Supabase Auth              |
| Payments    | Stripe (checkout + webhooks) |
| State       | Zustand                    |
| i18n        | next-intl (EN, zh-CN, zh-TW, zh-HK) |
| Icons       | Lucide React               |
| Charts      | Recharts                   |

---

## Module Reference

### 1. Dashboard (`/business`)
**Status: ✅ Working**

Main hub showing all module cards, AI action queue, low-stock alerts,
and overdue invoice notifications. Shows stats badges per module.

### 2. Accounting (`/business/accounting`)
**Status: ✅ Working (Phase 1 complete)**

| Sub-page     | Description                              | Status |
|-------------|------------------------------------------|--------|
| Dashboard   | Financial overview with charts           | ✅     |
| Accounts    | Chart of accounts CRUD                   | ✅     |
| Transactions| Journal entries + general ledger          | ✅     |
| Invoices    | Customer invoices (create, send, pay)     | ✅     |
| Bills       | Vendor bills                             | ✅     |
| Payments    | Payment tracking                         | ✅     |
| Banking     | Bank accounts                            | ✅     |
| Contacts    | Accounting contacts                       | ✅     |
| Documents   | Document attachments                      | ✅     |
| Payroll     | Payroll journal integration               | ✅     |
| Reports     | P&L, Balance Sheet, Trial Balance         | ✅     |
| Settings    | Fiscal years, tax rates, currencies       | ✅     |

### 3. HR (`/business/hr`)
**Status: ✅ Working (Phase 2 complete)**

| Sub-page       | Description                          | Status |
|----------------|--------------------------------------|--------|
| Employees      | Employee CRUD + search/filter        | ✅     |
| Leave           | Leave request management             | ✅     |
| Attendance      | Clock in/out tracking                | ✅     |
| Payroll         | Salary + payslip management          | ✅     |
| Departments     | Department CRUD                      | ✅     |
| Positions       | Job position management              | ✅     |
| Holidays        | Company holiday calendar             | ✅     |
| Documents       | Employee document storage            | ✅     |
| Reports         | HR analytics                         | ✅     |
| Leave Balances  | Employee leave balance tracking      | ✅     |
| Leave Policies  | Policy rules (entitlement/accrual)   | ✅     |
| Tax Config      | Tax brackets + deduction rules       | ✅     |

### 4. Inventory (`/business/inventory`)
**Status: ✅ Working (Phase 1 complete)**

| Sub-page     | Description                          | Status |
|-------------|--------------------------------------|--------|
| Products    | Product CRUD + stock levels          | ✅     |
| Categories  | Category management                  | ✅     |
| Warehouses  | Multi-warehouse support              | ✅     |
| Movements   | Stock in/out/transfer                | ✅     |
| Stock Takes | Physical inventory count             | ✅     |
| Balances    | Stock level overview                 | ✅     |
| Reports     | Inventory reports                    | ✅     |

### 5. POS — Point of Sale (`/business/pos`)
**Status: ✅ Working (Phase 1 complete)**

| Sub-page   | Description                          | Status |
|-----------|--------------------------------------|--------|
| Terminal  | POS checkout terminal                 | ✅     |
| Orders    | Order history + refunds              | ✅     |
| Products  | POS product catalog                  | ✅     |
| Reports   | Sales reports + daily summary        | ✅     |
| Shifts    | Cashier shift management             | ✅     |

### 6. CRM (`/business/crm`)
**Status: ✅ Working (Phase 1 complete)**

| Sub-page    | Description                            | Status |
|------------|----------------------------------------|--------|
| Leads      | Lead capture + qualification           | ✅     |
| Contacts   | Contact management + import            | ✅     |
| Deals      | Deal pipeline (stages, values)          | ✅     |
| Activities | Calls, emails, meetings tracker        | ✅     |
| Campaigns  | Marketing campaign management          | ✅     |
| Reports    | Pipeline, conversion, forecast reports  | ✅     |

### 7. Booking (`/business/booking`)
**Status: ✅ Working (Phase 1 complete)**

| Sub-page      | Description                          | Status |
|--------------|--------------------------------------|--------|
| Services     | Service catalog + pricing            | ✅     |
| Appointments | Appointment booking + management     | ✅     |
| Availability | Staff availability slots             | ✅     |
| Calendar     | Calendar view                        | ✅     |
| Customers    | Booking customer records             | ✅     |
| Settings     | Booking configuration                | ✅     |
| Reports      | Booking analytics                    | ✅     |

**Public booking API** (no auth required):
- `GET /api/public/booking/services?company_id=`
- `GET /api/public/booking/slots?company_id=&service_id=&date=`
- `POST /api/public/booking/book`

### 8. Procurement (`/business/procurement`)
**Status: ✅ Working (Phase 2 complete)**

| Sub-page        | Description                          | Status |
|----------------|--------------------------------------|--------|
| Vendors        | Vendor management                    | ✅     |
| Requests       | Purchase requests + approval         | ✅     |
| Purchase Orders| PO creation + status tracking        | ✅     |
| Contracts      | Vendor contract management           | ✅     |
| Goods Receipt  | Receiving + inspection               | ✅     |
| Vendor Bills   | Bill payment tracking                | ✅     |

### 9. Online Store (`/business/store`)
**Status: ✅ Working (Phase 1 complete)**

| Sub-page    | Description                            | Status |
|------------|----------------------------------------|--------|
| Products   | Product catalog management             | ✅     |
| Categories | Store categories                       | ✅     |
| Orders     | Order management + status workflow     | ✅     |
| Customers  | Customer records + CSV import          | ✅     |
| Coupons    | Coupon/discount codes                  | ✅     |
| Discounts  | Discount rules                         | ✅     |
| Settings   | Store configuration                    | ✅     |

**Public store API**:
- `POST /api/public/store/checkout`

### 10. AI Module (`/business/ai`)
**Status: ✅ Working (basic)**

| Feature          | Description                         | Status |
|-----------------|-------------------------------------|--------|
| AI Chat         | Conversational AI assistant         | ✅     |
| Action Cards    | AI-generated business suggestions   | ✅     |
| Setup Mode      | File upload + data transformation   | ✅     |
| Operations Mode | NL prompt → action plan             | ✅     |
| Review Mode     | Business audit (daily/monthly)      | ✅     |

Requires AI provider configuration (`AI_PROVIDER=poe` or `AI_PROVIDER=openai`).

### 11. Owner / Admin (`/business/owner`)
**Status: ✅ Working**

| Sub-page    | Description                          | Status |
|------------|--------------------------------------|--------|
| Billing    | Subscription + payment history       | ✅     |
| Users      | Team member management               | ✅     |
| API Keys   | API key management                   | ✅     |
| Audit      | Audit log                            | ✅     |
| Security   | Security settings                    | ✅     |
| Modules    | Module enable/disable                | ✅     |

### 12. Settings (`/business/settings`)
**Status: ✅ Working**

| Sub-page       | Description                         | Status |
|---------------|-------------------------------------|--------|
| Plan & Billing| Subscription management + Stripe    | ✅     |
| Company       | Company profile settings            | ✅     |
| Language      | i18n language switcher              | ✅     |
| Notifications | Notification preferences            | ✅     |
| AI Settings   | AI provider configuration           | ✅     |
| Integrations  | Third-party integrations            | ✅     |
| Main Account  | User account settings               | ✅     |

### 13. Company Cards (`/business/company-cards`)
**Status: ✅ Working**

Digital business card management with NFC support, QR codes, and public
card sharing.

### 14. Notifications (`/business/notifications`)
**Status: ✅ Working**

Business notification center for system alerts, overdue invoices, low
stock, and plan renewal reminders.

---

## Billing & Subscription Flow

### How it works

1. **Plans are defined in the database** (`subscription_plans` table)
   - Free: $0/mo, 1 company, 1 user, 500MB storage, no AI
   - Professional: $29/mo, 3 companies, 5 users, 5GB storage, 200 AI actions
   - Business: $79/mo, unlimited companies, 20 users, 50GB storage, 2000 AI actions

2. **Upgrade flow:**
   - User clicks "Upgrade" on billing page or settings plan page
   - Frontend calls `POST /api/stripe/checkout` with plan slug + interval
   - Backend builds Stripe Checkout session with inline `price_data` (no pre-created Stripe products needed)
   - User is redirected to Stripe Checkout
   - On success, redirected back to `/business/settings/plan?checkout=success`
   - Stripe webhook processes the payment and updates profile/subscription

3. **Subscription sync:**
   - Stripe webhook (`POST /api/stripe/webhook`) handles:
     - `checkout.session.completed`
     - `invoice.paid`
     - `customer.subscription.created/updated/deleted`
   - Updates `profiles` table with subscription status
   - Calls `recompute_profile_premium()` to update plan tier

4. **Plan enforcement** (`src/lib/plan-enforcement.ts`):
   - `checkAiAccess()` — blocks AI features on free plan
   - `checkAiActionBalance()` — enforces monthly AI action limits
   - `checkStorageLimit()` — enforces storage quotas
   - `checkCompanyLimit()` — enforces max companies per plan
   - `checkUserLimit()` — enforces max team members per plan
   - `checkPdfExport()` — blocks PDF export on free plan
   - `checkOcrLimit()` — enforces document OCR limits

### Setting up Stripe

See `STRIPE_SETUP.md` for detailed instructions. Key steps:
1. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
2. Create webhook endpoint in Stripe Dashboard pointing to `/api/stripe/webhook`
3. No Stripe products/prices need to be pre-created (uses inline price_data)

---

## Trial / Demo Data

### Seeding test data

```bash
# Prerequisite: Create a user account first (sign up via the app UI or Supabase Auth)

# Then seed demo data
cd cardlink
node scripts/seed-trial-data.mjs your-email@example.com
```

### What gets created

| Module     | Data                                                          |
|-----------|---------------------------------------------------------------|
| Company   | "Cardlink Demo Co" with Professional plan subscription         |
| HR        | 5 employees, 3 departments, 3 positions, leave requests, attendance, holidays |
| Inventory | 2 categories, 2 warehouses                                    |
| Booking   | 3 services (Consultation, Quick Check-in, Workshop)           |
| CRM       | 2 leads, 3 contacts, 2 deals, 3 activities                   |
| Store     | 2 customers, 2 orders, 2 coupons                              |
| Billing   | 2 billing history entries, 88 AI credits                      |
| Notifications | 2 sample notifications                                    |

---

## What Is Done vs Not Done

### ✅ Fully Working

- **Authentication & Authorization** — Supabase Auth, RLS policies, company membership
- **Company Management** — Create, switch, manage companies
- **All 12+ Business Modules** — UI pages + API routes (see Module Reference above)
- **Billing Page Upgrade Button** — Redirects to Stripe Checkout
- **Settings Plan Page** — Full plan comparison, upgrade/downgrade, billing history
- **Stripe Webhook** — Handles all critical subscription events
- **Plan Enforcement** — Limits checked server-side before allowing actions
- **Internationalization** — 4 languages (EN, zh-CN, zh-TW, zh-HK)
- **Cross-Module Integration** — 10 journal entry functions for accounting
- **Public APIs** — Booking and store checkout available without authentication
- **AI Integration** — Chat, action cards, setup/operations/review modes
- **Trial Data Seed Script** — Populate demo data for testing

### ⚠️ Partially Done / Needs Configuration

| Item                        | What's Needed                                          |
|----------------------------|--------------------------------------------------------|
| **Stripe payments**        | Requires valid `STRIPE_SECRET_KEY` + webhook secret    |
| **AI features**            | Requires AI provider key (`AI_POE_API_KEY` or `AI_OPENAI_API_KEY`) |
| **Email notifications**    | No email service configured (Supabase Auth handles signup emails only) |
| **File uploads / storage** | Supabase Storage buckets need to be created manually   |
| **PDF export**             | Plan-gated but actual PDF generation not implemented   |
| **Document OCR**           | Plan-gated but OCR service not integrated              |

### ❌ Not Yet Implemented

| Feature                    | Notes                                                  |
|----------------------------|--------------------------------------------------------|
| **Custom domain support**  | Listed in plan features but no DNS/proxy integration   |
| **Real-time notifications**| Currently polling-based, no WebSocket/Realtime         |
| **Mobile app / PWA**       | Web-only, no service worker or native app              |
| **Advanced reporting**     | Basic reports exist; no scheduled report delivery       |
| **Multi-currency accounting** | Currency field exists but no FX rate conversion      |
| **Audit log viewer**       | Owner audit page exists but audit event capture is basic |
| **Data export**            | CSV export for CRM leads/contacts; other modules pending |
| **Automated backups**      | Relies on Supabase platform backups                    |

---

## Environment Variables

Copy `.env.example` → `.env.local` and configure:

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe (required for billing)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# NFC card price display
NEXT_PUBLIC_NFC_CARD_PRICE_DISPLAY=58

# AI Provider — choose one:
AI_PROVIDER=poe
AI_POE_API_KEY=your_poe_api_key
AI_POE_DEFAULT_BOT=GPT-4o-Mini

# Or for OpenAI-compatible:
# AI_PROVIDER=openai
# AI_OPENAI_API_KEY=sk-xxx
# AI_OPENAI_BASE_URL=https://api.openai.com/v1
# AI_OPENAI_DEFAULT_MODEL=gpt-4o-mini
```

### What happens if keys are missing

| Key                        | Effect if Missing                                       |
|----------------------------|---------------------------------------------------------|
| Supabase URL + Anon Key   | App won't load at all                                  |
| Supabase Service Role Key | Admin operations fail (webhooks, seed scripts)         |
| STRIPE_SECRET_KEY          | Upgrade/checkout returns 503 with helpful error message |
| STRIPE_WEBHOOK_SECRET      | Webhooks return 500 (subscription status won't sync)   |
| AI_POE_API_KEY / AI_OPENAI_API_KEY | AI features return errors but app still works    |
