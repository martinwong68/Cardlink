# Procurement Contract (MVP)

## Scope
- Supplier create/list.
- Purchase order create/list.
- Receive order to generate stock-in movement.

## Tables
- proc_suppliers
- proc_purchase_orders
- proc_purchase_order_items
- proc_receipts

## Required Fields

### proc_suppliers
- id uuid pk
- company_id uuid not null
- name text not null
- contact_name text null
- contact_phone text null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### proc_purchase_orders
- id uuid pk
- company_id uuid not null
- supplier_id uuid not null
- po_number text not null
- status text not null check in ('draft','submitted','received','cancelled')
- ordered_at timestamptz null
- expected_at timestamptz null
- created_by uuid null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### proc_purchase_order_items
- id uuid pk
- po_id uuid not null
- product_id uuid not null
- qty numeric(14,2) not null
- unit_cost numeric(14,2) not null default 0

### proc_receipts
- id uuid pk
- company_id uuid not null
- po_id uuid not null
- received_at timestamptz not null default now()
- received_by uuid null
- note text null

## Status/Rules
- PO status flow: draft -> submitted -> received.
- On receipt, generate inventory stock-in movements.

## APIs (MVP)
- POST /api/procurement/suppliers
- GET /api/procurement/suppliers
- POST /api/procurement/purchase-orders
- GET /api/procurement/purchase-orders
- POST /api/procurement/receipts

## Events
- procurement.po.created
- procurement.po.received

## Ownership
- Procurement agent owns this contract.
- Changes require architecture guard approval.
