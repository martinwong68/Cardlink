# Admin & Platform Module (Modules, Security, Audit)

> Auto-generated from Supabase database on 2025-07-21
> 9 tables | All verified ✅ in live DB

---

## Table of Contents

- [company_modules](#company_modules) — 0 rows
- [company_security_settings](#company_security_settings) — 0 rows
- [company_api_keys](#company_api_keys) — 0 rows
- [company_audit_logs](#company_audit_logs) — 0 rows
- [admin_users](#admin_users) — 1 row
- [admin_audit_logs](#admin_audit_logs) — 13 rows
- [admin_reports](#admin_reports) — 0 rows
- [admin_action_approvals](#admin_action_approvals) — 0 rows
- [notifications](#notifications) — 2 rows

---

## company_modules

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id
**Description:** Controls which modules are enabled for each company.

### Columns (8)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| module_name | text | | accounting, pos, procurement, crm, inventory, cards, membership, client |
| is_enabled | boolean | false | |
| enabled_at | timestamptz | | |
| enabled_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Constraints

- `UNIQUE(company_id, module_name)`

---

## company_security_settings

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id (UNIQUE — 1 row per company)

### Columns (12)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id (UNIQUE) |
| two_factor_required | boolean | | |
| password_expiry_days | int | | |
| session_timeout_minutes | int | | |
| ip_whitelist_enabled | boolean | | |
| ip_whitelist | text[] | | Array of allowed IPs |
| login_alerts_enabled | boolean | | |
| audit_enabled | boolean | true | |
| updated_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## company_api_keys

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (12)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | Key label |
| key_prefix | text | | First few chars for identification |
| key_hash | text | | Hashed API key (never stored plain) |
| scopes | text[] | | Allowed permissions |
| is_active | boolean | | |
| last_used_at | timestamptz | | |
| expires_at | timestamptz | | |
| created_by | uuid | | |
| created_at | timestamptz | now() | |
| revoked_at | timestamptz | | |

---

## company_audit_logs

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (8)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| actor_user_id | uuid | | Who did it |
| action | text | | Action performed |
| entity_type | text | | What was affected |
| entity_id | uuid | | |
| payload | jsonb | | Additional data |
| created_at | timestamptz | now() | |

---

## admin_users

**Status:** ✅ Exists (1 row)
**FK:** user_id → auth.users
**Description:** Platform-level admin accounts (super-admins).

### Columns (7)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| user_id | uuid | | FK → auth.users |
| role | text | | super_admin, moderator, support |
| is_active | boolean | | |
| allowlisted_email | text | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## admin_audit_logs

**Status:** ✅ Exists (13 rows)
**Description:** Platform admin action audit trail.

### Columns (9)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| actor_admin_user_id | uuid | | FK → admin_users.id |
| actor_user_id | uuid | | FK → auth.users |
| action | text | | |
| target_table | text | | |
| target_id | uuid | | |
| reason | text | | |
| payload | jsonb | | |
| created_at | timestamptz | now() | |

---

## admin_reports

**Status:** ✅ Exists (0 rows)
**Description:** User reports for moderation.

### Columns (10)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| target_type | text | | post, user, card, etc. |
| target_id | uuid | | |
| status | text | 'open' | open, investigating, resolved, dismissed |
| summary | text | | |
| created_by | uuid | | Reporter |
| assigned_admin_user_id | uuid | | Assigned moderator |
| resolved_at | timestamptz | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## admin_action_approvals

**Status:** ✅ Exists (0 rows)
**Description:** Two-person approval for sensitive admin actions.

### Columns (8)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| action_key | text | | Unique action identifier |
| status | text | 'pending' | pending, approved, rejected |
| requester_admin_user_id | uuid | | |
| approver_admin_user_id | uuid | | |
| reason | text | | |
| created_at | timestamptz | now() | |
| decided_at | timestamptz | | |

---

## notifications

**Status:** ✅ Exists (2 rows)
**FK:** user_id → auth.users

### Columns (10)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| user_id | uuid | | FK → auth.users |
| type | text | | connection_request, card_share, etc. |
| title | text | | |
| body | text | | |
| related_user_id | uuid | | |
| related_card_id | uuid | | |
| related_connection_id | uuid | | |
| is_read | boolean | | |
| created_at | timestamptz | now() | |

---

## Cross-Module Linkage

- `company_modules` controls which features are available per company — checked by UI
- `company_audit_logs` records actions across all company modules
- `admin_users` / `admin_audit_logs` are platform-level (not per-company)
- `notifications` can reference cards (namecard), connections (community), and users
