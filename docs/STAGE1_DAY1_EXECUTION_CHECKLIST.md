# Stage-1 Day-1 Execution Checklist

## 1. Startup Sequence
1. Confirm build-start command is issued: APPROVED TO BUILD.
2. Freeze Sprint-1 scope from docs/STAGE1_SPRINT1_TASK_BOARD.md.
3. Open working branches:
- feat/business-foundation-shell
- feat/company-card-migration-slice1
- feat/company-management-migration-slice1
- feat/pos-tap-pay-contract-scaffold
- feat/inventory-procurement-interface-scaffold
4. Run Architecture-Guard gate review against docs/STAGE1_ARCHITECTURE_GUARD_GATE_REPORT.md mandatory corrections.
5. Start delivery work only after corrections are represented in task docs.

## 2. Prompts to Use (Copy/Paste)

### Product-Orchestrator
Execute Sprint-1 now. Use docs/STAGE1_SPRINT1_TASK_BOARD.md as source of truth. Publish daily integration plan, owner assignments, dependency order, and end-of-day acceptance checks. Do not expand scope.

### Architecture-Guard
Review all Sprint-1 active tasks against docs/STAGE1_ARCHITECTURE_GUARD_GATE_REPORT.md. Block any task missing contract, migration order, RLS impact, backward compatibility, smoke plan, or DB changelog policy.

### Module-Delivery-Namecard
Implement S1-T04 and S1-T05 from docs/STAGE1_SPRINT1_TASK_BOARD.md. Migrate company card and company management ownership to Business App with redirect/write-lock controls and rollback notes.

### Module-Delivery-Commerce
Implement S1-T06 from docs/STAGE1_SPRINT1_TASK_BOARD.md. Build POS iPhone/iPad payment contract scaffolding with idempotency, provider_event_id deduplication, and reconciliation_pending handling.

### Module-Delivery-Inventory
Implement S1-T07 from docs/STAGE1_SPRINT1_TASK_BOARD.md. Build minimal inventory/procurement interface scaffolding aligned with existing contracts only.

## 3. End-of-Day-1 Definition of Done
1. Architecture mandatory corrections are documented in active task specs.
2. All Sprint-1 tasks have owner, branch, and acceptance evidence format.
3. Integration window schedule is published.
4. Smoke checklist template is ready for Day-2 execution.
