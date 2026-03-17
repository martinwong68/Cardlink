# Stage-1 Sprint-1 Task Board

## Objective
- Execute Sprint-1 build kickoff with contract-first governance and Business App-first ownership.

## Task Board
| Task ID | Owner Agent | Inputs | Deliverables | Done Criteria | Risk Note | Dependencies |
|---|---|---|---|---|---|---|
| S1-T01 | Product-Orchestrator | docs/STAGE0_APPROVAL_SHEET.md; docs/STAGE0_FINAL_APP_FUNCTION_SCOPE.md; docs/STAGE0_FINAL_PRODUCT_MASTER_ROADMAP.md | Sprint-1 scope freeze memo; ownership map; integration calendar | Scope freeze published and no task exceeds Sprint-1 scope | Scope creep from cross-module asks | None |
| S1-T02 | Architecture-Guard | docs/STAGE0_BUSINESS_APP_SEPARATION_PLAN.md; docs/STAGE0_COMPANY_FEATURE_MIGRATION_PLAN.md; docs/STAGE0_IOS_IPADOS_POS_TAP_TO_PAY_ARCHITECTURE_PLAN.md | Gate report with pass/fail and mandatory fixes | Each Sprint-1 task has pass/fail decision | Late rejection during delivery | S1-T01 |
| S1-T03 | Module-Delivery-Platform | docs/STAGE0_BUSINESS_APP_SEPARATION_PLAN.md; docs/STAGE0_FINAL_APP_FUNCTION_SCOPE.md | Business App foundation shell slice and ownership boundary notes | Business route reachable and ownership map documented | Boundary leak allows business writes from Client paths | S1-T02 |
| S1-T04 | Module-Delivery-Namecard | docs/STAGE0_COMPANY_FEATURE_MIGRATION_PLAN.md; docs/STAGE0_FINAL_APP_FUNCTION_SCOPE.md | Company Card migration slice-1 with redirect and write-lock checklist | Company Card management reachable in Business App with Client transition controls | Split-brain writes in transition window | S1-T03 |
| S1-T05 | Module-Delivery-Namecard | docs/STAGE0_COMPANY_FEATURE_MIGRATION_PLAN.md; docs/STAGE0_FINAL_APP_FUNCTION_SCOPE.md | Company Management migration slice-1 with ownership controls | Company Management reachable in Business App and old path controlled | RBAC regression after ownership shift | S1-T03 |
| S1-T06 | Module-Delivery-Commerce | docs/STAGE0_IOS_IPADOS_POS_TAP_TO_PAY_ARCHITECTURE_PLAN.md; docs/STAGE0_FINAL_APP_FUNCTION_SCOPE.md | POS iPhone/iPad payment contract scaffold pack | Includes idempotency key, provider_event_id dedup, reconciliation_pending state | Replay and out-of-order webhooks | S1-T02 |
| S1-T07 | Module-Delivery-Inventory | docs/contracts/INVENTORY_CONTRACT.md; docs/contracts/PROCUREMENT_CONTRACT.md | Inventory/procurement interface scaffolding and ownership notes | Field-level alignment with contracts and thin-slice scope maintained | Interface drift from contracts | S1-T02 |
| S1-T08 | QA-Integration | S1-T03..S1-T07 outputs; docs/DB_CHANGELOG.md | Day-1 and Week-1 smoke records; risk and exception log | Acceptance checkpoints pass or blockers assigned with ETA | Integration conflicts discovered late | S1-T04, S1-T05, S1-T06, S1-T07 |

## Day-1 Acceptance Checkpoints
| Checkpoint ID | Acceptance Condition | Evidence Required | Owner |
|---|---|---|---|
| D1-CP1 | Build-start command approved and Sprint-1 scope frozen | Approval note and scope freeze record | Product-Orchestrator |
| D1-CP2 | Task board has no TBD fields | Published board | Product-Orchestrator |
| D1-CP3 | Architecture baseline review completed | Gate report | Architecture-Guard |
| D1-CP4 | Branch strategy and integration window scheduled | Branch and schedule list | All module owners |

## Week-1 Acceptance Checkpoints
| Checkpoint ID | Acceptance Condition | Evidence Required | Owner |
|---|---|---|---|
| W1-CP1 | Business App foundation shell operational | Route smoke result and boundary map | Module-Delivery-Platform |
| W1-CP2 | Company Card and Company Management migration slices active in Business App | Route smoke results and transition checklist | Module-Delivery-Namecard |
| W1-CP3 | POS iPhone/iPad payment contract scaffold completed and approved | Contract pack and gate sign-off | Module-Delivery-Commerce + Architecture-Guard |
| W1-CP4 | Inventory/procurement interface remains contract-safe | Contract alignment checklist | Module-Delivery-Inventory + Architecture-Guard |
| W1-CP5 | No unresolved critical contract violations | Week-1 integration report | QA-Integration |
