# AI Module (Credits, Conversations, Action Cards, Setup, Reviews)

> Auto-generated from Supabase database on 2025-07-21
> Updated 2026-03-25 with ai_action_cards schema correction, ai_setup_uploads, ai_business_reviews
> 7 tables | All verified ✅ in live DB

---

## Table of Contents

- [ai_credits](#ai_credits) — 0 rows
- [ai_conversations](#ai_conversations) — 0 rows
- [ai_messages](#ai_messages) — 0 rows
- [ai_action_cards](#ai_action_cards) — 0 rows
- [ai_card_feedback](#ai_card_feedback) — 0 rows
- [ai_setup_uploads](#ai_setup_uploads) — 0 rows
- [ai_business_reviews](#ai_business_reviews) — 0 rows

---

## ai_credits

**Status:** ✅ Exists (0 rows)
**Description:** AI action credit balance per user/company.

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| user_id | uuid | | FK → auth.users |
| company_id | uuid | | FK → companies.id (nullable) |
| credits_remaining | int | | |
| credits_used | int | 0 | |
| period_start | timestamptz | | |
| period_end | timestamptz | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## ai_conversations

**Status:** ✅ Exists (0 rows)
**Description:** AI chat conversation sessions.

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| user_id | uuid | | FK → auth.users |
| company_id | uuid | | FK → companies.id |
| title | text | | Conversation title |
| context | text | | Module context (accounting, inventory, etc.) |
| agent_mode | text | 'chat' | chat, setup, operations, review |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Referenced By

| Table | Column |
|-------|--------|
| ai_messages | conversation_id |

---

## ai_messages

**Status:** ✅ Exists (0 rows)
**FK:** conversation_id → ai_conversations.id

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| conversation_id | uuid | | FK → ai_conversations.id |
| role | text | | user, assistant, system |
| content | text | | Message content |
| metadata | jsonb | | Tool calls, context, etc. |
| created_at | timestamptz | now() | |

---

## ai_action_cards

**Status:** ✅ Exists (0 rows)
**Description:** AI-generated action cards from preset operations and rule engine analysis.

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| conversation_id | uuid | | FK → ai_conversations.id (nullable) |
| company_id | uuid | | FK → companies.id (NOT NULL) |
| card_type | text | | NOT NULL. journal_entry, invoice, inventory_update, expense, navigation, report, general, payment, stock_adjustment, product, purchase_order, sale, lead, contact, bulk_import |
| title | text | | NOT NULL |
| description | text | | |
| suggested_data | jsonb | '{}' | NOT NULL. Stores action steps/params |
| status | text | 'pending' | NOT NULL. pending, approved, amended, rejected |
| confidence_score | numeric | | 0–1 range |
| source_module | text | | Source module (accounting, inventory, etc.) |
| approved_by | uuid | | FK → auth.users |
| approved_at | timestamptz | | |
| amended_data | jsonb | | |
| feedback_note | text | | |
| created_at | timestamptz | now() | |

### Constraints

- `CHECK (card_type IN ('journal_entry','invoice','inventory_update','expense','navigation','report','general','payment','stock_adjustment','product','purchase_order','sale','lead','contact','bulk_import'))`
- `CHECK (status IN ('pending','approved','amended','rejected'))`
- `CHECK (confidence_score >= 0 AND confidence_score <= 1)`

### Referenced By

| Table | Column |
|-------|--------|
| ai_card_feedback | card_id |

---

## ai_card_feedback

**Status:** ✅ Exists (0 rows)
**FK:** card_id → ai_action_cards.id

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| card_id | uuid | | FK → ai_action_cards.id |
| user_id | uuid | | FK → auth.users |
| feedback | text | | helpful, not_helpful |
| comment | text | | |
| created_at | timestamptz | now() | |

---

## ai_setup_uploads

**Status:** ✅ Exists (0 rows)
**Description:** Tracks files uploaded through the Setup Agent for onboarding.

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id (NOT NULL) |
| user_id | uuid | | FK → auth.users (NOT NULL) |
| file_name | text | | NOT NULL |
| file_size | integer | 0 | |
| document_type | text | | Detected type: inventory_products, accounting_accounts, etc. |
| target_module | text | | inventory, accounting, hr, crm, pos, company |
| ai_response | text | | Raw AI response with parsed data |
| status | text | 'preview' | preview, applied, failed, cancelled |
| applied_count | integer | 0 | |
| error_message | text | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## ai_business_reviews

**Status:** ✅ Exists (0 rows)
**Description:** Stores periodic business review results from the Review Agent.

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id (NOT NULL) |
| user_id | uuid | | FK → auth.users |
| review_type | text | | NOT NULL. daily, monthly, annual |
| ai_response | text | | Raw AI response with the review report |
| status | text | 'pending' | pending, completed, failed |
| triggered_by | text | 'user' | user, cron |
| overall_health | text | | good, warning, critical (extracted from report) |
| score | integer | | 0–100 (extracted from report) |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Constraints

- `CHECK (review_type IN ('daily', 'monthly', 'annual'))`

---

## Cross-Module Linkage

### AI → All Modules
- `ai_conversations.context` specifies which module the conversation is about
- `ai_action_cards.source_module` indicates which module generated the insight
- AI rule engine can analyze data from any module and generate action cards

### AI → Billing
- `ai_credits` tracks usage against `subscription_plans.ai_actions_monthly` quota
- Credit consumption is checked before each AI action
