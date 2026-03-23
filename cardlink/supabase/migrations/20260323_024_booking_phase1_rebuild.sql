-- ─────────────────────────────────────────────────────
-- Booking Module — Phase 1 Rebuild
-- Migration: 20260323_024_booking_phase1_rebuild.sql
-- Date: 2026-03-23
-- ─────────────────────────────────────────────────────
-- Covers P0 + P1 from BOOKING_FEATURE_GAP_ANALYSIS.md:
--   • Enhanced booking_services (buffer, lead time, advance booking)
--   • booking_settings (company-level booking configuration)
--   • booking_date_overrides (date-specific exceptions)
--   • booking_customers (dedicated customer directory)
--   • Enhanced booking_appointments (rescheduling, cancellation reason, source)
--   • RPC: check_booking_conflicts (double-booking prevention)
--   • RPC: get_available_slots (slot calculator)
-- ─────────────────────────────────────────────────────

-- ───────────────────────────
-- 1. Enhance booking_services
-- ───────────────────────────
ALTER TABLE booking_services
  ADD COLUMN IF NOT EXISTS buffer_before_mins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buffer_after_mins  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_notice_hours   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_advance_days   integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS image_url          text,
  ADD COLUMN IF NOT EXISTS sort_order         integer NOT NULL DEFAULT 0;

-- ───────────────────────────
-- 2. booking_settings (company-level booking config)
-- ───────────────────────────
CREATE TABLE IF NOT EXISTS booking_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  auto_confirm    boolean NOT NULL DEFAULT false,
  timezone        text NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
  slot_interval_mins integer NOT NULL DEFAULT 30,
  cancellation_notice_hours integer NOT NULL DEFAULT 0,
  cancellation_policy text,
  booking_page_title text,
  booking_page_description text,
  require_phone   boolean NOT NULL DEFAULT false,
  require_email   boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage booking settings"
  ON booking_settings FOR ALL
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Public can read booking settings"
  ON booking_settings FOR SELECT
  USING (true);

-- ───────────────────────────
-- 3. booking_date_overrides (date-specific exceptions)
-- ───────────────────────────
CREATE TABLE IF NOT EXISTS booking_date_overrides (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_id      uuid REFERENCES booking_services(id) ON DELETE CASCADE,
  override_date   date NOT NULL,
  is_closed       boolean NOT NULL DEFAULT false,
  start_time      time,
  end_time        time,
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_date_overrides_lookup
  ON booking_date_overrides(company_id, override_date);

ALTER TABLE booking_date_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage date overrides"
  ON booking_date_overrides FOR ALL
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- ───────────────────────────
-- 4. booking_customers (dedicated customer directory)
-- ───────────────────────────
CREATE TABLE IF NOT EXISTS booking_customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text,
  phone           text,
  notes           text,
  user_id         uuid REFERENCES auth.users(id),
  total_bookings  integer NOT NULL DEFAULT 0,
  total_spent     numeric NOT NULL DEFAULT 0,
  last_visit_date date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_customers_company
  ON booking_customers(company_id);

CREATE INDEX IF NOT EXISTS idx_booking_customers_email
  ON booking_customers(company_id, email);

ALTER TABLE booking_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage booking customers"
  ON booking_customers FOR ALL
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- ───────────────────────────
-- 5. Enhance booking_appointments
-- ───────────────────────────
ALTER TABLE booking_appointments
  ADD COLUMN IF NOT EXISTS cancellation_reason  text,
  ADD COLUMN IF NOT EXISTS rescheduled_from_id  uuid REFERENCES booking_appointments(id),
  ADD COLUMN IF NOT EXISTS source               text NOT NULL DEFAULT 'admin'
    CHECK (source IN ('admin', 'public', 'api')),
  ADD COLUMN IF NOT EXISTS customer_id          uuid REFERENCES booking_customers(id);

-- ───────────────────────────
-- 6. RPC: check_booking_conflicts
-- ───────────────────────────
CREATE OR REPLACE FUNCTION check_booking_conflicts(
  p_company_id   uuid,
  p_service_id   uuid,
  p_date         date,
  p_start_time   time,
  p_end_time     time,
  p_exclude_id   uuid DEFAULT NULL
)
RETURNS TABLE(conflict_id uuid, conflict_customer text, conflict_start time, conflict_end time)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
    SELECT
      ba.id,
      ba.customer_name,
      ba.start_time,
      ba.end_time
    FROM booking_appointments ba
    WHERE ba.company_id = p_company_id
      AND ba.service_id = p_service_id
      AND ba.appointment_date = p_date
      AND ba.status NOT IN ('cancelled', 'no_show')
      AND ba.start_time < p_end_time
      AND ba.end_time > p_start_time
      AND (p_exclude_id IS NULL OR ba.id != p_exclude_id);
END;
$$;

-- ───────────────────────────
-- 7. RPC: get_available_slots
-- ───────────────────────────
CREATE OR REPLACE FUNCTION get_available_slots(
  p_company_id    uuid,
  p_service_id    uuid,
  p_date          date
)
RETURNS TABLE(slot_start time, slot_end time)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_day_of_week    integer;
  v_duration       integer;
  v_buffer_before  integer;
  v_buffer_after   integer;
  v_max_concurrent integer;
  v_interval       integer;
  v_avail_start    time;
  v_avail_end      time;
  v_override       RECORD;
  v_slot           time;
  v_slot_end       time;
  v_conflict_count integer;
BEGIN
  -- Get service details
  SELECT s.duration_minutes, s.buffer_before_mins, s.buffer_after_mins, s.max_concurrent
  INTO v_duration, v_buffer_before, v_buffer_after, v_max_concurrent
  FROM booking_services s
  WHERE s.id = p_service_id AND s.company_id = p_company_id AND s.is_active = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get slot interval from settings (default 30)
  SELECT COALESCE(bs.slot_interval_mins, 30)
  INTO v_interval
  FROM booking_settings bs
  WHERE bs.company_id = p_company_id;

  IF NOT FOUND THEN
    v_interval := 30;
  END IF;

  -- Check date override first
  SELECT *
  INTO v_override
  FROM booking_date_overrides bdo
  WHERE bdo.company_id = p_company_id
    AND bdo.override_date = p_date
    AND (bdo.service_id = p_service_id OR bdo.service_id IS NULL)
  ORDER BY bdo.service_id NULLS LAST
  LIMIT 1;

  IF FOUND AND v_override.is_closed THEN
    RETURN; -- Closed on this date
  END IF;

  IF FOUND AND v_override.start_time IS NOT NULL THEN
    v_avail_start := v_override.start_time;
    v_avail_end   := v_override.end_time;
  ELSE
    -- Get regular availability for this day of week
    v_day_of_week := EXTRACT(DOW FROM p_date)::integer;
    -- Map: 0=Sun → our 6, 1=Mon → 0, etc.
    -- Our system: 0=Mon, 6=Sun; Postgres DOW: 0=Sun, 1=Mon
    v_day_of_week := CASE WHEN v_day_of_week = 0 THEN 6 ELSE v_day_of_week - 1 END;

    SELECT ba.start_time, ba.end_time
    INTO v_avail_start, v_avail_end
    FROM booking_availability ba
    WHERE ba.company_id = p_company_id
      AND ba.day_of_week = v_day_of_week
      AND ba.is_available = true
      AND (ba.service_id = p_service_id OR ba.service_id IS NULL)
    ORDER BY ba.service_id NULLS LAST
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN; -- Not available on this day
    END IF;
  END IF;

  -- Generate slots
  v_slot := v_avail_start;

  WHILE v_slot + make_interval(mins => v_duration) <= v_avail_end LOOP
    v_slot_end := v_slot + make_interval(mins => v_duration);

    -- Check concurrent bookings
    SELECT COUNT(*)
    INTO v_conflict_count
    FROM booking_appointments appt
    WHERE appt.company_id = p_company_id
      AND appt.service_id = p_service_id
      AND appt.appointment_date = p_date
      AND appt.status NOT IN ('cancelled', 'no_show')
      AND appt.start_time < v_slot_end
      AND appt.end_time > v_slot;

    IF v_conflict_count < v_max_concurrent THEN
      slot_start := v_slot;
      slot_end   := v_slot_end;
      RETURN NEXT;
    END IF;

    v_slot := v_slot + make_interval(mins => v_interval);
  END LOOP;
END;
$$;
