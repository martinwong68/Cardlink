-- Migration: Inventory reporting & stock-take helper RPC functions

-- 1. complete_stock_take: Completes a stock-take, creates adjustment movements for variances
CREATE OR REPLACE FUNCTION complete_stock_take(
  p_stock_take_id uuid,
  p_completed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock_take record;
  v_item record;
  v_movement_count integer := 0;
  v_adjust_qty numeric;
BEGIN
  -- Get stock take
  SELECT * INTO v_stock_take FROM inv_stock_takes WHERE id = p_stock_take_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'stock_take_not_found';
  END IF;

  IF v_stock_take.status NOT IN ('draft', 'in_progress') THEN
    RAISE EXCEPTION 'stock_take_not_completable: current status is %', v_stock_take.status;
  END IF;

  -- Process each item with a variance
  FOR v_item IN
    SELECT sti.*, ip.name as product_name
    FROM inv_stock_take_items sti
    JOIN inv_products ip ON ip.id = sti.product_id
    WHERE sti.stock_take_id = p_stock_take_id
      AND sti.counted_qty IS NOT NULL
      AND sti.counted_qty != sti.system_qty
  LOOP
    v_adjust_qty := v_item.counted_qty - v_item.system_qty;

    -- Use record_inventory_movement for atomic balance update
    PERFORM record_inventory_movement(
      v_stock_take.company_id,
      v_item.product_id,
      'adjust',
      ABS(v_adjust_qty),
      'Stock take adjustment: ' || v_item.product_name || ' (' || v_adjust_qty::text || ')',
      'stock_take',
      p_stock_take_id::text,
      p_completed_by,
      'st-adj-' || p_stock_take_id::text || '-' || v_item.product_id::text,
      NULL, NULL, NULL
    );

    v_movement_count := v_movement_count + 1;
  END LOOP;

  -- Mark stock take as completed
  UPDATE inv_stock_takes
  SET status = 'completed',
      completed_at = now(),
      completed_by = p_completed_by,
      updated_at = now()
  WHERE id = p_stock_take_id;

  RETURN jsonb_build_object(
    'stock_take_id', p_stock_take_id,
    'status', 'completed',
    'adjustment_count', v_movement_count
  );
END;
$$;

-- 2. get_low_stock_products: Returns products below reorder level
CREATE OR REPLACE FUNCTION get_low_stock_products(p_company_id uuid)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  sku text,
  on_hand numeric,
  reorder_level integer,
  deficit numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    COALESCE(b.on_hand, 0) AS on_hand,
    COALESCE(p.reorder_level, 5) AS reorder_level,
    COALESCE(p.reorder_level, 5) - COALESCE(b.on_hand, 0) AS deficit
  FROM inv_products p
  LEFT JOIN inv_stock_balances b ON b.product_id = p.id AND b.company_id = p.company_id
  WHERE p.company_id = p_company_id
    AND p.is_active = true
    AND COALESCE(b.on_hand, 0) <= COALESCE(p.reorder_level, 5)
  ORDER BY deficit DESC;
$$;

-- 3. get_inventory_valuation: Returns total inventory value
CREATE OR REPLACE FUNCTION get_inventory_valuation(p_company_id uuid)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  sku text,
  on_hand numeric,
  cost_price numeric,
  total_value numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    COALESCE(b.on_hand, 0) AS on_hand,
    COALESCE(p.cost_price, 0) AS cost_price,
    COALESCE(b.on_hand, 0) * COALESCE(p.cost_price, 0) AS total_value
  FROM inv_products p
  LEFT JOIN inv_stock_balances b ON b.product_id = p.id AND b.company_id = p.company_id
  WHERE p.company_id = p_company_id
    AND p.is_active = true
  ORDER BY total_value DESC;
$$;
