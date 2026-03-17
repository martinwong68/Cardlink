# Dev Stream Starter (Day 1)

## Goal for Today
- Lock MVP boundaries for Week 1.
- Build first module foundation (Inventory) end-to-end pattern.
- Create reusable pattern for remaining modules.

## Stream Mode
- One active lane only.
- 90-minute sprint blocks.
- End each block with commit + note.

## Step-by-Step (Do this now)

### Step 1: Confirm environment (10 min)
Run:

```bash
cd /workspaces/Cardlink/cardlink
npm run dev
```

Check:
- Web opens at http://localhost:3000.
- Login works.
- Dashboard loads.

Done definition:
- You can enter dashboard without runtime error.

### Step 2: Create branch for Week 1 (5 min)
Run:

```bash
cd /workspaces/Cardlink
git checkout -b feat/week1-inventory-foundation
```

Done definition:
- Branch name contains week and domain.

### Step 3: Freeze Week 1 scope (15 min)
Use this exact scope only:
- Inventory: product create/list/edit.
- Inventory: stock in / stock out.
- Procurement: supplier + purchase order + receive stock.
- No advanced reports.
- No mobile packaging this week.

Done definition:
- No extra features added outside above list.

### Step 4: Contract-first (20 min)
Create/confirm contract files:
- docs/contracts/INVENTORY_CONTRACT.md
- docs/contracts/PROCUREMENT_CONTRACT.md

Required in each contract:
- table list
- required fields
- allowed status transitions
- API endpoints
- event emitted

Done definition:
- Contracts merged before coding service logic.

### Step 5: Migration-first implementation (40 min)
Create first migration file:
- migrations/20260311_inventory_procurement_mvp_foundation.sql

Include only MVP tables:
- inv_products
- inv_stock_movements
- inv_stock_balances
- proc_suppliers
- proc_purchase_orders
- proc_purchase_order_items
- proc_receipts

Done definition:
- migration applies cleanly in Supabase SQL editor.

### Step 6: Implement one vertical slice (90 min)
Inventory vertical slice:
- create product
- list products
- post stock movement
- update stock balance

Done definition:
- One product can be created and stock can change from dashboard UI.

### Step 7: Smoke test + commit (20 min)
Run:

```bash
cd /workspaces/Cardlink/cardlink
npm run lint
```

Commit:

```bash
cd /workspaces/Cardlink
git add .
git commit -m "feat(inventory): foundation tables and first vertical slice"
```

Done definition:
- Lint passes for touched code and commit created.

## Role Split (You + AI)
- You:
  - Product acceptance decisions.
  - Supabase migration execution confirmation.
  - Manual UI validation.
- AI (me):
  - DB migration drafting.
  - API and UI implementation.
  - test and conflict checks.
  - daily progress notes.

## Cadence for Today
- Block A (now): contract + migration draft.
- Block B: inventory vertical slice.
- Block C: procurement base CRUD.
- Block D: QA + polish + commit.

## Stop Rules
Stop and fix immediately if:
- migration conflicts with existing table names.
- RLS blocks expected reads/writes.
- card or billing flow gets broken by new changes.

## End-of-Day Output
- 1 migration file.
- 1 inventory page flow working.
- 2 contract docs committed.
- 1 short changelog entry.
