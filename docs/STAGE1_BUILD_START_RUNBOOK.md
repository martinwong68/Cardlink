# Stage-1 Build Start Runbook

## 1. Objective
- Start implementation in a controlled, contract-first, multi-agent workflow.
- Keep all build work inside Business App scope.
- Keep Client App minimized and migration-safe.

## 2. Start Gate
- Required founder command to start build:
- APPROVED TO BUILD

## 3. Sprint-1 Scope Lock

### 3.1 Scope in
- Business App foundation shell (routing, layout, ownership guardrails).
- Migration slice: Company Card management to Business App.
- Migration slice: Company Management to Business App.
- POS iPhone/iPad Tap-to-Pay payment contract scaffolding only.
- Contract-safe inventory/procurement interface scaffolding only.

### 3.2 Scope out
- No full Inventory or Procurement runtime feature rollout.
- No provider SDK integration for payment processing.
- No unapproved schema expansion beyond contract-safe scaffolding.
- No business management write ownership retained in Client App.

## 4. Sprint-1 Task Board

| Task ID | Owner agent | Inputs | Deliverables | Done criteria | Risk note | Dependencies |
|---|---|---|---|---|---|---|
| S1-T01 | Product-Orchestrator | docs/STAGE0_APPROVAL_SHEET.md; docs/STAGE0_FINAL_APP_FUNCTION_SCOPE.md; docs/STAGE0_FINAL_PRODUCT_MASTER_ROADMAP.md | Sprint-1 frozen scope memo; task ownership map; integration calendar | Scope freeze published and no task exceeds Sprint-1 scope-in list | Hidden scope creep from cross-module asks | None |
| S1-T02 | Architecture-Guard | docs/STAGE0_BUSINESS_APP_SEPARATION_PLAN.md; docs/STAGE0_COMPANY_FEATURE_MIGRATION_PLAN.md; docs/STAGE0_IOS_IPADOS_POS_TAP_TO_PAY_ARCHITECTURE_PLAN.md | Gate report with pass/fail and mandatory constraints per task | All Sprint-1 tasks have architecture pass or explicit blocking reason | Late rejection if contract mismatch is found during delivery | S1-T01 |
| S1-T03 | Module-Delivery-Platform | docs/STAGE0_BUSINESS_APP_SEPARATION_PLAN.md; docs/STAGE0_FINAL_APP_FUNCTION_SCOPE.md | Business App foundation shell slice (layout shell, route groups, ownership boundary notes) | Business App shell route is reachable; ownership boundary doc maps Client vs Business write routes | Boundary leak may allow business writes from Client App paths | S1-T02 |
| S1-T04 | Module-Delivery-Namecard | docs/STAGE0_COMPANY_FEATURE_MIGRATION_PLAN.md; docs/STAGE0_FINAL_APP_FUNCTION_SCOPE.md | Company Card migration slice-1 (entry-point move plan + redirect/write-lock checklist) | Company Card management entry points are reachable in Business App and Client App path is redirect/write-locked per plan | Split-brain writes during transition window | S1-T03 |
| S1-T05 | Module-Delivery-Company | docs/STAGE0_COMPANY_FEATURE_MIGRATION_PLAN.md; docs/STAGE0_FINAL_APP_FUNCTION_SCOPE.md | Company Management migration slice-1 (target path ownership + transition controls) | Company Management workflow is reachable in Business App; old path transition rule enforced | RBAC regression after route ownership change | S1-T03 |
| S1-T06 | Module-Delivery-Commerce | docs/STAGE0_IOS_IPADOS_POS_TAP_TO_PAY_ARCHITECTURE_PLAN.md; docs/STAGE0_FINAL_APP_FUNCTION_SCOPE.md | POS payment contract scaffold pack for iPhone/iPad (API/webhook/event/state draft) | Contract draft includes idempotency key, provider_event_id dedup field, and reconciliation_pending state | Payment replay or out-of-order webhook can create duplicate financial effects | S1-T02 |
| S1-T07 | Module-Delivery-Inventory | docs/contracts/INVENTORY_CONTRACT.md; docs/contracts/PROCUREMENT_CONTRACT.md | Inventory/procurement interface scaffolding only (contract-aligned API/interface stubs and ownership notes) | Interface names/fields align with both contracts; no full business workflow expansion merged | Interface drift from contract fields causes later migration rework | S1-T02 |
| S1-T08 | QA-Integration | S1-T03..S1-T07 outputs; docs/DB_CHANGELOG.md | Day-1 smoke record; Week-1 smoke record; risk log and exception list | All acceptance checkpoints pass or blocked items are documented with owner and ETA | Integration conflicts found too late in week | S1-T04, S1-T05, S1-T06, S1-T07 |

## 5. Day-1 Acceptance Checkpoint

| Checkpoint ID | Acceptance condition | Evidence required | Owner |
|---|---|---|---|
| D1-CP1 | Build start gate command "APPROVED TO BUILD" is logged and Sprint-1 scope is frozen | Chat record link and scope freeze note in runbook | Product-Orchestrator |
| D1-CP2 | All Sprint-1 tasks have owner, dependencies, and done criteria | Published task board with no TBD fields | Product-Orchestrator |
| D1-CP3 | Architecture-Guard baseline review completed for S1-T03~S1-T07 | Gate report with pass/fail per task | Architecture-Guard |
| D1-CP4 | Branch strategy and daily integration window are scheduled | Branch list and integration window entry | Module owners + QA-Integration |

## 6. Week-1 Acceptance Checkpoint

| Checkpoint ID | Acceptance condition | Evidence required | Owner |
|---|---|---|---|
| W1-CP1 | Business App foundation shell is operational and ownership boundaries are documented | Reachability smoke result and boundary mapping note | Module-Delivery-Platform |
| W1-CP2 | Company Card + Company Management migration slices are reachable in Business App with Client App transition controls | Route/path smoke results and redirect/write-lock checklist | Module-Delivery-Namecard + Module-Delivery-Company |
| W1-CP3 | POS iPhone/iPad payment contract scaffold is complete and architecture-approved | Contract pack diff + Architecture-Guard sign-off | Module-Delivery-Commerce + Architecture-Guard |
| W1-CP4 | Inventory/procurement interface scaffolding remains contract-safe and thin-slice only | Contract alignment checklist against INVENTORY/PROCUREMENT contract docs | Module-Delivery-Inventory + Architecture-Guard |
| W1-CP5 | No critical contract violation remains open; blocked items have mitigation owners and ETA | Week-1 integration report with risk register | QA-Integration |

## 7. Agent Prompts (Copy/Paste)

### 7.1 Product-Orchestrator Prompt
Role: Product-Orchestrator

Task:
- Execute Sprint-1 build kickoff under approved Stage-0 constraints.
- Produce a task board with IDs, owners, deliverables, done criteria, and risk notes.
- Scope is Business App only. Client App is minimized.

Inputs:
- docs/STAGE0_APPROVAL_SHEET.md
- docs/STAGE0_FINAL_PRODUCT_MASTER_ROADMAP.md
- docs/STAGE0_FINAL_APP_FUNCTION_SCOPE.md
- docs/STAGE1_DELIVERY_CONTROLS.md

Output required:
- Sprint-1 task board
- Daily integration checklist
- End-of-week acceptance checklist

Constraints:
- Contract-first. No scope expansion.
- Flag any dependency conflict immediately.

### 7.2 Architecture-Guard Prompt
Role: Architecture-Guard

Task:
- Review Sprint-1 planned changes for schema/API/event governance.
- Validate migration order strategy, RLS impact, backward compatibility, rollback notes.
- Approve or reject each task with reason.

Inputs:
- docs/STAGE0_APPROVAL_SHEET.md
- docs/STAGE0_BUSINESS_APP_SEPARATION_PLAN.md
- docs/STAGE0_COMPANY_FEATURE_MIGRATION_PLAN.md
- docs/STAGE0_IOS_IPADOS_POS_TAP_TO_PAY_ARCHITECTURE_PLAN.md
- docs/STAGE1_DELIVERY_CONTROLS.md

Output required:
- Gate report with pass/fail per task
- Required fixes before merge
- Smoke test requirements

Constraints:
- Reject any task bypassing contracts.
- Enforce DB changelog policy when direct DB edits are used.

### 7.3 Module-Delivery-Namecard Prompt
Role: Module-Delivery-Namecard

Task:
- Implement Sprint-1 migration slice for company card management from Client App to Business App.
- Preserve existing public card behavior in Client App.

Inputs:
- docs/STAGE0_COMPANY_FEATURE_MIGRATION_PLAN.md
- docs/STAGE0_FINAL_APP_FUNCTION_SCOPE.md
- docs/contracts/NAMECARD_CONTRACT.md
- docs/contracts/COMPANY_MANAGEMENT_CONTRACT.md

Output required:
- Changed files list
- Safety notes
- Test steps and rollback notes

Constraints:
- Do not change schema unless explicitly assigned.
- No direct edits to non-owned module internals without approval.

### 7.4 Module-Delivery-Inventory Prompt
Role: Module-Delivery-Inventory

Task:
- Build contract scaffolding and module interfaces needed for Business App operational foundation.
- No full inventory feature expansion in Sprint-1.

Inputs:
- docs/contracts/INVENTORY_CONTRACT.md
- docs/contracts/PROCUREMENT_CONTRACT.md
- docs/STAGE0_FINAL_PRODUCT_MASTER_ROADMAP.md

Output required:
- Interface changes
- Contract alignment notes
- Smoke test steps

Constraints:
- Keep changes thin-slice only.
- Maintain compatibility with Commerce and Accounting contracts.

### 7.5 Module-Delivery-Commerce Prompt
Role: Module-Delivery-Commerce

Task:
- Build POS payment contract scaffolding for iPhone/iPad flow.
- Add idempotency and reconciliation-safe flow boundaries.

Inputs:
- docs/STAGE0_IOS_IPADOS_POS_TAP_TO_PAY_ARCHITECTURE_PLAN.md
- docs/STAGE0_FINAL_APP_FUNCTION_SCOPE.md

Output required:
- API/event contract implementation notes
- Files changed
- Failure and compensation test steps

Constraints:
- No provider-specific hard lock beyond agreed adapter boundary.
- Ensure webhook replay safety and dedup behavior.

## 8. Build Governance Checklist
1. One owner per active file area.
2. One migration author at a time.
3. All write APIs are idempotent.
4. All payment/order events carry correlation and idempotency IDs.
5. Daily integration window is executed.
6. Any direct DB API edit is logged in docs/DB_CHANGELOG.md.
7. RLS impact and backward compatibility matrix are completed using docs/STAGE1_DELIVERY_CONTROLS.md.

## 9. End-of-Week Acceptance (Summary)
1. Business App foundation is operational.
2. Company card and company management migration slices are working in Business App.
3. Client App is minimized and no longer owns business management writes.
4. POS Tap-to-Pay contract path is scaffolded and architecture-approved.
5. Inventory/procurement interface scaffolding is contract-safe and limited to thin-slice scope.
6. No contract violations reported by Architecture-Guard.
