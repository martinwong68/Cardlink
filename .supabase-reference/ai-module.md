# AI Module (Credits, Conversations, Action Cards)

> Auto-generated from Supabase database on 2025-07-21
> 5 tables | All verified ✅ in live DB (currently 0 rows)

---

## Table of Contents

- [ai_credits](#ai_credits) — 0 rows
- [ai_conversations](#ai_conversations) — 0 rows
- [ai_messages](#ai_messages) — 0 rows
- [ai_action_cards](#ai_action_cards) — 0 rows
- [ai_card_feedback](#ai_card_feedback) — 0 rows

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
**Description:** AI-generated action cards from rule engine analysis.

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| type | text | | alert, suggestion, insight |
| title | text | | |
| description | text | | |
| module | text | | Source module |
| priority | text | | low, medium, high |
| status | text | 'active' | active, dismissed, acted |
| action_url | text | | Link to relevant page |
| metadata | jsonb | | Additional context |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

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

## Cross-Module Linkage

### AI → All Modules
- `ai_conversations.context` specifies which module the conversation is about
- `ai_action_cards.module` indicates which module generated the insight
- AI rule engine can analyze data from any module and generate action cards

### AI → Billing
- `ai_credits` tracks usage against `subscription_plans.ai_actions_monthly` quota
- Credit consumption is checked before each AI action
