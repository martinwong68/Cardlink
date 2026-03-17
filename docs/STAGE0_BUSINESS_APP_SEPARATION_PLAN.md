# Stage-0: Business App Separation Plan

## 1. Objective
- Split Cardlink into two app experiences with clear ownership:
- Client App is minimized for public and consumer-facing flows.
- Business App becomes the only app for business operations and all new development.
- Keep one shared backend contract layer for auth, tenancy, data, and events.

## 2. Scope in
- Define two-app product boundary and ownership matrix.
- Define route and feature allocation between Client App and Business App.
- Define shared backend contract model (API and event boundaries).
- Define governance model for contract-first development and integration windows.
- Define Stage-0 gate criteria before any implementation starts.

## 3. Scope out
- No runtime code changes.
- No migration file creation or schema execution.
- No UI implementation or style updates.
- No production deployment changes.

## 4. Deliverables
- App Ownership Matrix (v1):
- Client App owns public card viewing, tap status pages, and basic contact/share entry points.
- Business App owns namecard management, company management, inventory, procurement, POS, online shop, accounting, HR, and channel modules.
- Shared Backend Contract Matrix (v1):
- Auth and tenant context are shared.
- Domain contracts are owned per module and consumed via APIs/events only.
- Stage-0 Governance Rules (v1):
- Contract first, then implementation.
- One migration owner at a time.
- Daily integration window with smoke-check review.

## 5. Risks and mitigations
- Risk: Feature overlap between apps causes duplicated effort.
- Mitigation: Enforce a single owner per feature with a signed App Ownership Matrix.
- Risk: Hidden cross-app dependencies appear during migration.
- Mitigation: Require API/event contract declaration before moving any feature.
- Risk: Team accidentally builds business features in Client App.
- Mitigation: Add sprint gate to reject business-scope tasks outside Business App.

## 6. Acceptance checklist
- Client App and Business App ownership boundaries are documented and approved.
- Business-only development policy is documented and approved.
- Shared backend contract boundaries are documented and approved.
- Stage-0 governance and review gates are documented and approved.
- Architecture-Guard confirms no conflict with existing contract-first workflow.
