# Stage-1 Architecture Guard Gate Report

## Review Scope
- Sprint-1 planned work under approved Stage-0 package.
- Gate checklist:
1. Contract exists.
2. Migration naming and order.
3. RLS impact review.
4. Backward compatibility.
5. Smoke test plan.
6. DB direct-edit changelog policy.

## Task Category Results
| Task Category | Result | Summary |
|---|---|---|
| Business App foundation shell | Fail-to-start | Needs concrete migration/RLS impact matrix and executable smoke checks |
| Company Card migration slice | Fail-to-start | Missing explicit API/event contract doc and backward compatibility matrix |
| Company Management migration slice | Fail-to-start | Missing explicit API/event contract doc and RLS impact sheet |
| Inventory/procurement interface scaffolding | Conditional pass | Contracts exist but migration and RLS controls must be attached before merge |
| POS Tap-to-Pay contract scaffolding | Conditional pass | Event/idempotency direction is valid; still needs executable smoke plan |
| Cross-module event naming validation | Pass (planning) | Naming direction is acceptable in planning stage |

## Mandatory Corrections Before Merge
1. Add Namecard/Company Management contract docs with endpoint schema, error code, event payload, versioning, and deprecation strategy.
2. Add Migration Control section to Sprint-1 docs:
- naming format
- ordering rule
- rollback note template
3. Add RLS Impact Sheet per write-path task:
- impacted tables
- allow/deny role matrix
- regression checks
4. Add Backward Compatibility Matrix:
- old path behavior
- redirect behavior
- write-lock cutover point
- rollback trigger
5. Upgrade smoke checks into executable scripts/checklists with expected outcomes and failure compensation steps.
6. Add explicit direct DB edit decision rule and link mandatory logging in docs/DB_CHANGELOG.md.

## Gate Decision
- Status: Conditional approval to proceed with implementation planning tasks only.
- Code merge to shared branch is blocked until mandatory corrections are completed and re-reviewed.

## Re-Review Update (2026-03-11)
- Implemented corrections in this phase:
1. Added contract docs:
- docs/contracts/NAMECARD_CONTRACT.md
- docs/contracts/COMPANY_MANAGEMENT_CONTRACT.md
2. Added delivery control template:
- docs/STAGE1_DELIVERY_CONTROLS.md
3. Added backward-compatible route ownership migration:
- Business routes created under /business/*
- Legacy company routes redirected from dashboard paths
4. Added Sprint-1 scaffold APIs:
- inventory/procurement/pos contract endpoints

- Re-review status: Implementation may proceed under conditional guard with daily smoke records and final week integration sign-off.
