# Stage-3 Acceptance Evidence

## Objective
- Provide acceptance evidence for active-company controlled execution across Business modules.

## Evidence Bundle
0. Schema and Migration Evidence
- Stage-2 tenancy source migration:
  - `migrations/20260311_master_and_main_account_preparation.sql`
- Stage-3 core additive migration:
  - `migrations/20260311_inventory_procurement_pos_core.sql`
- Migration includes:
  - Inventory/Procurement/POS tables
  - RLS policies and `can_manage_company` policy function
  - Idempotency/dedup unique indexes
  - Transaction-safe RPCs: `record_inventory_movement`, `process_procurement_receipt`

1. API Guard Coverage
- Inventory:
  - `app/api/inventory/products/route.ts`
  - `app/api/inventory/movements/route.ts`
  - `app/api/inventory/balances/route.ts`
- Procurement:
  - `app/api/procurement/suppliers/route.ts`
  - `app/api/procurement/purchase-orders/route.ts`
  - `app/api/procurement/receipts/route.ts`
- POS:
  - `app/api/pos/checkout-intents/route.ts`
  - `app/api/pos/webhooks/payment/route.ts`
- Company Cards:
  - `app/api/company-cards/create-account/route.ts`
  - `app/api/company-cards/cards/route.ts`
  - `app/api/company-cards/cards/[cardId]/route.ts`
  - `app/api/company-cards/profile-card/route.ts`
- Company Management:
  - `app/api/company-management/profile/route.ts`
  - `app/api/company-management/offers/route.ts`
  - `app/api/company-management/offers/[offerId]/route.ts`
  - `app/api/company-management/membership-tiers/[tierId]/route.ts`
  - `app/api/company-management/redemptions/[redemptionId]/decision/route.ts`

2. Client Write-Path Hardening
- Company Management panel writes now call guarded APIs (no direct client DB write):
  - `components/CompanyManagementPanel.tsx`
- Company Cards panel writes now call guarded APIs (no direct client DB write):
  - `components/CompanyCardsManagementPanel.tsx`

3. Master Account Cross-Company UI
- Fast switch and permission scope view implemented in:
  - `app/business/settings/main-account/page.tsx`
- New locale keys added for quick-switch labels in:
  - `messages/en.json`
  - `messages/zh-TW.json`
  - `messages/zh-HK.json`
  - `messages/zh-CN.json`

4. Contract Alignment
- Uses approved contract families in `docs/contracts/*`.
- Contract updates include guarded write routes in:
  - `docs/contracts/COMPANY_MANAGEMENT_CONTRACT.md`
  - `docs/contracts/NAMECARD_CONTRACT.md`
- No destructive schema change (additive only).
- Backward-compatible request fields preserved.

5. Build and Lint Evidence
- `npm run build` in `cardlink/`: Pass.
- Changed-files lint (`npx eslint` over touched API files): Pass.
- Full project lint: Fails due to pre-existing unrelated lint debt outside Stage-3 scope.

6. Governance Evidence
- Task board: `docs/STAGE3_AGENT_TASK_BOARD.md`
- Gate checks: `docs/STAGE3_ARCH_GUARD_GATE_CHECKS.md`
- Smoke tests: `docs/STAGE3_SMOKE_TEST_RECORD.md`

## Acceptance Verdict
- Stage-3 implementation is functionally delivered and compile-verified.
- Final acceptance is conditional on running authenticated seeded smoke tests for Inventory/Procurement/POS write flows.
