# CRM Module (Leads, Deals, Contacts, Campaigns)

> Auto-generated from Supabase database on 2025-07-21
> 6 tables | All verified ✅ in live DB (currently 0 rows)

---

## Table of Contents

- [crm_leads](#crm_leads) — 0 rows
- [crm_deals](#crm_deals) — 0 rows
- [crm_contacts](#crm_contacts) — 0 rows
- [crm_activities](#crm_activities) — 0 rows
- [crm_campaigns](#crm_campaigns) — 0 rows
- [crm_notes](#crm_notes) — 0 rows

---

## crm_leads

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (13)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | Lead name |
| email | text | | |
| phone | text | | |
| source | text | 'manual' | manual, website, referral, etc. |
| status | text | 'new' | new, contacted, qualified, converted, lost |
| assigned_to | uuid | | FK → auth.users |
| value | numeric | 0 | Estimated value |
| notes | text | | |
| created_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

### Referenced By

| Table | Column |
|-------|--------|
| crm_deals | lead_id |

---

## crm_deals

**Status:** ✅ Exists (0 rows)
**FKs:** company_id → companies.id, lead_id → crm_leads.id

### Columns (14)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| title | text | | Deal title |
| value | numeric | 0 | Deal value |
| stage | text | 'discovery' | discovery, proposal, negotiation, closed_won, closed_lost |
| probability | numeric | 0 | Win probability % |
| lead_id | uuid | | FK → crm_leads.id |
| contact_name | text | | |
| assigned_to | uuid | | FK → auth.users |
| expected_close_date | date | | |
| notes | text | | |
| created_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

---

## crm_contacts

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (12)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | |
| email | text | | |
| phone | text | | |
| company_name | text | | The contact's company |
| position | text | | Job title |
| tags | text[] | | Array of tags |
| notes | text | | |
| created_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

### Referenced By

| Table | Column |
|-------|--------|
| crm_notes | contact_id |

---

## crm_activities

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (13)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| type | text | 'task' | task, call, meeting, email, note |
| title | text | | |
| description | text | | |
| due_date | timestamptz | | |
| status | text | 'pending' | pending, completed, cancelled |
| related_type | text | | lead, deal, contact |
| related_id | uuid | | Polymorphic FK |
| assigned_to | uuid | | FK → auth.users |
| created_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

---

## crm_campaigns

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (17)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | Campaign name |
| type | text | 'email' | email, sms, social, event |
| status | text | 'draft' | draft, active, paused, completed |
| budget | numeric | | |
| spent | numeric | | |
| sent | int | | Messages sent |
| opened | int | | Messages opened |
| clicked | int | | Links clicked |
| converted | int | | Conversions |
| start_date | date | | |
| end_date | date | | |
| notes | text | | |
| created_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

---

## crm_notes

**Status:** ✅ Exists (0 rows)
**FKs:** owner_id → auth.users, contact_id → crm_contacts.id

### Columns (8)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| owner_id | uuid | | FK → auth.users |
| contact_id | uuid | | FK → crm_contacts.id |
| note_text | text | | |
| tags | text[] | | Array of tags |
| reminder_date | timestamptz | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## Cross-Module Linkage

### CRM → Accounting
- When a deal is closed_won, an invoice can be created in the accounting module
- `crm_activities.related_type` can reference invoices or other accounting entities

### CRM → Membership
- CRM contacts can be linked to membership accounts via email matching
- Campaign results can feed into membership engagement tracking
