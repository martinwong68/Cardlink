-- =============================================================
-- POS Rebuild Phase 1b — Reports Table & RPC Functions
-- =============================================================

-- ─── 1. Daily Sales Summary (materialized / cached) ─────────
CREATE TABLE IF NOT EXISTS pos_daily_summaries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_date   date NOT NULL,
  total_orders  integer NOT NULL DEFAULT 0,
  total_sales   numeric(14,2) NOT NULL DEFAULT 0,
  total_tax     numeric(14,2) NOT NULL DEFAULT 0,
  total_discounts numeric(14,2) NOT NULL DEFAULT 0,
  total_refunds numeric(14,2) NOT NULL DEFAULT 0,
  net_sales     numeric(14,2) NOT NULL DEFAULT 0,
  cash_sales    numeric(14,2) NOT NULL DEFAULT 0,
  card_sales    numeric(14,2) NOT NULL DEFAULT 0,
  wallet_sales  numeric(14,2) NOT NULL DEFAULT 0,
  other_sales   numeric(14,2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, report_date)
);

ALTER TABLE pos_daily_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can read POS daily summaries" ON pos_daily_summaries
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- ─── 2. RPC: Generate daily summary from orders ────────────
CREATE OR REPLACE FUNCTION pos_generate_daily_summary(
  p_company_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_total_orders integer;
  v_total_sales numeric;
  v_total_tax numeric;
  v_total_discounts numeric;
  v_total_refunds numeric;
  v_cash numeric;
  v_card numeric;
  v_wallet numeric;
  v_other numeric;
BEGIN
  -- Aggregate from pos_orders for the given date
  SELECT
    count(*) FILTER (WHERE status = 'completed'),
    coalesce(sum(total) FILTER (WHERE status = 'completed'), 0),
    coalesce(sum(tax) FILTER (WHERE status = 'completed'), 0),
    coalesce(sum(discount_amount) FILTER (WHERE status = 'completed'), 0),
    coalesce(sum(refund_amount) FILTER (WHERE status = 'refunded'), 0),
    coalesce(sum(total) FILTER (WHERE status = 'completed' AND payment_method = 'cash'), 0),
    coalesce(sum(total) FILTER (WHERE status = 'completed' AND payment_method = 'card'), 0),
    coalesce(sum(total) FILTER (WHERE status = 'completed' AND payment_method = 'wallet'), 0),
    coalesce(sum(total) FILTER (WHERE status = 'completed' AND payment_method NOT IN ('cash','card','wallet')), 0)
  INTO v_total_orders, v_total_sales, v_total_tax, v_total_discounts, v_total_refunds,
       v_cash, v_card, v_wallet, v_other
  FROM pos_orders
  WHERE company_id = p_company_id
    AND created_at::date = p_date;

  -- Upsert into daily summaries
  INSERT INTO pos_daily_summaries (
    company_id, report_date,
    total_orders, total_sales, total_tax, total_discounts, total_refunds,
    net_sales, cash_sales, card_sales, wallet_sales, other_sales,
    updated_at
  ) VALUES (
    p_company_id, p_date,
    v_total_orders, v_total_sales, v_total_tax, v_total_discounts, v_total_refunds,
    v_total_sales - v_total_refunds, v_cash, v_card, v_wallet, v_other,
    now()
  )
  ON CONFLICT (company_id, report_date) DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_sales = EXCLUDED.total_sales,
    total_tax = EXCLUDED.total_tax,
    total_discounts = EXCLUDED.total_discounts,
    total_refunds = EXCLUDED.total_refunds,
    net_sales = EXCLUDED.net_sales,
    cash_sales = EXCLUDED.cash_sales,
    card_sales = EXCLUDED.card_sales,
    wallet_sales = EXCLUDED.wallet_sales,
    other_sales = EXCLUDED.other_sales,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ─── 3. RPC: Get POS sales report (real-time, no cache) ────
CREATE OR REPLACE FUNCTION pos_sales_report(
  p_company_id uuid,
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  report_date date,
  total_orders bigint,
  total_sales numeric,
  total_tax numeric,
  total_discounts numeric,
  total_refunds numeric,
  net_sales numeric,
  cash_sales numeric,
  card_sales numeric,
  wallet_sales numeric,
  top_products jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH daily AS (
    SELECT
      o.created_at::date AS d,
      count(*) FILTER (WHERE o.status = 'completed') AS total_orders,
      coalesce(sum(o.total) FILTER (WHERE o.status = 'completed'), 0) AS total_sales,
      coalesce(sum(o.tax) FILTER (WHERE o.status = 'completed'), 0) AS total_tax,
      coalesce(sum(o.discount_amount) FILTER (WHERE o.status = 'completed'), 0) AS total_discounts,
      coalesce(sum(o.refund_amount) FILTER (WHERE o.status = 'refunded'), 0) AS total_refunds,
      coalesce(sum(o.total) FILTER (WHERE o.status = 'completed' AND o.payment_method = 'cash'), 0) AS cash_sales,
      coalesce(sum(o.total) FILTER (WHERE o.status = 'completed' AND o.payment_method = 'card'), 0) AS card_sales,
      coalesce(sum(o.total) FILTER (WHERE o.status = 'completed' AND o.payment_method = 'wallet'), 0) AS wallet_sales
    FROM pos_orders o
    WHERE o.company_id = p_company_id
      AND o.created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY o.created_at::date
  ),
  top_prods AS (
    SELECT
      oi.product_name,
      sum(oi.qty) AS total_qty,
      sum(oi.subtotal) AS total_revenue
    FROM pos_order_items oi
    JOIN pos_orders o ON o.id = oi.order_id
    WHERE o.company_id = p_company_id
      AND o.created_at::date BETWEEN p_start_date AND p_end_date
      AND o.status = 'completed'
    GROUP BY oi.product_name
    ORDER BY total_revenue DESC
    LIMIT 10
  )
  SELECT
    d.d AS report_date,
    d.total_orders,
    d.total_sales,
    d.total_tax,
    d.total_discounts,
    d.total_refunds,
    d.total_sales - d.total_refunds AS net_sales,
    d.cash_sales,
    d.card_sales,
    d.wallet_sales,
    (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'product_name', tp.product_name,
      'total_qty', tp.total_qty,
      'total_revenue', tp.total_revenue
    )), '[]'::jsonb) FROM top_prods tp) AS top_products
  FROM daily d
  ORDER BY d.d DESC;
END;
$$;
