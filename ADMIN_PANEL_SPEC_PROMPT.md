# CardLink Admin Panel Spec v2 (Build-Now)

Last updated: 2026-02-22

## 1) Objective
Build a **separate Admin Panel repository** for CardLink operations, with strict privilege boundaries and auditability.

Primary outcomes:
- Admin can grant/revoke company ownership safely
- Admin can moderate users/posts/cards with reason + audit trail
- Admin can manage membership finance records (spend + bobo-point ledger) in admin app only
- Main app can read membership finance/tier state immediately after join and after admin adjustments

---

## 2) Build Principles (Lock These)
- Keep scope MVP-first (P0 first, P1 after P0 acceptance)
- Every privileged mutation must write immutable `admin_audit_logs`
- High-risk actions require typed reason and optional 2-person approval
- Role check at route, server handler, and DB policy layers
- Prefer idempotent SQL and backward-compatible rollout

---

## 3) Tech Stack (New Repo)
- Next.js 16 + TypeScript + App Router
- Tailwind CSS
- Supabase Auth + Postgres + RLS
- Route Handlers / Server Actions for privileged operations
- Zod validation for all input payloads
- Recharts for analytics

---

## 4) Roles & Access Matrix
- `super_admin`: full access
- `ops_admin`: ownership ops + user/card moderation + membership finance ops
- `content_admin`: content moderation only
- `analyst_admin`: read-only analytics and reports

Must-have:
- Every admin page checks role
- Every mutation checks role + scope + reason requirement (if sensitive)
- Every mutation writes `admin_audit_logs`
- Admin app is the **only writer** to membership finance ledger tables

---

## 5) Scope by Phase

### P0 (Ship First)
1. Admin authentication + allowlist
2. Role guard middleware + server guard utilities
3. User moderation (suspend / unsuspend / soft ban)
4. Company ownership tools (grant / revoke / transfer owner)
5. Membership finance writes (add/reverse spend, add/reverse bobo-point)
6. Tier recompute execution after finance writes
7. Audit log viewer + CSV export
8. Basic analytics overview page

### P1 (After P0 acceptance)
1. Full report queue for content moderation
2. Card risk scoring + moderation queue
3. Two-person approval flow for high-risk actions
4. Advanced company analytics pages

Out of scope for initial build:
- Appeal workflow
- Automated enforcement engine
- Case management timeline UI

---

## 6) Main App Integration Contract (Required)
1. Membership join appears in membership list immediately (same request cycle or immediate refresh).
2. Join flow is idempotent by `(company_id, user_id)`.
3. Main app membership UI shows company, current tier, effective spend, next tier delta.
4. Company owner/admin can read transaction history (read-only from main app).
5. Company owner/admin can update tier required spend policy (audited).

---

## 7) Database Strategy (Important)

### 7.1 Current main-app schema reality (already in this repo)
Existing membership model currently uses:
- `membership_programs`
- `membership_tiers`
- `membership_accounts`
- `membership_join_company(uuid)` RPC

### 7.2 Admin repo strategy
Use a **compatibility-first** approach:
- Keep existing membership core tables and RPC contracts compatible with main app
- Add admin-specific tables in separate migration pack
- If introducing new abstractions (e.g. `company_membership_tiers`), provide compatibility view/function layer before cutover

### 7.3 Admin tables (required)
- `admin_users`
- `admin_audit_logs` (immutable)
- `admin_reports`
- `admin_action_approvals`

### 7.4 Membership finance tables (admin-write only)
- `membership_transactions`
- `membership_bobo_point_ledger`

### 7.5 Enums / constrained values
- `admin_role`: `super_admin | ops_admin | content_admin | analyst_admin`
- `admin_report_target_type`: `user | post | card | company | membership_account`
- `admin_report_status`: `open | reviewing | resolved | rejected`
- `admin_approval_status`: `pending | approved | rejected`
- `membership_txn_type`: `spend | refund | manual_adjustment`
- `membership_txn_status`: `posted | reversed`
- `bobo_point_txn_type`: `earn | redeem | expire | manual_adjustment`
- `tier_eval_mode`: `lifetime_spend | rolling_365d_spend`

### 7.6 Required DB functions
- `fn_recompute_membership_account(p_membership_account_id uuid)`
- `fn_apply_membership_transaction(...)` (admin-only)
- `fn_apply_bobo_point_adjustment(...)` (admin-only)
- `fn_set_company_tier_thresholds(...)` (company owner/admin or ops/super)
- keep `membership_join_company(uuid)` behavior idempotent and non-ambiguous

### 7.7 RLS requirements
- `membership_transactions` and `membership_bobo_point_ledger`: write only via admin app service role / controlled RPC
- Company owner/admin/manager: read company-scoped membership account + transaction data
- Member: read own account + own transaction records
- `admin_audit_logs`: deny update/delete for non-service roles

---

## 8) API Contract (Minimum)

### Admin app endpoints
- `POST /api/admin/company/grant-owner`
- `POST /api/admin/company/revoke-owner`
- `POST /api/admin/company/transfer-owner`
- `POST /api/admin/user/suspend`
- `POST /api/admin/user/ban`
- `POST /api/admin/post/hide`
- `POST /api/admin/post/delete`
- `POST /api/admin/membership/transactions/add`
- `POST /api/admin/membership/transactions/reverse`
- `POST /api/admin/membership/bobo-points/add`
- `POST /api/admin/membership/bobo-points/reverse`
- `GET /api/admin/analytics/overview`
- `GET /api/admin/analytics/company/:id`
- `GET /api/admin/audit-logs`

### Main app endpoints / server actions
- `POST /api/company/:id/memberships/join`
- `GET /api/me/memberships`
- `GET /api/company/:id/memberships`
- `GET /api/company/:id/memberships/:accountId/transactions`
- `POST /api/company/:id/membership-tiers/thresholds`

All endpoints must:
- validate input with zod
- enforce role + company scope
- write audit log for all mutations
- return typed response models

---

## 9) Information Architecture (Admin)
- `/admin/login`
- `/admin/overview`
- `/admin/users`
- `/admin/users/[id]`
- `/admin/companies`
- `/admin/companies/[id]`
- `/admin/companies/[id]/memberships`
- `/admin/content/reports`
- `/admin/content/posts/[id]`
- `/admin/cards`
- `/admin/analytics`
- `/admin/audit-logs`
- `/admin/settings/roles`

---

## 10) Non-Functional Requirements
- Pagination + filters + search + date range for large tables
- Optimistic UI only for low-risk actions
- High-risk actions require typed reason and confirm step
- Feature flag destructive actions
- Idempotent migrations with rollback notes
- Tests:
  - unit: role guards, ownership change, finance recompute, audit write
  - e2e: moderation flow + membership finance flow

---

## 11) Ready-to-use Prompt for New Repo Agent (Use This)

```text
Build a production-ready CardLink Admin Panel in Next.js App Router + TypeScript + Tailwind + Supabase.

Critical context:
- This is a separate admin repository.
- The existing main app already uses membership_programs, membership_tiers, membership_accounts, and membership_join_company(uuid).
- Keep compatibility with existing membership contracts while adding admin-side finance control.

Implementation requirements:
1) Implement role-based admin access for super_admin, ops_admin, content_admin, analyst_admin.
2) Add pages:
   /admin/login
   /admin/overview
   /admin/users
   /admin/users/[id]
   /admin/companies
   /admin/companies/[id]
   /admin/companies/[id]/memberships
   /admin/content/reports
   /admin/cards
   /admin/analytics
   /admin/audit-logs
3) Implement ownership operations:
   - grant company owner/admin role
   - revoke owner/admin role
   - ownership transfer with safety checks
4) Implement moderation operations:
   - suspend/ban user
   - hide/delete post
   - disable/restore public card
5) Implement membership finance operations (admin app is only writer):
   - add/reverse spend transaction
   - add/reverse bobo-point ledger entry
   - recompute membership account/tier after each finance mutation
6) Implement immutable admin audit log for every privileged action.
7) Add zod validation + server-side role/scope guards to every admin mutation.
8) Add migrations for:
   - admin_users
   - admin_audit_logs
   - admin_reports
   - admin_action_approvals
   - membership_transactions
   - membership_bobo_point_ledger
   and required indexes/RLS/functions.
9) RLS requirements:
   - membership transaction and point ledger writes only via admin service role or controlled admin RPC
   - company owner/admin/manager read-only access for company-scoped membership transactions
10) Implement analytics:
   - platform KPI overview
   - company KPI page
11) Add tests for:
   - role guard
   - ownership grant/revoke
   - moderation mutation
   - membership finance mutation + recompute
   - audit log write

Output expectations:
- runnable project structure
- migration SQL with constraints/indexes/RLS/functions
- typed route handlers/actions
- minimal clean UI (no extra pages or over-design)
- README with setup, env vars, and role bootstrap steps
```

---

## 12) Delivery Checklist
- [ ] Admin role guard in middleware and server handlers
- [ ] Ownership grant/revoke/transfer works and is audited
- [ ] User/post/card moderation works and is audited
- [ ] Membership join result shows up immediately in main app list
- [ ] Company owner/admin can read membership transaction history
- [ ] Tier threshold update is role-scoped and audited
- [ ] Membership spend/point writes are admin-only
- [ ] Analytics pages query real Supabase data
- [ ] Audit logs are searchable/exportable
- [ ] Tests pass
- [ ] README complete

---

## 13) Day 1 Execution Plan (Start Here)

### A) Migration order (apply in this sequence)
1. `001_admin_core.sql`
   - create: `admin_users`, `admin_audit_logs`, `admin_reports`, `admin_action_approvals`
   - add indexes + immutable policy for `admin_audit_logs`
2. `002_membership_finance_tables.sql`
   - create: `membership_transactions`, `membership_bobo_point_ledger`
   - add FK/indexes and check constraints
3. `003_membership_finance_functions.sql`
   - create: `fn_recompute_membership_account`
   - create: `fn_apply_membership_transaction`
   - create: `fn_apply_bobo_point_adjustment`
4. `004_membership_tier_policy.sql`
   - create/update: tier policy function (e.g. `fn_set_company_tier_thresholds`)
   - validate monotonic thresholds by rank
5. `005_rls_and_grants.sql`
   - enforce admin-only writes on ledger tables
   - enforce company-scope/member-scope read policies
   - grant execute for controlled RPC only
6. `006_admin_seed_and_bootstrap.sql`
   - seed first `super_admin` by known user id/email mapping
   - add rollback note in comments

Migration guardrails:
- Every migration must be idempotent (`IF NOT EXISTS`, safe `DROP ... IF EXISTS` before recreate)
- Never break existing `membership_join_company(uuid)` contract used by main app
- If changing function signatures, ship compatibility wrappers in same release

### B) Route handler skeleton order (build top-down)
1. Foundation utilities
   - `src/lib/auth/admin-session.ts`
   - `src/lib/auth/require-admin-role.ts`
   - `src/lib/audit/write-admin-audit-log.ts`
   - `src/lib/validation/*` (shared zod schemas)
2. Health + auth routes
   - `app/api/admin/auth/me/route.ts`
   - `app/api/admin/auth/login/route.ts`
3. Ownership routes
   - `app/api/admin/company/grant-owner/route.ts`
   - `app/api/admin/company/revoke-owner/route.ts`
   - `app/api/admin/company/transfer-owner/route.ts`
4. Moderation routes
   - `app/api/admin/user/suspend/route.ts`
   - `app/api/admin/user/ban/route.ts`
   - `app/api/admin/post/hide/route.ts`
   - `app/api/admin/post/delete/route.ts`
5. Membership finance routes
   - `app/api/admin/membership/transactions/add/route.ts`
   - `app/api/admin/membership/transactions/reverse/route.ts`
   - `app/api/admin/membership/bobo-points/add/route.ts`
   - `app/api/admin/membership/bobo-points/reverse/route.ts`
6. Read routes
   - `app/api/admin/audit-logs/route.ts`
   - `app/api/admin/analytics/overview/route.ts`
   - `app/api/admin/analytics/company/[id]/route.ts`

Per-route definition of done:
- validate request with zod
- `requireAdminRole(...)` authorization
- execute operation in transaction when needed
- write audit log with `action`, `entity_type`, `entity_id`, `reason`, `before`, `after`
- return typed success/error payload

### C) Role guard implementation order (do not skip)
1. Middleware-level coarse gate
   - protect `/admin/*`
   - redirect unauthenticated users to `/admin/login`
2. Server-level strict gate
   - `requireAdminRole(allowedRoles)` in every mutation/read handler
   - reject inactive admin users
3. Scope-level gate
   - verify company scope for company-bound operations
   - verify target entity exists and is in scope before mutation
4. DB-level gate
   - RLS + RPC grants enforce least privilege even if route guard fails
5. Audit enforcement gate
   - privileged action fails if reason is required but empty
   - privileged action fails if audit write fails

### D) Day-1 concrete checklist (8-10 hours)
- [ ] Create new admin repo scaffold and env template
- [ ] Implement `admin_users` + `admin_audit_logs` migrations
- [ ] Implement shared auth/role/audit helper libs
- [ ] Ship ownership endpoints (grant/revoke/transfer) end-to-end
- [ ] Ship membership finance add/reverse endpoints end-to-end
- [ ] Add audit log list API + minimal table UI
- [ ] Add 1 integration test: ownership grant writes audit
- [ ] Add 1 integration test: transaction add triggers recompute + audit
- [ ] Add README bootstrap: create first super_admin

### E) Immediate post-Day-1 smoke tests
- Create test admin -> access `/admin/overview`
- Run grant owner -> verify role changed + audit row written
- Run add spend txn -> verify account spend/tier recomputed
- Verify non-admin cannot write ledger tables directly
- Verify company owner can read (not write) membership transactions
