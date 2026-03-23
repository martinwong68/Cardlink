# Procurement Contract (Phase 1)

## Scope
- Supplier CRUD (create, list, edit) with professional fields.
- Purchase request workflow (create, approve/reject, convert to PO).
- Purchase order CRUD with line items and status management.
- Goods receipt processing with inventory + accounting integration.
- Vendor contract management (create, status lifecycle).
- Vendor bills / AP invoices (create, approve, pay with journal entry).

## Tables

### proc_suppliers
- id uuid pk
- company_id uuid not null FK → companies
- name text not null
- contact_name text null
- contact_phone text null
- email text null
- address text null
- city text null
- country text null
- payment_terms text default 'net_30' check in ('immediate','net_7','net_15','net_30','net_45','net_60','net_90')
- currency text default 'USD'
- category text null
- tax_id text null
- website text null
- notes text null
- is_active boolean default true
- rating smallint default 0 check (0-5)
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### proc_purchase_requests
- id uuid pk
- company_id uuid not null FK → companies
- pr_number text not null
- title text not null
- description text null
- status text default 'draft' check in ('draft','pending','approved','rejected','cancelled')
- priority text default 'normal' check in ('low','normal','high','urgent')
- requested_by uuid FK → auth.users
- approved_by uuid FK → auth.users
- approved_at timestamptz null
- total_estimated numeric default 0
- notes text null
- created_at, updated_at timestamptz

### proc_purchase_request_items (NEW)
- id uuid pk
- request_id uuid FK → proc_purchase_requests
- company_id uuid FK → companies
- product_id uuid FK → inv_products (nullable)
- description text null
- qty numeric default 1
- estimated_unit_cost numeric default 0
- created_at timestamptz

### proc_purchase_orders
- id uuid pk
- company_id uuid not null FK → companies
- supplier_id uuid not null FK → proc_suppliers
- po_number text not null UNIQUE(company_id, po_number)
- status text check in ('draft','submitted','ordered','partial','received','cancelled')
- request_id uuid FK → proc_purchase_requests (NEW — links PO to originating PR)
- ordered_at timestamptz null
- expected_at timestamptz null
- terms text null (NEW)
- notes text null (NEW)
- discount_percent numeric default 0 (NEW)
- tax_percent numeric default 0 (NEW)
- shipping_cost numeric default 0 (NEW)
- payment_terms text null (NEW)
- idempotency_key text null
- operation_id uuid null
- correlation_id uuid null
- created_by uuid null
- created_at, updated_at timestamptz

### proc_purchase_order_items
- id uuid pk
- company_id uuid not null
- po_id uuid FK → proc_purchase_orders
- product_id uuid FK → inv_products
- qty numeric not null
- unit_cost numeric default 0

### proc_receipts
- id uuid pk
- company_id uuid not null FK → companies
- po_id uuid FK → proc_purchase_orders
- idempotency_key text null
- operation_id uuid null
- correlation_id uuid null
- received_at timestamptz
- received_by uuid FK → auth.users
- note text null
- created_at timestamptz

### proc_receipt_items
- id uuid pk
- receipt_id uuid FK → proc_receipts
- po_item_id uuid FK → proc_purchase_order_items
- product_id uuid FK → inv_products
- qty numeric
- created_at timestamptz

### proc_contracts
- id uuid pk
- company_id uuid FK → companies
- supplier_id uuid FK → proc_suppliers
- title text not null
- contract_number text null
- status text default 'draft' check in ('draft','active','expired','terminated')
- start_date date null
- end_date date null
- value numeric default 0
- terms text null
- notes text null
- created_by uuid null
- created_at, updated_at timestamptz

### proc_vendor_bills (NEW)
- id uuid pk
- company_id uuid FK → companies
- supplier_id uuid FK → proc_suppliers
- po_id uuid FK → proc_purchase_orders (nullable)
- receipt_id uuid FK → proc_receipts (nullable)
- bill_number text not null UNIQUE(company_id, bill_number)
- status text default 'draft' check in ('draft','pending','approved','paid','cancelled')
- bill_date date default CURRENT_DATE
- due_date date null
- subtotal numeric default 0
- tax_amount numeric default 0
- total_amount numeric default 0
- payment_terms text null
- notes text null
- created_by uuid null
- created_at, updated_at timestamptz

### proc_vendor_bill_items (NEW)
- id uuid pk
- bill_id uuid FK → proc_vendor_bills
- company_id uuid FK → companies
- product_id uuid FK → inv_products (nullable)
- description text null
- qty numeric default 1
- unit_cost numeric default 0
- amount numeric default 0
- created_at timestamptz

## Status/Rules
- PO status flow: draft → submitted → ordered → partial → received | cancelled
- PR status flow: draft → pending → approved → rejected | cancelled
- Contract status flow: draft → active → expired | terminated
- Vendor bill status flow: draft → pending → approved → paid | cancelled
- On receipt, generate inventory stock-in movements + accounting journal entry.
- On bill paid, generate AP payment journal entry (Debit AP 2100, Credit Cash 1100).
- Approved PR can be converted to PO (POST /requests/[id]/convert-to-po).

## APIs
- POST /api/procurement/suppliers — Create supplier
- GET /api/procurement/suppliers — List suppliers
- PATCH /api/procurement/suppliers/[id] — Update supplier
- POST /api/procurement/requests — Create purchase request
- GET /api/procurement/requests — List requests
- PATCH /api/procurement/requests/[id] — Update request status
- POST /api/procurement/requests/[id]/convert-to-po — Convert PR → PO
- POST /api/procurement/purchase-orders — Create PO with items
- GET /api/procurement/purchase-orders — List POs with items
- PATCH /api/procurement/purchase-orders/[id] — Update PO status/fields
- POST /api/procurement/receipts — Process goods receipt
- GET /api/procurement/receipts — List receipts with items
- POST /api/procurement/contracts — Create contract
- GET /api/procurement/contracts — List contracts
- PATCH /api/procurement/contracts/[id] — Update contract
- POST /api/procurement/vendor-bills — Create vendor bill
- GET /api/procurement/vendor-bills — List bills with items
- PATCH /api/procurement/vendor-bills/[id] — Update bill status

## Events
- procurement.po.created
- procurement.po.submitted
- procurement.po.received
- procurement.request.created
- procurement.request.approved
- procurement.request.rejected
- procurement.request.converted
- procurement.contract.created
- procurement.contract.active
- procurement.contract.terminated
- procurement.bill.created
- procurement.bill.paid

## Cross-Module Integration
- Receipts → Inventory: automatic stock-in movements
- Receipts → Accounting: journal entry (Debit Inventory 1400, Credit AP 2100)
- Bill Paid → Accounting: journal entry (Debit AP 2100, Credit Cash 1100)

## Ownership
- Procurement agent owns this contract.
- Changes require architecture guard approval.
