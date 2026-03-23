# POS Contract (v2 Rebuild)

## Scope
- Product catalogue management
- Sales terminal with dynamic tax & discounts
- Order processing with customer attachment
- Cash tendered / change calculation
- Full & partial refund with inventory + accounting reversal
- Shift & register management with cash reconciliation
- Daily sales reporting with CSV export
- Payment state machine (checkout intents + webhooks)
- Tax configuration per company
- Discount management

## Tables

### pos_registers
- id uuid pk
- company_id uuid not null fk → companies
- name text not null
- location text
- is_active boolean not null default true
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### pos_products
- id uuid pk
- company_id uuid not null fk → companies
- name text not null
- sku text
- barcode text
- category text
- price numeric not null
- cost numeric
- stock integer not null default 0
- image_url text
- is_active boolean not null default true
- inv_product_id uuid fk → inv_products (optional inventory link)
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### pos_tax_config
- id uuid pk
- company_id uuid not null fk → companies
- name text not null
- rate numeric(6,4) not null default 0
- region text
- is_default boolean not null default false
- is_active boolean not null default true
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### pos_discounts
- id uuid pk
- company_id uuid not null fk → companies
- name text not null
- discount_type text not null check in ('percentage','fixed')
- value numeric(12,2) not null default 0
- min_order numeric(12,2) default 0
- is_active boolean not null default true
- valid_from timestamptz
- valid_until timestamptz
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### pos_shifts
- id uuid pk
- company_id uuid not null fk → companies
- register_id uuid fk → pos_registers
- user_id uuid fk → auth.users
- status text default 'open' check in ('open','closed')
- opening_cash numeric
- closing_cash numeric
- expected_cash numeric
- variance numeric
- notes text
- started_at timestamptz
- ended_at timestamptz
- created_at timestamptz not null default now()

### pos_orders
- id uuid pk
- company_id uuid not null fk → companies
- order_number text
- status text default 'completed' check in ('completed','pending','voided','refunded','cancelled')
- subtotal numeric not null
- tax_rate numeric(6,4) not null default 0.0800
- tax numeric not null
- total numeric not null
- discount_amount numeric(12,2) not null default 0
- discount_name text
- payment_method text default 'cash'
- shift_id uuid fk → pos_shifts
- customer_name text
- customer_id uuid
- customer_email text
- customer_phone text
- cash_tendered numeric(12,2)
- cash_change numeric(12,2)
- notes text
- refund_amount numeric(12,2) default 0
- refund_reason text
- refunded_at timestamptz
- refunded_by uuid
- original_order_id uuid
- created_by uuid
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### pos_order_items
- id uuid pk
- order_id uuid not null fk → pos_orders
- product_id uuid fk → pos_products
- product_name text not null
- qty integer not null
- unit_price numeric not null
- subtotal numeric not null
- discount_amount numeric(12,2) not null default 0
- refunded_qty integer not null default 0
- created_at timestamptz not null default now()

### pos_payment_operations
- id uuid pk
- company_id uuid not null fk → companies
- order_id uuid
- amount numeric
- currency text
- state text
- operation_id uuid
- correlation_id uuid
- idempotency_key text
- provider text
- provider_event_id text
- occurred_at timestamptz
- created_by uuid
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### pos_payment_webhook_events
- id uuid pk
- company_id uuid not null fk → companies
- provider text
- provider_event_id text
- event_type text
- operation_id uuid
- correlation_id uuid
- idempotency_key text
- occurred_at timestamptz
- payload jsonb
- processed_at timestamptz
- created_at timestamptz not null default now()

### pos_daily_summaries
- id uuid pk
- company_id uuid not null fk → companies
- report_date date not null
- total_orders integer not null default 0
- total_sales numeric(14,2) not null default 0
- total_tax numeric(14,2) not null default 0
- total_discounts numeric(14,2) not null default 0
- total_refunds numeric(14,2) not null default 0
- net_sales numeric(14,2) not null default 0
- cash_sales numeric(14,2) not null default 0
- card_sales numeric(14,2) not null default 0
- wallet_sales numeric(14,2) not null default 0
- other_sales numeric(14,2) not null default 0
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
- UNIQUE(company_id, report_date)

## RPC Functions

### pos_generate_daily_summary(p_company_id, p_date)
- Aggregates pos_orders for given date
- Upserts into pos_daily_summaries
- Returns summary id

### pos_sales_report(p_company_id, p_start_date, p_end_date)
- Real-time aggregation (no cache)
- Returns daily rows + top products
- Groups by date with payment method breakdown

## APIs

### Products
- GET /api/pos/products — list active products
- POST /api/pos/products — create product
- PATCH /api/pos/products/[id] — update product

### Tax Configuration
- GET /api/pos/tax-config — list active tax configs
- POST /api/pos/tax-config — create tax config

### Discounts
- GET /api/pos/discounts — list all discounts
- POST /api/pos/discounts — create discount
- PATCH /api/pos/discounts/[id] — update discount

### Orders
- GET /api/pos/orders — list with ?status, ?start, ?end, ?search filters
- POST /api/pos/orders — create order with dynamic tax, discount, customer, cash change
- PATCH /api/pos/orders/[id] — update status, process refund (full/partial with inventory+accounting reversal)

### Shifts
- GET /api/pos/shifts — list shifts (?status=open filter)
- POST /api/pos/shifts — open shift
- POST /api/pos/shifts/[id]/close — close shift

### Registers
- GET /api/pos/registers — list active registers

### Reports
- GET /api/pos/reports/daily-summary — daily sales report (?start, ?end, ?format=csv)

### Payments
- POST /api/pos/checkout-intents — idempotent payment intent
- POST /api/pos/webhooks/payment — payment state machine webhook

### Contracts
- GET /api/pos/contracts — API contract scaffold

## Cross-Module Integration

### POS → Inventory
- On order completion: record_inventory_movement(out) per item with inv_product_id
- On refund: record_inventory_movement(in) to restock, idempotent by pos-refund-{orderId}-{productId}

### POS → Accounting
- On order completion: createPosOrderJournalEntry() — Dr Cash 1100 / Cr Revenue 4100
- On refund: createPosRefundJournalEntry() — Dr Revenue 4100 / Cr Cash 1100

### POS → Notifications
- On new order: notifyNewOrderServer() creates business notification

### POS → Membership (planned)
- membership_spend_transactions.reference_type = 'pos_order'
- membership_points_ledger for point awards

## Events
- pos.order.created
- pos.order.refunded
- pos.tax_config.created
- pos.discount.created
- pos.shift.opened
- pos.shift.closed
- pos.report.generated

## Status/Rules
- Tax rate stored on each order (not looked up retroactively)
- Discount amount pre-calculated and stored on order
- Refund creates reverse inventory movement + reverse journal entry
- All operations idempotent via idempotency_key
- RLS via company_members membership check
- All API routes guarded by requireBusinessActiveCompanyContext

## Ownership
- POS module agent owns this contract
- Changes require architecture guard approval
