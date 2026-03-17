-- Stage-3 core domain migration: inventory, procurement, pos real-function tables and RPCs.
-- Backward-safe migration: additive tables/functions/indexes/policies only.
-- Rollback note:
-- 1) DROP POLICY IF EXISTS inv_products_read ON public.inv_products;
-- 2) DROP POLICY IF EXISTS inv_products_write ON public.inv_products;
-- 3) DROP POLICY IF EXISTS inv_stock_movements_read ON public.inv_stock_movements;
-- 4) DROP POLICY IF EXISTS inv_stock_movements_write ON public.inv_stock_movements;
-- 5) DROP POLICY IF EXISTS inv_stock_balances_read ON public.inv_stock_balances;
-- 6) DROP POLICY IF EXISTS inv_stock_balances_write ON public.inv_stock_balances;
-- 7) DROP POLICY IF EXISTS proc_suppliers_read ON public.proc_suppliers;
-- 8) DROP POLICY IF EXISTS proc_suppliers_write ON public.proc_suppliers;
-- 9) DROP POLICY IF EXISTS proc_purchase_orders_read ON public.proc_purchase_orders;
-- 10) DROP POLICY IF EXISTS proc_purchase_orders_write ON public.proc_purchase_orders;
-- 11) DROP POLICY IF EXISTS proc_purchase_order_items_read ON public.proc_purchase_order_items;
-- 12) DROP POLICY IF EXISTS proc_purchase_order_items_write ON public.proc_purchase_order_items;
-- 13) DROP POLICY IF EXISTS proc_receipts_read ON public.proc_receipts;
-- 14) DROP POLICY IF EXISTS proc_receipts_write ON public.proc_receipts;
-- 15) DROP POLICY IF EXISTS proc_receipt_items_read ON public.proc_receipt_items;
-- 16) DROP POLICY IF EXISTS proc_receipt_items_write ON public.proc_receipt_items;
-- 17) DROP POLICY IF EXISTS pos_payment_operations_read ON public.pos_payment_operations;
-- 18) DROP POLICY IF EXISTS pos_payment_operations_write ON public.pos_payment_operations;
-- 19) DROP POLICY IF EXISTS pos_payment_webhook_events_read ON public.pos_payment_webhook_events;
-- 20) DROP POLICY IF EXISTS pos_payment_webhook_events_write ON public.pos_payment_webhook_events;
-- 21) DROP FUNCTION IF EXISTS public.process_procurement_receipt(uuid, uuid, uuid, text, text, text, text, timestamptz, jsonb);
-- 22) DROP FUNCTION IF EXISTS public.record_inventory_movement(uuid, uuid, text, numeric, text, text, uuid, uuid, text, text, text, timestamptz);
-- 23) DROP FUNCTION IF EXISTS public.can_manage_company(uuid);
-- 24) DROP TABLE IF EXISTS public.pos_payment_webhook_events;
-- 25) DROP TABLE IF EXISTS public.pos_payment_operations;
-- 26) DROP TABLE IF EXISTS public.proc_receipt_items;
-- 27) DROP TABLE IF EXISTS public.proc_receipts;
-- 28) DROP TABLE IF EXISTS public.proc_purchase_order_items;
-- 29) DROP TABLE IF EXISTS public.proc_purchase_orders;
-- 30) DROP TABLE IF EXISTS public.proc_suppliers;
-- 31) DROP TABLE IF EXISTS public.inv_stock_movements;
-- 32) DROP TABLE IF EXISTS public.inv_stock_balances;
-- 33) DROP TABLE IF EXISTS public.inv_products;

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.can_manage_company(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_master_user = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = target_company_id
      AND c.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = target_company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND lower(coalesce(cm.role, '')) IN ('owner', 'admin', 'manager', 'company_owner', 'company_admin')
  )
  OR target_company_id IN (
    SELECT company_id FROM public.get_my_admin_company_ids()
  );
$$;

CREATE TABLE IF NOT EXISTS public.inv_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, sku)
);

CREATE TABLE IF NOT EXISTS public.inv_stock_balances (
  product_id uuid PRIMARY KEY REFERENCES public.inv_products(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  on_hand numeric(14,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inv_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.inv_products(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjust')),
  qty numeric(14,2) NOT NULL,
  reason text,
  reference_type text,
  reference_id uuid,
  operation_id text,
  correlation_id text,
  idempotency_key text,
  created_by uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inv_stock_movement_qty_check CHECK (
    (movement_type IN ('in', 'out') AND qty > 0)
    OR (movement_type = 'adjust' AND qty <> 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inv_stock_movements_company_idempotency
  ON public.inv_stock_movements(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inv_products_company_created_at
  ON public.inv_products(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inv_stock_balances_company_product
  ON public.inv_stock_balances(company_id, product_id);

CREATE INDEX IF NOT EXISTS idx_inv_stock_movements_company_product_created
  ON public.inv_stock_movements(company_id, product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.proc_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proc_suppliers_company_created_at
  ON public.proc_suppliers(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.proc_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.proc_suppliers(id) ON DELETE RESTRICT,
  po_number text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'submitted', 'received', 'cancelled')),
  ordered_at timestamptz,
  expected_at timestamptz,
  idempotency_key text,
  operation_id text,
  correlation_id text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, po_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_proc_purchase_orders_company_idempotency
  ON public.proc_purchase_orders(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.proc_purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  po_id uuid NOT NULL REFERENCES public.proc_purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.inv_products(id) ON DELETE RESTRICT,
  qty numeric(14,2) NOT NULL CHECK (qty > 0),
  unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0)
);

CREATE INDEX IF NOT EXISTS idx_proc_po_items_po
  ON public.proc_purchase_order_items(po_id);

CREATE TABLE IF NOT EXISTS public.proc_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  po_id uuid NOT NULL REFERENCES public.proc_purchase_orders(id) ON DELETE CASCADE,
  idempotency_key text,
  operation_id text,
  correlation_id text,
  received_at timestamptz NOT NULL DEFAULT now(),
  received_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_proc_receipts_company_idempotency
  ON public.proc_receipts(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proc_receipts_company_po
  ON public.proc_receipts(company_id, po_id, received_at DESC);

CREATE TABLE IF NOT EXISTS public.proc_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.proc_receipts(id) ON DELETE CASCADE,
  po_item_id uuid NOT NULL REFERENCES public.proc_purchase_order_items(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.inv_products(id) ON DELETE RESTRICT,
  qty numeric(14,2) NOT NULL CHECK (qty > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proc_receipt_items_receipt
  ON public.proc_receipt_items(receipt_id);

CREATE TABLE IF NOT EXISTS public.pos_payment_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  state text NOT NULL CHECK (state IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
  operation_id text NOT NULL,
  correlation_id text,
  idempotency_key text NOT NULL,
  provider text,
  provider_event_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, idempotency_key),
  UNIQUE (company_id, operation_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_payment_operations_company_created
  ON public.pos_payment_operations(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.pos_payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  operation_id text,
  correlation_id text,
  idempotency_key text,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_payment_webhook_events_company_created
  ON public.pos_payment_webhook_events(company_id, created_at DESC);

ALTER TABLE public.inv_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proc_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proc_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proc_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proc_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proc_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_payment_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_payment_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inv_products_read ON public.inv_products;
CREATE POLICY inv_products_read ON public.inv_products
FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS inv_products_write ON public.inv_products;
CREATE POLICY inv_products_write ON public.inv_products
FOR ALL USING (public.can_manage_company(company_id))
WITH CHECK (public.can_manage_company(company_id));

DROP POLICY IF EXISTS inv_stock_balances_read ON public.inv_stock_balances;
CREATE POLICY inv_stock_balances_read ON public.inv_stock_balances
FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS inv_stock_balances_write ON public.inv_stock_balances;
CREATE POLICY inv_stock_balances_write ON public.inv_stock_balances
FOR ALL USING (public.can_manage_company(company_id))
WITH CHECK (public.can_manage_company(company_id));

DROP POLICY IF EXISTS inv_stock_movements_read ON public.inv_stock_movements;
CREATE POLICY inv_stock_movements_read ON public.inv_stock_movements
FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS inv_stock_movements_write ON public.inv_stock_movements;
CREATE POLICY inv_stock_movements_write ON public.inv_stock_movements
FOR ALL USING (public.can_manage_company(company_id))
WITH CHECK (public.can_manage_company(company_id));

DROP POLICY IF EXISTS proc_suppliers_read ON public.proc_suppliers;
CREATE POLICY proc_suppliers_read ON public.proc_suppliers
FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS proc_suppliers_write ON public.proc_suppliers;
CREATE POLICY proc_suppliers_write ON public.proc_suppliers
FOR ALL USING (public.can_manage_company(company_id))
WITH CHECK (public.can_manage_company(company_id));

DROP POLICY IF EXISTS proc_purchase_orders_read ON public.proc_purchase_orders;
CREATE POLICY proc_purchase_orders_read ON public.proc_purchase_orders
FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS proc_purchase_orders_write ON public.proc_purchase_orders;
CREATE POLICY proc_purchase_orders_write ON public.proc_purchase_orders
FOR ALL USING (public.can_manage_company(company_id))
WITH CHECK (public.can_manage_company(company_id));

DROP POLICY IF EXISTS proc_purchase_order_items_read ON public.proc_purchase_order_items;
CREATE POLICY proc_purchase_order_items_read ON public.proc_purchase_order_items
FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS proc_purchase_order_items_write ON public.proc_purchase_order_items;
CREATE POLICY proc_purchase_order_items_write ON public.proc_purchase_order_items
FOR ALL USING (public.can_manage_company(company_id))
WITH CHECK (public.can_manage_company(company_id));

DROP POLICY IF EXISTS proc_receipts_read ON public.proc_receipts;
CREATE POLICY proc_receipts_read ON public.proc_receipts
FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS proc_receipts_write ON public.proc_receipts;
CREATE POLICY proc_receipts_write ON public.proc_receipts
FOR ALL USING (public.can_manage_company(company_id))
WITH CHECK (public.can_manage_company(company_id));

DROP POLICY IF EXISTS proc_receipt_items_read ON public.proc_receipt_items;
CREATE POLICY proc_receipt_items_read ON public.proc_receipt_items
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.proc_receipts r
    WHERE r.id = receipt_id
      AND public.can_manage_company(r.company_id)
  )
);
DROP POLICY IF EXISTS proc_receipt_items_write ON public.proc_receipt_items;
CREATE POLICY proc_receipt_items_write ON public.proc_receipt_items
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.proc_receipts r
    WHERE r.id = receipt_id
      AND public.can_manage_company(r.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.proc_receipts r
    WHERE r.id = receipt_id
      AND public.can_manage_company(r.company_id)
  )
);

DROP POLICY IF EXISTS pos_payment_operations_read ON public.pos_payment_operations;
CREATE POLICY pos_payment_operations_read ON public.pos_payment_operations
FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS pos_payment_operations_write ON public.pos_payment_operations;
CREATE POLICY pos_payment_operations_write ON public.pos_payment_operations
FOR ALL USING (public.can_manage_company(company_id))
WITH CHECK (public.can_manage_company(company_id));

DROP POLICY IF EXISTS pos_payment_webhook_events_read ON public.pos_payment_webhook_events;
CREATE POLICY pos_payment_webhook_events_read ON public.pos_payment_webhook_events
FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS pos_payment_webhook_events_write ON public.pos_payment_webhook_events;
CREATE POLICY pos_payment_webhook_events_write ON public.pos_payment_webhook_events
FOR ALL USING (public.can_manage_company(company_id))
WITH CHECK (public.can_manage_company(company_id));

CREATE OR REPLACE FUNCTION public.record_inventory_movement(
  p_company_id uuid,
  p_product_id uuid,
  p_movement_type text,
  p_qty numeric,
  p_reason text DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_operation_id text DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_occurred_at timestamptz DEFAULT now()
)
RETURNS TABLE (movement_id uuid, balance_on_hand numeric, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_movement_id uuid;
  v_balance numeric(14,2);
  v_delta numeric(14,2);
  v_new_balance numeric(14,2);
BEGIN
  IF p_company_id IS NULL OR p_product_id IS NULL THEN
    RAISE EXCEPTION 'company_id and product_id are required' USING ERRCODE = 'P0001';
  END IF;

  IF p_movement_type NOT IN ('in', 'out', 'adjust') THEN
    RAISE EXCEPTION 'invalid_movement_type' USING ERRCODE = 'P0001';
  END IF;

  IF p_movement_type IN ('in', 'out') AND (p_qty IS NULL OR p_qty <= 0) THEN
    RAISE EXCEPTION 'qty_must_be_positive_for_in_out' USING ERRCODE = 'P0001';
  END IF;

  IF p_movement_type = 'adjust' AND (p_qty IS NULL OR p_qty = 0) THEN
    RAISE EXCEPTION 'qty_must_be_non_zero_for_adjust' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.inv_products p
    WHERE p.id = p_product_id
      AND p.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'product_not_found_in_company' USING ERRCODE = 'P0001';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT m.id
      INTO v_existing_movement_id
    FROM public.inv_stock_movements m
    WHERE m.company_id = p_company_id
      AND m.idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_existing_movement_id IS NOT NULL THEN
      SELECT b.on_hand
        INTO v_balance
      FROM public.inv_stock_balances b
      WHERE b.product_id = p_product_id
        AND b.company_id = p_company_id;

      RETURN QUERY
      SELECT v_existing_movement_id, coalesce(v_balance, 0)::numeric, 'idempotent_replay'::text;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.inv_stock_balances (product_id, company_id, on_hand)
  VALUES (p_product_id, p_company_id, 0)
  ON CONFLICT (product_id) DO NOTHING;

  SELECT b.on_hand
    INTO v_balance
  FROM public.inv_stock_balances b
  WHERE b.product_id = p_product_id
    AND b.company_id = p_company_id
  FOR UPDATE;

  v_balance := coalesce(v_balance, 0);

  IF p_movement_type = 'in' THEN
    v_delta := p_qty;
  ELSIF p_movement_type = 'out' THEN
    v_delta := p_qty * -1;
  ELSE
    v_delta := p_qty;
  END IF;

  v_new_balance := v_balance + v_delta;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'negative_stock_not_allowed' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.inv_stock_movements (
    company_id,
    product_id,
    movement_type,
    qty,
    reason,
    reference_type,
    reference_id,
    operation_id,
    correlation_id,
    idempotency_key,
    created_by,
    occurred_at
  )
  VALUES (
    p_company_id,
    p_product_id,
    p_movement_type,
    p_qty,
    p_reason,
    p_reference_type,
    p_reference_id,
    p_operation_id,
    p_correlation_id,
    p_idempotency_key,
    p_created_by,
    coalesce(p_occurred_at, now())
  )
  RETURNING id INTO movement_id;

  UPDATE public.inv_stock_balances
  SET on_hand = v_new_balance,
      updated_at = now()
  WHERE product_id = p_product_id
    AND company_id = p_company_id;

  RETURN QUERY
  SELECT movement_id, v_new_balance::numeric, 'created'::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_procurement_receipt(
  p_company_id uuid,
  p_po_id uuid,
  p_received_by uuid DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_operation_id text DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_occurred_at timestamptz DEFAULT now(),
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (receipt_id uuid, movement_count integer, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt_id uuid;
  v_existing_receipt_id uuid;
  v_total_movements integer := 0;
  v_po_status text;
  v_po_company_id uuid;
  v_item_record record;
  v_po_item_qty numeric(14,2);
  v_existing_received_qty numeric(14,2);
  v_movement record;
  v_has_remaining boolean;
BEGIN
  IF p_company_id IS NULL OR p_po_id IS NULL THEN
    RAISE EXCEPTION 'company_id and po_id are required' USING ERRCODE = 'P0001';
  END IF;

  SELECT po.id, po.status, po.company_id
    INTO v_receipt_id, v_po_status, v_po_company_id
  FROM public.proc_purchase_orders po
  WHERE po.id = p_po_id
  FOR UPDATE;

  IF v_receipt_id IS NULL THEN
    RAISE EXCEPTION 'po_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_po_company_id <> p_company_id THEN
    RAISE EXCEPTION 'po_scope_mismatch' USING ERRCODE = 'P0001';
  END IF;

  IF v_po_status NOT IN ('submitted', 'received') THEN
    RAISE EXCEPTION 'po_status_not_receivable' USING ERRCODE = 'P0001';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT r.id
      INTO v_existing_receipt_id
    FROM public.proc_receipts r
    WHERE r.company_id = p_company_id
      AND r.idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_existing_receipt_id IS NOT NULL THEN
      SELECT count(*)::int
        INTO v_total_movements
      FROM public.inv_stock_movements m
      WHERE m.reference_type = 'proc_receipt'
        AND m.reference_id = v_existing_receipt_id;

      RETURN QUERY
      SELECT v_existing_receipt_id, v_total_movements, 'idempotent_replay'::text;
      RETURN;
    END IF;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'receipt_items_required' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.proc_receipts (
    company_id,
    po_id,
    idempotency_key,
    operation_id,
    correlation_id,
    received_at,
    received_by,
    note
  )
  VALUES (
    p_company_id,
    p_po_id,
    p_idempotency_key,
    p_operation_id,
    p_correlation_id,
    coalesce(p_occurred_at, now()),
    p_received_by,
    p_note
  )
  RETURNING id INTO v_receipt_id;

  FOR v_item_record IN
    SELECT
      (x ->> 'po_item_id')::uuid AS po_item_id,
      (x ->> 'product_id')::uuid AS product_id,
      (x ->> 'qty')::numeric AS qty
    FROM jsonb_array_elements(p_items) AS x
  LOOP
    IF v_item_record.po_item_id IS NULL OR v_item_record.product_id IS NULL THEN
      RAISE EXCEPTION 'receipt_item_missing_po_item_or_product' USING ERRCODE = 'P0001';
    END IF;

    IF v_item_record.qty IS NULL OR v_item_record.qty <= 0 THEN
      RAISE EXCEPTION 'receipt_item_qty_invalid' USING ERRCODE = 'P0001';
    END IF;

    SELECT i.qty
      INTO v_po_item_qty
    FROM public.proc_purchase_order_items i
    WHERE i.id = v_item_record.po_item_id
      AND i.po_id = p_po_id
      AND i.company_id = p_company_id
      AND i.product_id = v_item_record.product_id
    FOR UPDATE;

    IF v_po_item_qty IS NULL THEN
      RAISE EXCEPTION 'po_item_not_found_or_scope_mismatch' USING ERRCODE = 'P0001';
    END IF;

    SELECT coalesce(sum(ri.qty), 0)
      INTO v_existing_received_qty
    FROM public.proc_receipt_items ri
    JOIN public.proc_receipts r ON r.id = ri.receipt_id
    WHERE r.po_id = p_po_id
      AND r.company_id = p_company_id
      AND ri.po_item_id = v_item_record.po_item_id;

    IF (v_existing_received_qty + v_item_record.qty) > v_po_item_qty THEN
      RAISE EXCEPTION 'over_receive_not_allowed' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.proc_receipt_items (
      receipt_id,
      po_item_id,
      product_id,
      qty
    )
    VALUES (
      v_receipt_id,
      v_item_record.po_item_id,
      v_item_record.product_id,
      v_item_record.qty
    );

    SELECT *
      INTO v_movement
    FROM public.record_inventory_movement(
      p_company_id,
      v_item_record.product_id,
      'in',
      v_item_record.qty,
      'procurement_receipt',
      'proc_receipt',
      v_receipt_id,
      p_received_by,
      NULL,
      p_operation_id,
      p_correlation_id,
      coalesce(p_occurred_at, now())
    );

    v_total_movements := v_total_movements + 1;
  END LOOP;

  SELECT EXISTS (
    SELECT 1
    FROM public.proc_purchase_order_items i
    LEFT JOIN (
      SELECT ri.po_item_id, sum(ri.qty) AS received_qty
      FROM public.proc_receipt_items ri
      JOIN public.proc_receipts r ON r.id = ri.receipt_id
      WHERE r.po_id = p_po_id
        AND r.company_id = p_company_id
      GROUP BY ri.po_item_id
    ) rs ON rs.po_item_id = i.id
    WHERE i.po_id = p_po_id
      AND i.company_id = p_company_id
      AND coalesce(rs.received_qty, 0) < i.qty
  ) INTO v_has_remaining;

  UPDATE public.proc_purchase_orders
  SET status = CASE WHEN v_has_remaining THEN 'submitted' ELSE 'received' END,
      updated_at = now()
  WHERE id = p_po_id
    AND company_id = p_company_id;

  RETURN QUERY
  SELECT v_receipt_id, v_total_movements, 'created'::text;
END;
$$;

COMMIT;
