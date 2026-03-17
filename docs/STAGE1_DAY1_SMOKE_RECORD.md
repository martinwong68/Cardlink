# Stage-1 Day-1 Smoke Record

## Objective
- Record Day-1 execution evidence for Sprint-1 kickoff.

## Scope in
- Business App route reachability.
- Legacy route redirect checks.
- Contract scaffold endpoint availability.

## Scope out
- No full module E2E behavior validation.
- No production load/performance test.

## Deliverables
- Date: 2026-03-11
- Build gate command observed: APPROVED TO BUILD
- Checked routes:
- /business
- /business/company-cards
- /business/company-management
- /business/inventory
- /business/procurement
- /business/pos
- Redirect checks:
- /dashboard/company-management -> /business/company-management
- /dashboard/cards?tab=company -> /business/company-cards
- Checked scaffold APIs:
- /api/inventory/products
- /api/inventory/balances
- /api/procurement/suppliers
- /api/procurement/purchase-orders
- /api/pos/contracts

## Risks and mitigations
- Risk: Contract scaffolds are accepted but DB integration is not yet connected.
- Mitigation: Keep status as scaffold/accepted and attach integration tasks for Sprint-2 slices.
- Risk: Write ownership leak via legacy routes.
- Mitigation: Keep legacy company routes redirect-only and enforce business scope for company account creation API.

## Acceptance checklist
- Business routes exist and are reachable in app structure.
- Legacy company management routes are redirect-safe.
- Sprint-1 scaffold endpoints are present and lint-clean.
