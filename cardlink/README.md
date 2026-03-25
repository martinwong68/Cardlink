# Cardlink — Application

> Next.js 16 business management platform with NFC digital business cards.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in all required values (see Environment Variables below)

# 3. Apply database migrations
# In Supabase Dashboard → SQL Editor, run each file in
# supabase/migrations/ in filename order (001 → 044)
# Or use: supabase db push

# 4. Seed subscription plans (required)
# Run migration: 20260318_005_seed_subscription_plans.sql

# 5. (Optional) Seed demo data for testing
node scripts/seed-trial-data.mjs demo@cardlink.test

# 6. Start development server
npm run dev
# Open http://localhost:3000
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:check-context` | Check database business context |
| `npm run db:seed-trial` | Seed trial/demo data |

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

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
NEXT_PUBLIC_NFC_CARD_PRICE_DISPLAY=58

# Stripe Connect (optional)
# STRIPE_CONNECT_PLATFORM_FEE_PERCENT=10

# AI Provider: "poe" | "openai" | "copilot"
AI_PROVIDER=poe

# Poe (when AI_PROVIDER=poe)
AI_POE_API_KEY=your_poe_api_key
AI_POE_DEFAULT_BOT=claude-haiku-4.5

# OpenAI (when AI_PROVIDER=openai)
# AI_OPENAI_API_KEY=sk-xxx
# AI_OPENAI_BASE_URL=https://api.openai.com/v1
# AI_OPENAI_DEFAULT_MODEL=gpt-4o-mini

# GitHub Copilot (when AI_PROVIDER=copilot)
# GITHUB_TOKEN=ghp_xxx
# AI_COPILOT_DEFAULT_MODEL=gpt-4o
```

## Module Reference

### Personal Dashboard (`/dashboard`)

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Main personal dashboard |
| Cards | `/dashboard/cards` | Digital business card management |
| Card Detail | `/dashboard/cards/[id]` | View individual card |
| Card Edit | `/dashboard/cards/[id]/edit` | Edit card content |
| NFC Cards | `/dashboard/nfc` | NFC card management |
| Scan | `/dashboard/scan` | QR/NFC scanner |
| Contacts | `/dashboard/contacts` | Contact book |
| Contact Detail | `/dashboard/contacts/[id]` | Individual contact |
| Membership | `/dashboard/membership` | Membership programs |
| Discounts | `/dashboard/discount` | Available discounts |
| Discount History | `/dashboard/discount/history` | Redemption history |
| Notifications | `/dashboard/notifications` | Notification center |
| Feed | `/dashboard/feed` | Activity feed |
| Explore | `/dashboard/explore` | Explore content |
| Discover | `/dashboard/discover` | Discovery page |
| Community | `/dashboard/community` | Community boards |
| Settings | `/dashboard/settings` | Profile, password, privacy, upgrade, support |

### Business Modules (`/business`)

#### Accounting (`/business/accounting`) — 21 pages
| Page | Description |
|------|-------------|
| Dashboard | Financial overview with charts |
| Accounts | Chart of accounts CRUD |
| Transactions | Journal entries + general ledger |
| Transactions/New | Create new transaction |
| Invoices | Customer invoice management |
| Invoices/New | Create new invoice |
| Invoice Detail | View/edit individual invoice |
| Bills | Vendor bill management |
| Bills/New | Create new bill |
| Payments | Payment tracking |
| Bank Accounts | Bank account management |
| Banking | Banking transactions |
| Contacts | Accounting contacts |
| Documents | Document attachments |
| Estimates | Estimate creation |
| Credit Notes | Credit note management |
| Payroll | Payroll journal integration |
| Inventory | Inventory item linking |
| Recurring | Recurring invoice setup |
| Periods | Fiscal period management |
| Reports | P&L, Balance Sheet, Trial Balance |
| Settings | Tax rates, currencies, fiscal config |

#### HR (`/business/hr`) — 13 pages
| Page | Description |
|------|-------------|
| Employees | Employee CRUD + search/filter |
| Departments | Department management |
| Positions | Job position management |
| Leave | Leave request management |
| Leave Policies | Leave entitlement/accrual rules |
| Attendance | Clock in/out tracking |
| Payroll | Salary + payslip management |
| Holidays | Company holiday calendar |
| Public Holidays | Public holiday list |
| Documents | Document storage |
| Employee Documents | Employee-specific documents |
| Onboarding | Onboarding workflow |
| Tax Config | Tax brackets + deduction rules |
| Reports | HR analytics |

#### Inventory (`/business/inventory`) — 10 pages
| Page | Description |
|------|-------------|
| Products | Product CRUD + stock levels |
| Categories | Category management |
| Warehouses | Multi-warehouse support |
| Movements | Stock in/out/transfer |
| Stock Takes | Physical inventory count |
| Balances | Stock level overview |
| Variants | Product variant management |
| UoM | Unit of measure CRUD |
| Reports | Inventory reports |

#### POS (`/business/pos`) — 7 pages
| Page | Description |
|------|-------------|
| Terminal | POS checkout interface |
| Orders | Order history + refunds |
| Products | POS product catalog |
| Shifts | Cashier shift management (open/close) |
| Daily Summary | Daily sales summary |
| Reports | Sales reports |

#### CRM (`/business/crm`) — 10 pages
| Page | Description |
|------|-------------|
| Leads | Lead capture + qualification |
| Contacts | Contact management + CSV import |
| Deals | Deal pipeline (stages, values) |
| Activities | Call, email, meeting tracker |
| Campaigns | Marketing campaign management |
| Accounts | Account management |
| Members | Community member management |
| Community Settings | Community visibility settings |
| Reports | Pipeline, conversion, forecast reports |

#### Booking (`/business/booking`) — 10 pages
| Page | Description |
|------|-------------|
| Services | Service catalog + pricing |
| Appointments | Appointment management |
| Availability | Staff availability slots |
| Calendar | Calendar view |
| Customers | Booking customer records |
| Exceptions | Exception dates management |
| Staff | Staff management |
| Settings | Booking configuration |
| Reports | Booking analytics |

#### Procurement (`/business/procurement`) — 8 pages
| Page | Description |
|------|-------------|
| Vendors | Vendor management |
| Requests | Purchase request + approval |
| Purchase Orders | PO creation + status tracking |
| Contracts | Vendor contract management |
| Goods Receipt | Receiving + inspection |
| Vendor Bills | Bill payment tracking |
| Orders | Order management |

#### Online Store (`/business/store`) — 11 pages
| Page | Description |
|------|-------------|
| Setup | Store setup wizard |
| Products | Product catalog management |
| Categories | Store categories |
| Orders | Order management + status workflow |
| Customers | Customer records |
| Customer Accounts | Account management |
| Coupons | Coupon/discount codes |
| Discounts | Discount rules |
| Shipments | Shipment tracking |
| Settings | Store configuration |

#### AI (`/business/ai`) — 2 pages
| Page | Description |
|------|-------------|
| AI Panel | Preset-based AI assistant (9 presets) |
| History | Past AI conversation history |

**AI Presets:** Record Expense, Generate Report, Check Inventory, Create Invoice, Record Sale, Upload Data, CRM Add Lead, Daily Review, Monthly Audit

#### Owner/Admin (`/business/owner`) — 7 pages
| Page | Description |
|------|-------------|
| Dashboard | Owner overview |
| Billing | Subscription + payment history |
| Users | Team member management |
| API Keys | API key CRUD |
| Audit | Audit log viewer |
| Security | Security settings |
| Modules | Module enable/disable |

#### Settings (`/business/settings`) — 11 pages
| Page | Description |
|------|-------------|
| Overview | Settings hub |
| Company | Company profile settings |
| Plan | Plan comparison + upgrade/downgrade |
| Language | i18n language switcher |
| Notifications | Notification preferences |
| AI | AI provider configuration |
| Integrations | Third-party integrations |
| Main Account | User account settings |
| Stripe Connect | Stripe Connect onboarding |
| Website | Website CMS settings |
| Owner | Owner-specific settings |

### Public Routes (no authentication required)

| Route | Description |
|-------|-------------|
| `/c/[slug]` | Public business card / company page |
| `/tap/[uid]` | NFC card tap handler |
| `/community` | Public community boards |
| `/api/public/booking/*` | Public booking API |
| `/api/public/store/checkout` | Public store checkout |
| `/api/public/website` | Public website data |

## API Routes Summary

| Module | Endpoint Prefix | Routes |
|--------|----------------|--------|
| Accounting | `/api/accounting/*` | 24 |
| Business AI | `/api/business/ai/*` | 7 |
| Business Booking | `/api/business/booking/*` | 9 |
| Business HR | `/api/business/hr/*` | 13 |
| Business Store | `/api/business/store/*` | 10 |
| Business Website | `/api/business/website/*` | 5 |
| CRM | `/api/crm/*` | 15 |
| Inventory | `/api/inventory/*` | 15 |
| POS | `/api/pos/*` | 16 |
| Procurement | `/api/procurement/*` | 9 |
| Company Cards | `/api/company-cards/*` | 4 |
| Company Management | `/api/company-management/*` | 5 |
| Owner/Admin | `/api/owner/*` | 8 |
| Stripe | `/api/stripe/*` | 8 |
| Public | `/api/public/*` | 5 |
| Other | `/api/audit`, `/api/cron/*` | 2 |

**Total: ~155 API routes**

## Database

- **80+ tables** across 11 functional groups
- **56 migration files** in `supabase/migrations/`
- **Row-Level Security (RLS)** enforced on all business tables
- **RPC functions** for billing, inventory, and AI operations

See [`../.supabase-reference/`](../.supabase-reference/) for detailed per-module schema documentation.

## Internationalization

Supported locales (6 languages):

| Code | Language |
|------|----------|
| `en` | English (default) |
| `zh-CN` | 简体中文 (Simplified Chinese) |
| `zh-TW` | 繁體中文 (Traditional Chinese — Taiwan) |
| `zh-HK` | 繁體中文 (Traditional Chinese — Hong Kong) |
| `ko` | 한국어 (Korean) |
| `ja` | 日本語 (Japanese) |

Translation files are in `messages/` directory. Config at `next-intl.config.ts`.

## Current Status

### ✅ Fully Working
- Authentication & Authorization (Supabase Auth, RLS, company membership)
- Company Management (create, switch, manage)
- All 12+ Business Modules (UI + API routes)
- Stripe Billing (checkout, webhooks, plan enforcement)
- Stripe Connect (Express accounts, platform fees)
- AI Integration (preset-based, action cards, data upload)
- i18n (6 languages)
- Cross-Module Integration (10 accounting journal entry functions)
- Public APIs (booking, store checkout, card view)
- Trial Data Seed Script

### ⚠️ Needs Configuration
- **Stripe payments** — Requires valid `STRIPE_SECRET_KEY` + webhook secret
- **AI features** — Requires AI provider key
- **File uploads** — Supabase Storage buckets need manual creation

### ❌ Not Yet Implemented
- Custom domain support
- Real-time notifications (WebSocket/Realtime)
- Mobile app / PWA
- PDF export (plan-gated, generation not built)
- Document OCR (plan-gated, not integrated)
- Email notifications (no email service)
- Multi-currency FX conversion
- Scheduled report delivery
- Data export for non-CRM modules

## Related Documentation

| Document | Path |
|----------|------|
| Project README | [`../README.md`](../README.md) |
| Application Guide | [`../docs/APP_GUIDE.md`](../docs/APP_GUIDE.md) |
| UAT Checklist | [`../docs/UAT_CHECKLIST.md`](../docs/UAT_CHECKLIST.md) |
| Database Schema | [`../docs/DATABASE_SCHEMA.md`](../docs/DATABASE_SCHEMA.md) |
| Stripe Setup | [`STRIPE_SETUP.md`](STRIPE_SETUP.md) |
| Supabase Reference | [`../.supabase-reference/`](../.supabase-reference/) |
