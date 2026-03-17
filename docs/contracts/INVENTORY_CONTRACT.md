# Inventory Contract (MVP)

## Scope
- Product create/list/edit.
- Stock in and stock out.
- Balance view per product.

## Tables
- inv_products
- inv_stock_movements
- inv_stock_balances

## Required Fields

### inv_products
- id uuid pk
- company_id uuid not null
- sku text not null
- name text not null
- unit text not null default 'pcs'
- is_active boolean not null default true
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### inv_stock_movements
- id uuid pk
- company_id uuid not null
- product_id uuid not null
- movement_type text not null check in ('in','out','adjust')
- qty numeric(14,2) not null
- reason text null
- reference_type text null
- reference_id uuid null
- created_by uuid null
- created_at timestamptz not null default now()

### inv_stock_balances
- product_id uuid pk
- company_id uuid not null
- on_hand numeric(14,2) not null default 0
- updated_at timestamptz not null default now()

## Status/Rules
- qty must be > 0 for movement_type in ('in','out').
- stock out cannot reduce on_hand below 0 in MVP.

## APIs (MVP)
- POST /api/inventory/products
- GET /api/inventory/products
- POST /api/inventory/movements
- GET /api/inventory/balances

## Events
- inventory.product.created
- inventory.stock.moved

## Ownership
- Inventory agent owns this contract.
- Changes require architecture guard approval.
