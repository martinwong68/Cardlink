# Stage-3 Kickoff Pack (Execution)

## Objective
- Execute Business module function build with `profiles.business_active_company_id` as the mandatory tenancy scope for queries and writes.
- Enforce guard-first API behavior so cross-company writes are denied by default.
- Deliver master-account cross-company management UX with fast switch and permission scope visibility.

## Scope in
- Active-company tenancy enforcement across:
  - Company Cards
  - Company Management context
  - Inventory
  - Procurement
  - POS
- Business write API hardening:
  - Reject mismatched `company_id`/`companyId` when provided.
  - Use active company context as server-side source of truth.
- Master-account UI:
  - Fast company switch actions.
  - Company-level permission scope list.
- Evidence package:
  - Agent task board.
  - Gate checks.
  - Smoke tests.
  - Acceptance evidence.

## Scope out
- No destructive schema changes.
- No breaking endpoint removals.
- No provider-direct signed webhook redesign in this slice.

## Module boundaries
- Company Cards:
  - Scope enforced in `/api/company-cards/create-account` using active company guard.
- Company Management:
  - Main-account context and switching in `/api/business/main-account` + settings UI.
  - Company management writes are centralized to guarded Business APIs.
- Inventory:
  - `/api/inventory/products`, `/api/inventory/movements`, `/api/inventory/balances` scoped by active company context.
- Procurement:
  - `/api/procurement/suppliers`, `/api/procurement/purchase-orders`, `/api/procurement/receipts` scoped by active company context.
- POS:
  - `/api/pos/checkout-intents` and `/api/pos/webhooks/payment` guarded by active company context.

## API/event contract impact
- Compatibility policy:
  - Existing request fields `company_id`/`companyId` remain accepted for backward compatibility.
  - Server now ignores trusted scope from payload and derives scope from active company context.
  - Mismatched payload scope returns `403` fail-close.
- Contract-safe event continuity:
  - Inventory: `inventory.stock.moved` unchanged.
  - Procurement: `procurement.po.created`, `procurement.po.received` unchanged.
  - POS: `commerce.payment.authorized` unchanged.
- No schema contract break introduced.

## Agent task board
- Source: `docs/STAGE3_AGENT_TASK_BOARD.md`
- Coverage:
  - Tenancy guard implementation.
  - Module API updates.
  - Master-account UI delivery.
  - Gate and smoke evidence closure.

## Risks and mitigations
- Risk: POS webhook currently assumes Business-scoped internal calls, not provider-signed ingress.
  - Mitigation: define signed webhook contract + dedicated endpoint in next contract revision.
- Risk: Regression from mixed old/new payload scope handling.
  - Mitigation: deny-on-mismatch + smoke tests for compatibility and fail-close behavior.

## Acceptance checklist
- Active-company guard is enforced on all current Business write APIs in scope.
- Cross-company write attempts with mismatched payload scope are blocked (`403`).
- Inventory/Procurement reads are active-company scoped without relying on external `company_id` query.
- Master user can fast-switch company context from Business settings.
- Company-level permission scope is visible in main-account settings.
- Stage-3 governance artifacts are published:
  - `docs/STAGE3_AGENT_TASK_BOARD.md`
  - `docs/STAGE3_ARCH_GUARD_GATE_CHECKS.md`
  - `docs/STAGE3_SMOKE_TEST_RECORD.md`
  - `docs/STAGE3_ACCEPTANCE_EVIDENCE.md`

## Founder actions
1. Approve POS signed-webhook contract slice for production payment-provider integration.
2. Run staging smoke suite with real tenant accounts and attach run IDs to Stage-3 evidence docs.
3. Approve merge window after Architecture-Guard Stage-3 checks pass.
