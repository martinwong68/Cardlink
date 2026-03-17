# Stage-0: Company Feature Migration Plan

## 1. Objective
- Migrate company-facing capabilities from Client App to Business App.
- Prioritize migration of company card management and company management first.
- Ensure zero ownership ambiguity after migration.

## 2. Scope in
- Define migration map for company card and company management features.
- Define deprecation and redirect plan for Client App entry points.
- Define access-control transition rules during migration.
- Define data continuity and rollback planning requirements.

## 3. Scope out
- No code implementation.
- No direct DB edits.
- No permanent removal of old paths until cutover gates are passed.
- No changes to non-company consumer flows.

## 4. Deliverables
- Feature Migration Matrix (v1):
- Company Card Management: source Client App -> target Business App.
- Company Management: source Client App -> target Business App.
- Cutover Plan (v1):
- Phase A: Contract freeze and API/event mapping.
- Phase B: Business App ownership activation.
- Phase C: Client App entry-point redirect and write-lock.
- Phase D: Old path retirement after verification.
- Access Transition Plan (v1):
- Role checks remain tenant-scoped by company_id.
- During transition, writes are allowed only on target ownership paths.

## 5. Risks and mitigations
- Risk: Dual-write or split-brain behavior during transition.
- Mitigation: Enforce single-write rule on target app before redirect.
- Risk: Users enter old routes and fail critical workflows.
- Mitigation: Add explicit redirects with fallback guidance and support path.
- Risk: Permissions regress after route ownership change.
- Mitigation: Add role-based smoke checklist before each phase gate.
- Risk: Data mismatch between old and new views.
- Mitigation: Define pre/post migration reconciliation checks.

## 6. Acceptance checklist
- Migration matrix for company card and company management is approved.
- Cutover phases and rollback notes are approved.
- Access-control transition rules are approved.
- Redirect and old-path retirement conditions are approved.
- Architecture-Guard verifies compatibility and sequencing.
