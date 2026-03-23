# AI Agent Module – Function & Workflow Gap Analysis

> Reference projects: **OpenClaw** (AI workflow automation), **n8n** (workflow orchestration),
> **Dify** (LLMOps), **Langflow** (visual agent builder), **Cal.com** (scheduling AI).
>
> Target: comprehensive SMC (Small/Medium Company) store-management AI.

---

## 1  Objective

Verify that **Cardlink** already covers every function a professional AI-powered
business-management app would need for an SMC, identify any gaps, and
propose an implementation plan for the three core AI agent capabilities:

| # | Agent Function | Description |
|---|----------------|-------------|
| 1 | **Setup Agent** | Onboard a new store – upload key docs (accounting, company profile, inventory, sales records), AI recognises patterns, transforms into DB-ready data, shows preview, then applies. |
| 2 | **Operations Agent** | Accept a natural-language prompt and orchestrate multi-module business operations in a single step. |
| 3 | **Periodic Review Agent** | Run daily / monthly / annual audits – verify operations, audit accounts & inventory, produce consultant-grade suggestions. |

---

## 2  Professional AI App – Master Function List

Below is a consolidated list of **154 functions** organised into 16 categories.
Each row is marked:

- ✅ **Exists** – already implemented in Cardlink
- ⚠️ **Partial** – some code exists but incomplete
- ❌ **Missing** – not yet implemented

### 2.1  AI Conversation & Chat Core

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 1 | Multi-turn chat with context | ✅ | `ai_conversations` + `ai_messages` |
| 2 | System-prompt injection (business context) | ✅ | `assembleAiContext` |
| 3 | Multi-model selection (Gemini, Claude, GPT) | ✅ | `MODEL_OPTIONS` in page |
| 4 | Message streaming | ❌ | Currently waits for full response |
| 5 | Agent mode selection (Setup / Ops / Review) | ❌ | **NEW – Required** |
| 6 | File attachment in chat | ❌ | Button exists but disabled |
| 7 | Conversation search / filter | ❌ | |
| 8 | Pin / favourite conversations | ❌ | |
| 9 | Export chat transcript | ❌ | |

### 2.2  Setup Agent (Store Onboarding)

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 10 | File upload (CSV, Excel, PDF, images) | ❌ | **NEW – Required** |
| 11 | AI document type recognition | ❌ | **NEW – Required** |
| 12 | Pattern detection & field mapping | ❌ | **NEW – Required** |
| 13 | Data transform to DB schema | ❌ | **NEW – Required** |
| 14 | Preview transformed data before apply | ❌ | **NEW – Required** |
| 15 | Batch apply to multiple modules | ❌ | **NEW – Required** |
| 16 | Rollback on failed import | ❌ | |
| 17 | Import progress tracking | ❌ | |
| 18 | Duplicate detection | ❌ | |
| 19 | Company profile auto-fill from docs | ❌ | **NEW – Required** |

### 2.3  Operations Agent (Prompt → Action)

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 20 | Natural-language → intent detection | ❌ | **NEW – Required** |
| 21 | Multi-module operation dispatch | ❌ | **NEW – Required** |
| 22 | Action preview before execution | ❌ | **NEW – Required** |
| 23 | Confirm / cancel workflow | ❌ | **NEW – Required** |
| 24 | Create invoice via prompt | ❌ | |
| 25 | Record POS sale via prompt | ❌ | |
| 26 | Add inventory via prompt | ❌ | |
| 27 | Create purchase order via prompt | ❌ | |
| 28 | Schedule booking via prompt | ❌ | |
| 29 | Update CRM deal via prompt | ❌ | |
| 30 | Run accounting report via prompt | ❌ | |

### 2.4  Periodic Review Agent (Scheduled Audits)

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 31 | Daily operations check | ❌ | **NEW – Required** |
| 32 | Monthly account & inventory audit | ❌ | **NEW – Required** |
| 33 | Annual business review | ❌ | **NEW – Required** |
| 34 | Cron / scheduler endpoint | ❌ | **NEW – Required** |
| 35 | Review result storage | ❌ | **NEW – Required** |
| 36 | KPI trend analysis | ❌ | |
| 37 | Anomaly detection | ❌ | |
| 38 | Consultant-style suggestions | ❌ | **NEW – Required** |
| 39 | Email digest of review | ❌ | |
| 40 | Review history dashboard | ❌ | |

### 2.5  AI Action Cards & Feedback

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 41 | AI-generated action cards | ✅ | `ai_action_cards` table |
| 42 | Approve / reject / amend cards | ✅ | `/api/business/ai/action` |
| 43 | Bulk card actions | ✅ | Bulk approve/reject |
| 44 | Feedback loop (learning) | ✅ | `ai_card_feedback` |
| 45 | Card history page | ✅ | `/business/ai/history` |

### 2.6  Accounting Module

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 46 | Chart of accounts | ✅ | |
| 47 | Journal entries / transactions | ✅ | |
| 48 | Invoices (CRUD + status) | ✅ | |
| 49 | Bills (CRUD + status) | ✅ | |
| 50 | Payments | ✅ | |
| 51 | Bank accounts + reconciliation | ✅ | |
| 52 | Tax rates | ✅ | |
| 53 | Fiscal periods | ✅ | |
| 54 | Payroll | ✅ | |
| 55 | Financial reports (P&L, BS, GL, AR/AP aging) | ✅ | |
| 56 | Document upload + OCR | ✅ | |
| 57 | Multi-currency | ✅ | |
| 58 | Budget planning | ❌ | |
| 59 | Cash flow forecast | ❌ | |

### 2.7  Inventory Module

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 60 | Products CRUD | ✅ | |
| 61 | Categories | ✅ | |
| 62 | Warehouses | ✅ | |
| 63 | Stock movements | ✅ | |
| 64 | Stock takes | ✅ | |
| 65 | Stock balance report | ✅ | |
| 66 | Low-stock alerts | ✅ | |
| 67 | Movement history | ✅ | |
| 68 | Valuation report | ✅ | |
| 69 | Barcode / SKU management | ⚠️ | Basic fields exist |
| 70 | Batch / serial number tracking | ❌ | |

### 2.8  POS Module

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 71 | Terminal / checkout | ✅ | |
| 72 | Orders (CRUD + refunds) | ✅ | |
| 73 | Products management | ✅ | |
| 74 | Shifts management | ✅ | |
| 75 | Tax configuration | ✅ | |
| 76 | Discounts | ✅ | |
| 77 | Daily summary report | ✅ | |
| 78 | Customer tracking | ✅ | |
| 79 | Receipt printing | ❌ | |
| 80 | Loyalty / rewards | ❌ | |

### 2.9  CRM Module

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 81 | Leads (CRUD + convert) | ✅ | |
| 82 | Deals (CRUD) | ✅ | |
| 83 | Contacts (CRUD + import) | ✅ | |
| 84 | Activities | ✅ | |
| 85 | Campaigns | ✅ | |
| 86 | Notes | ✅ | |
| 87 | Reports (pipeline, conversion, forecast) | ✅ | |
| 88 | CSV export | ✅ | |
| 89 | Email integration | ❌ | |
| 90 | Automation / workflow triggers | ❌ | |

### 2.10  HR Module

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 91 | Employees CRUD | ✅ | |
| 92 | Departments & positions | ✅ | |
| 93 | Attendance | ✅ | |
| 94 | Leave management | ✅ | |
| 95 | Payroll | ✅ | |
| 96 | Holidays | ✅ | |
| 97 | Documents | ✅ | |
| 98 | Reports | ✅ | |
| 99 | Performance reviews | ❌ | |
| 100 | Training management | ❌ | |

### 2.11  Booking Module

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 101 | Services CRUD | ✅ | |
| 102 | Appointments CRUD | ✅ | |
| 103 | Availability / slots | ✅ | |
| 104 | Settings + date overrides | ✅ | |
| 105 | Public booking page | ✅ | |
| 106 | Customers | ✅ | |
| 107 | Reports | ✅ | |
| 108 | Conflict detection | ✅ | |
| 109 | Email notifications | ❌ | |
| 110 | Staff assignment | ❌ | |

### 2.12  Procurement Module

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 111 | Suppliers CRUD | ✅ | |
| 112 | Purchase requests | ✅ | |
| 113 | Purchase orders | ✅ | |
| 114 | Contracts | ✅ | |
| 115 | Receipts | ✅ | |
| 116 | Vendor bills | ✅ | |
| 117 | Request → PO conversion | ✅ | |
| 118 | Vendor rating | ❌ | |

### 2.13  Company Management

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 119 | Company profile | ✅ | |
| 120 | Membership tiers | ✅ | |
| 121 | Offers / promotions | ✅ | |
| 122 | Redemptions | ✅ | |
| 123 | Multi-company support | ✅ | |

### 2.14  Owner / Admin

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 124 | User management | ✅ | |
| 125 | Role management | ✅ | |
| 126 | API keys | ✅ | |
| 127 | Billing / subscription | ✅ | |
| 128 | Audit log | ✅ | |
| 129 | Module toggle | ✅ | |

### 2.15  Billing & Subscription

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 130 | Stripe integration | ✅ | |
| 131 | Subscription plans | ✅ | |
| 132 | AI credit management | ✅ | |
| 133 | Plan enforcement | ✅ | |

### 2.16  Cross-Module Integration

| # | Function | Status | Notes |
|---|----------|--------|-------|
| 134 | Receipt → journal entry | ✅ | |
| 135 | Invoice paid → journal entry | ✅ | |
| 136 | POS order → journal entry | ✅ | |
| 137 | POS refund → journal entry | ✅ | |
| 138 | Vendor bill paid → journal entry | ✅ | |
| 139 | Payroll → journal entry | ✅ | |
| 140 | Payment received → journal entry | ✅ | |
| 141 | Stock adjustment → journal entry | ✅ | |

---

## 3  Coverage Summary

| Category | Total | ✅ Exists | ⚠️ Partial | ❌ Missing |
|----------|-------|-----------|------------|-----------|
| AI Chat Core | 9 | 3 | 0 | 6 |
| Setup Agent | 10 | 0 | 0 | 10 |
| Operations Agent | 11 | 0 | 0 | 11 |
| Periodic Review | 10 | 0 | 0 | 10 |
| AI Action Cards | 5 | 5 | 0 | 0 |
| Accounting | 14 | 12 | 0 | 2 |
| Inventory | 11 | 9 | 1 | 1 |
| POS | 10 | 8 | 0 | 2 |
| CRM | 10 | 8 | 0 | 2 |
| HR | 10 | 8 | 0 | 2 |
| Booking | 10 | 8 | 0 | 2 |
| Procurement | 8 | 7 | 0 | 1 |
| Company Mgmt | 5 | 5 | 0 | 0 |
| Owner / Admin | 6 | 6 | 0 | 0 |
| Billing | 4 | 4 | 0 | 0 |
| Cross-Module | 8 | 8 | 0 | 0 |
| **TOTAL** | **141** | **91** | **1** | **49** |

**Overall coverage: 65 %** (91 / 141 functions exist).

The **core business modules are comprehensive** for an SMC.
The primary gap is the **AI agent layer** (31 functions across Setup / Ops / Review).

---

## 4  Architecture Decision: Separate Backend Engine vs In-App?

### Recommendation: **Build within the existing Next.js app**

| Consideration | In-App (Recommended) | Separate Engine |
|---------------|---------------------|-----------------|
| Deployment complexity | Single deploy | Two services to manage |
| Data access | Direct Supabase access | Needs API gateway or shared DB |
| Latency | Low (same process) | Higher (network hop) |
| Scaling AI workloads | Use Vercel Cron + Edge Functions | Dedicated worker pool |
| Cost | No extra infra | Extra container / VM |
| Development speed | Faster — shared types & utils | Slower — API contracts needed |

**Why in-app?**
- Cardlink already has an AI provider abstraction layer (`src/lib/ai/`)
- The Supabase client is shared across all modules
- Next.js API routes + Vercel Cron handles scheduled tasks
- No need for a separate orchestration engine like n8n — the agent prompts
  do the orchestration within the existing API surface

For heavy background jobs (e.g., annual review across large datasets),
use a **cron-triggered API route** that processes in chunks.

---

## 5  Implementation Plan

### Phase 1 – Core Agent Infrastructure (This PR)

1. **Agent system prompts** (`src/lib/ai/agent-prompts.ts`)
2. **Data transformer** (`src/lib/ai/data-transformer.ts`)
3. **Setup Agent APIs** – upload, preview, apply
4. **Operations Agent API** – intent → action
5. **Review Agent API** – daily / monthly / annual
6. **Cron endpoint** for periodic reviews
7. **Updated UI** – mode tabs, file upload, review triggers
8. **DB migration** – `ai_setup_uploads`, `ai_business_reviews`
9. **Translations** (en, zh-HK, zh-CN, zh-TW)

### Phase 2 – Enhancements (Future)

- Message streaming (SSE)
- Conversation search
- Email digest for reviews
- Advanced anomaly detection
- Rollback for failed imports
- Chat export

---

## 6  Acceptance Checklist

- [x] Gap analysis document with function list
- [ ] 3 agent modes visible on AI conversation page
- [ ] File upload → AI parse → preview → apply works end-to-end
- [ ] Operations agent can dispatch to business modules
- [ ] Review agent produces daily / monthly / annual reports
- [ ] Cron endpoint callable by external scheduler
- [ ] All translations added (en, zh-HK, zh-CN, zh-TW)
- [ ] TypeScript compiles without errors
- [ ] No new security vulnerabilities
