# Stage-1 Delivery Controls

## 1. Objective
- Provide mandatory execution controls required by Architecture-Guard before merge.

## 2. Scope in
- Migration control rules.
- RLS impact review template.
- Backward compatibility matrix template.
- Executable smoke checklist template.
- Direct DB API edit decision and logging rule.

## 3. Scope out
- No implementation details.
- No schema changes.

## 4. Deliverables

### 4.1 Migration Control
- Naming format: YYYYMMDD_domain_change.sql
- Order rule: one migration author at a time, append-only queue.
- Rollback note required per migration:
- rollback precondition
- rollback SQL summary
- data loss risk

### 4.2 RLS Impact Sheet (per write task)
- Task ID:
- Affected tables:
- Affected policies:
- Allowed roles:
- Denied roles:
- Tenant isolation checks:
- Regression test cases:

### 4.3 Backward Compatibility Matrix
| Old Path | New Path | Compatibility behavior | Cutover trigger | Rollback trigger |
|---|---|---|---|---|
| /dashboard/company-management | /business/company-management | redirect-only, no behavior loss | business path stable | route error or RBAC mismatch |
| /dashboard/cards?tab=company | /business/company-cards | redirect/link handoff | business path stable | write failure or unavailable management path |

### 4.4 Smoke Test Checklist (per day)
1. Authenticated user can access /business/company-cards.
2. Authenticated user can access /business/company-management.
3. Legacy dashboard company-management route redirects successfully.
4. Owner/admin/manager can write expected company management actions.
5. Staff role cannot execute restricted management writes.
6. Cross-company read/write attempt is denied.
7. POS payment contract scaffold fields include idempotency_key and provider_event_id.

### 4.5 Direct DB API Edit Decision Rule
- This is considered direct DB API edit when any REST/RPC operation mutates DB state outside migration files.
- If direct DB API edit occurs, log entry is mandatory in docs/DB_CHANGELOG.md before merge.
- Missing log entry blocks merge.

## 5. Risks and mitigations
- Risk: merge without RLS review causes tenant leak.
- Mitigation: RLS Impact Sheet is mandatory per write task.
- Risk: migration conflicts from parallel branches.
- Mitigation: single migration author queue and order checks.

## 6. Acceptance checklist
- Migration control is documented and used.
- RLS impact sheet is attached for each write task.
- Backward compatibility matrix is completed for route ownership changes.
- Smoke test checklist is executed daily.
- Direct DB API edits are logged in docs/DB_CHANGELOG.md when applicable.
