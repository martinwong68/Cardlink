# Inventory Contract (v2)

## Scope
- Product create/list/edit with full details (description, pricing, barcode, category, type).
- Stock in, out, and adjustment movements with warehouse support.
- Balance view per product (with warehouse filtering).
- Multi-warehouse / location management.
- Product categories (hierarchical).
- Stock-take / physical inventory with auto-adjustment.
- Inventory reports (stock balance, movement history, low stock, valuation) with CSV export.
- POS refund → auto-restock.
- Accounting integration for stock adjustments.

## Tables
- inv_products
- inv_stock_movements
- inv_stock_balances
- inv_warehouses
- inv_categories
- inv_stock_takes
- inv_stock_take_items

## Required Fields

### inv_products
- id uuid pk
- company_id uuid not null
- sku text not null
- name text not null
- unit text not null default 'pcs'
- is_active boolean not null default true
- description text null
- cost_price numeric(14,2) default 0
- sell_price numeric(14,2) default 0
- max_stock_level integer null
- image_url text null
- category_id uuid null fk → inv_categories.id
- preferred_supplier_id uuid null fk → proc_suppliers.id
- barcode text null
- product_type text not null default 'physical' check in ('physical','service','digital','consumable')
- reorder_level integer not null default 5
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### inv_stock_movements
- id uuid pk
- company_id uuid not null
- product_id uuid not null
- warehouse_id uuid null fk → inv_warehouses.id
- movement_type text not null check in ('in','out','adjust')
- qty numeric(14,2) not null
- reason text null
- reference_type text null (manual, procurement_receipt, pos_order, pos_refund, stock_take)
- reference_id text null
- operation_id uuid null
- correlation_id uuid null
- idempotency_key text null unique per company
- created_by uuid null
- occurred_at timestamptz null
- created_at timestamptz not null default now()

### inv_stock_balances
- product_id uuid pk
- company_id uuid pk
- warehouse_id uuid null fk → inv_warehouses.id
- on_hand numeric(14,2) not null default 0
- updated_at timestamptz not null default now()

### inv_warehouses
- id uuid pk
- company_id uuid not null
- name text not null
- code text not null unique per company
- address text null
- is_active boolean not null default true
- is_default boolean not null default false
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### inv_categories
- id uuid pk
- company_id uuid not null
- name text not null unique per company
- parent_id uuid null fk → inv_categories.id
- sort_order integer not null default 0
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### inv_stock_takes
- id uuid pk
- company_id uuid not null
- warehouse_id uuid null fk → inv_warehouses.id
- reference_number text not null unique per company
- status text not null default 'draft' check in ('draft','in_progress','completed','cancelled')
- notes text null
- started_at timestamptz null
- completed_at timestamptz null
- created_by uuid null
- completed_by uuid null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### inv_stock_take_items
- id uuid pk
- stock_take_id uuid not null fk → inv_stock_takes.id
- product_id uuid not null fk → inv_products.id
- system_qty numeric(14,2) not null default 0
- counted_qty numeric(14,2) null
- variance numeric(14,2) generated always as (counted_qty - system_qty)
- notes text null
- created_at timestamptz not null default now()

## Status/Rules
- qty must be > 0 for movement_type in ('in','out').
- stock out cannot reduce on_hand below 0.
- Stock-take completion auto-creates adjustment movements for variances.
- POS refund auto-creates stock-in movement (reference_type='pos_refund').

## APIs
- GET/POST /api/inventory/products
- GET/PATCH /api/inventory/products/[id]
- GET/POST /api/inventory/movements
- GET /api/inventory/balances
- GET/POST /api/inventory/warehouses
- GET/POST /api/inventory/categories
- GET/POST /api/inventory/stock-takes
- POST /api/inventory/stock-takes/[id]/complete
- GET /api/inventory/reports/stock-balance
- GET /api/inventory/reports/movement-history
- GET /api/inventory/reports/low-stock
- GET /api/inventory/reports/valuation

## RPC Functions
- record_inventory_movement() — atomic stock movement + balance update
- process_procurement_receipt() — goods receipt with auto-inventory
- complete_stock_take() — complete stock-take with adjustment movements
- get_low_stock_products() — products below reorder level
- get_inventory_valuation() — inventory value by product

## Events
- inventory.product.created
- inventory.product.updated
- inventory.stock.moved
- inventory.stock_take.completed

## Cross-Module Integration
- Procurement receipt → inventory stock-in + accounting journal
- POS order → inventory stock-out
- POS refund → inventory stock-in (auto-restock)
- Stock adjustment → accounting journal (Inventory vs Adjustment expense)

## Ownership
- Inventory agent owns this contract.
- Changes require architecture guard approval.
