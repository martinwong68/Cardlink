# Cardlink

> A comprehensive multi-module business management platform with NFC digital business cards, built with **Next.js 16**, **React 19**, **Supabase**, and **Stripe**.

---

## Overview

Cardlink is a SaaS platform that combines digital business card management (NFC + QR code) with a full suite of business modules including accounting, HR, CRM, inventory, POS, procurement, booking, online store, and AI-powered business operations.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Stripe (Checkout, Webhooks, Connect) |
| State | Zustand |
| i18n | next-intl (EN, zh-CN, zh-TW, zh-HK, ko, ja) |
| Icons | Lucide React |
| Charts | Recharts |
| AI | Poe / OpenAI / GitHub Copilot (configurable) |

## Architecture

```
┌─────────────────────────────────────────┐
│           Next.js App Router            │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │  Pages    │  │   API Routes (150+)  │ │
│  │ /business │  │   /api/...           │ │
│  │ /dashboard│  │   /api/stripe/...    │ │
│  └──────────┘  └──────────────────────┘ │
│         ↕               ↕                │
│    Supabase Client   Supabase Admin      │
│         ↕               ↕                │
│  ┌──────────────────────────────────────┐│
│  │   Supabase (PostgreSQL + Auth)      ││
│  │   80+ tables · RLS policies         ││
│  └──────────────────────────────────────┘│
│         ↕                                │
│  ┌──────────────┐  ┌──────────────────┐  │
│  │    Stripe    │  │  AI Provider     │  │
│  │  (Payments)  │  │ (Poe/OpenAI)    │  │
│  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────┘
```

## Modules & Features

### Core Platform
| Module | Description | Status |
|--------|-------------|--------|
| **Authentication** | Supabase Auth, RLS policies, company membership | ✅ Working |
| **Digital Business Cards** | NFC cards, QR codes, public card sharing, templates | ✅ Working |
| **Dashboard** | Personal dashboard with cards, contacts, NFC, membership | ✅ Working |
| **Company Management** | Create, switch, manage multiple companies | ✅ Working |
| **Billing & Subscription** | Stripe Checkout, webhooks, plan enforcement | ✅ Working |
| **i18n** | 6 languages (EN, zh-CN, zh-TW, zh-HK, ko, ja) | ✅ Working |

### Business Modules (under `/business`)
| Module | Pages | API Routes | Status |
|--------|-------|------------|--------|
| **Accounting** | 21 pages | 24 routes | ✅ Phase 1 complete |
| **HR** | 13 pages | 13 routes | ✅ Phase 2 complete |
| **Inventory** | 10 pages | 15 routes | ✅ Phase 1 complete |
| **POS** | 7 pages | 16 routes | ✅ Phase 1 complete |
| **CRM** | 10 pages | 15 routes | ✅ Phase 1 complete |
| **Booking** | 10 pages | 9 routes | ✅ Phase 1 complete |
| **Procurement** | 8 pages | 9 routes | ✅ Phase 2 complete |
| **Online Store** | 11 pages | 10 routes | ✅ Phase 1 complete |
| **AI** | 2 pages | 7 routes | ✅ Basic working |
| **Owner/Admin** | 7 pages | 8 routes | ✅ Working |
| **Settings** | 11 pages | — | ✅ Working |
| **Community** | 4+ pages | 1 route | ✅ Working |

### Public / External
| Feature | Endpoint | Status |
|---------|----------|--------|
| Public booking (no auth) | `/api/public/booking/*` | ✅ Working |
| Public store checkout | `/api/public/store/checkout` | ✅ Working |
| Public card view | `/c/[slug]` | ✅ Working |
| NFC card tap | `/tap/[uid]` | ✅ Working |
| Stripe Connect | `/api/stripe/connect/*` | ✅ Working |

## What Is NOT Yet Implemented

| Feature | Notes |
|---------|-------|
| Custom domain support | Listed in plan features, no DNS/proxy integration |
| Real-time notifications | Currently polling-based, no WebSocket/Realtime |
| Mobile app / PWA | Web-only, no service worker or native app |
| Advanced scheduled reporting | Basic reports exist; no scheduled delivery |
| Multi-currency accounting | Currency field exists but no FX rate conversion |
| PDF export | Plan-gated but actual PDF generation not implemented |
| Document OCR | Plan-gated but OCR service not integrated |
| Email notifications | No email service configured (only Supabase Auth emails) |
| File uploads / storage | Supabase Storage buckets need manual creation |
| Data export (non-CRM) | CSV export only for CRM; other modules pending |

## Quick Start

```bash
# 1. Install dependencies
cd cardlink
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in Supabase + Stripe + AI keys

# 3. Apply database migrations
# In Supabase Dashboard → SQL Editor, run each file in
# supabase/migrations/ in filename order (56 files)

# 4. Seed subscription plans (required)
# Run supabase/migrations/20260318_005_seed_subscription_plans.sql

# 5. (Optional) Seed demo data
node scripts/seed-trial-data.mjs demo@cardlink.test

# 6. Start dev server
npm run dev
# Open http://localhost:3000
```

## Environment Variables

See [`cardlink/.env.example`](cardlink/.env.example) for all required variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key (test mode OK) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe publishable key |
| `AI_PROVIDER` | ⚠️ | `poe`, `openai`, or `copilot` (for AI features) |
| `AI_POE_API_KEY` | ⚠️ | Poe API key (if using Poe) |
| `GITHUB_TOKEN` | ⚠️ | GitHub token (if using Copilot AI) |

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/APP_GUIDE.md`](docs/APP_GUIDE.md) | Comprehensive application guide |
| [`docs/UAT_CHECKLIST.md`](docs/UAT_CHECKLIST.md) | UAT testing checklist (200+ test cases) |
| [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | Live database schema reference |
| [`.supabase-reference/`](.supabase-reference/) | Per-module Supabase table documentation (16 files) |
| [`cardlink/STRIPE_SETUP.md`](cardlink/STRIPE_SETUP.md) | Stripe payment & Connect setup guide |
| [`docs/contracts/`](docs/contracts/) | Module interface contracts |
| [`docs/*_GAP_ANALYSIS.md`](docs/) | Feature gap analysis per module |

## Database

- **80+ tables** across 11 functional groups
- **56 migration files** in `cardlink/supabase/migrations/`
- **Row-Level Security (RLS)** on all business tables
- **RPC functions** for billing, inventory, and AI operations

See [`.supabase-reference/`](.supabase-reference/) for detailed per-module schema documentation:

| Reference File | Tables Covered |
|---------------|----------------|
| `core-identity.md` | profiles, companies, company_members |
| `membership-module.md` | membership programs, tiers, accounts, points |
| `namecard-module.md` | business cards, NFC, tap logs |
| `community-module.md` | boards, forum posts, connections |
| `crm-module.md` | leads, deals, contacts, activities, campaigns |
| `ai-module.md` | AI credits, conversations, messages, action cards |
| `hr-module.md` | employees, leave, attendance, payroll, departments |
| `inventory-module.md` | products, stock balances, movements |
| `commerce-pos-module.md` | POS registers, shifts, orders, online store |
| `procurement-module.md` | suppliers, purchase orders, vendor bills |
| `accounting-module.md` | chart of accounts, invoices, transactions, banking |
| `billing-module.md` | subscription plans, billing events, payment history |
| `booking-module.md` | services, availability, appointments |
| `admin-platform-module.md` | modules, security, API keys, audit logs |
| `company-extended.md` | addresses, contacts, documents, bank accounts |
| `cross-module-linkage.md` | FK relationships and integration patterns |

## Project Structure

```
Cardlink/
├── cardlink/                    # Main Next.js application
│   ├── app/                     # App Router pages & API routes
│   │   ├── api/                 # 150+ API routes
│   │   ├── business/            # Business module pages (145+ pages)
│   │   ├── dashboard/           # Personal dashboard pages
│   │   ├── community/           # Community pages
│   │   ├── c/[slug]/            # Public card pages
│   │   └── tap/                 # NFC tap handling
│   ├── components/              # React components
│   ├── src/lib/                 # Shared utilities
│   │   ├── ai/                  # AI provider integration
│   │   ├── business/            # Business scope guards
│   │   └── supabase/            # Supabase client helpers
│   ├── messages/                # i18n translation files (6 locales)
│   ├── supabase/migrations/     # 56 database migration files
│   └── public/                  # Static assets
├── company-website-template/    # Standalone website template (separate repo per company)
│   ├── src/app/                 # Website pages (home, store, booking, contact, blog)
│   ├── src/components/          # SiteLayout, ShoppingCart, BookingWidget, ContactForm
│   ├── src/lib/                 # API client, cart context, Supabase client
│   ├── setup.sh                 # Interactive setup wizard
│   ├── AI_PROMPT.md             # AI customization prompt
│   └── README.md                # Template documentation
├── docs/                        # Documentation
│   ├── APP_GUIDE.md             # Application guide
│   ├── WEBSITE_TEMPLATE_GUIDE.md # Website template guide
│   ├── UAT_CHECKLIST.md         # UAT testing checklist
│   ├── DATABASE_SCHEMA.md       # Database schema
│   └── contracts/               # Module contracts
├── .supabase-reference/         # Supabase schema reference (16 files)
└── README.md                    # This file
```

## License

Private — All rights reserved.