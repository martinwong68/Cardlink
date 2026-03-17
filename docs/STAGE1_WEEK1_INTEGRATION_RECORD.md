# Stage-1 Week-1 Integration Record

## Objective
- Consolidate Week-1 integration outputs for Sprint-1 scope.

## Scope in
- Business foundation routes.
- Company ownership route migration.
- Inventory/procurement/pos API scaffolds.
- Contract and gate compliance artifacts.

## Scope out
- Full runtime business logic for inventory/procurement/pos.
- Production payment SDK integration.

## Deliverables
- Business module routes created:
- /business/company-cards
- /business/company-management
- /business/inventory
- /business/procurement
- /business/pos
- Redirect compatibility in place:
- /dashboard/company-management -> /business/company-management
- /dashboard/cards?tab=company -> /business/company-cards
- API scaffold endpoints created:
- /api/inventory/products
- /api/inventory/balances
- /api/inventory/movements
- /api/procurement/suppliers
- /api/procurement/purchase-orders
- /api/procurement/receipts
- /api/pos/contracts
- /api/pos/checkout-intents
- /api/pos/webhooks/payment
- Contract and control artifacts added:
- docs/contracts/NAMECARD_CONTRACT.md
- docs/contracts/COMPANY_MANAGEMENT_CONTRACT.md
- docs/STAGE1_DELIVERY_CONTROLS.md
- docs/STAGE1_DAY1_SMOKE_RECORD.md

## Risks and mitigations
- Risk: Scaffold endpoints are not yet backed by persistent DB writes.
- Mitigation: Keep clear scaffold status in responses and schedule Sprint-2 vertical slices.
- Risk: Existing repository lint baseline contains unrelated errors.
- Mitigation: Continue delivery with scoped checks for touched files and handle baseline lint cleanup in dedicated stream.

## Acceptance checklist
- Sprint-1 scope artifacts and route ownership changes are implemented.
- Required scaffold API contracts exist and are callable.
- Compatibility redirects exist for legacy company management entry paths.
