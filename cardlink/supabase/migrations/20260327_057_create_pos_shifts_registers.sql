-- ================================================================
-- Create POS Registers & Shifts Tables
-- These tables are required for the POS shift management feature
-- ================================================================

-- POS Registers
CREATE TABLE IF NOT EXISTS pos_registers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  location    text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_registers_company ON pos_registers(company_id);

ALTER TABLE pos_registers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage POS registers" ON pos_registers
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- POS Shifts
CREATE TABLE IF NOT EXISTS pos_shifts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  register_id   uuid REFERENCES pos_registers(id) ON DELETE SET NULL,
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opening_cash  numeric(14,2) DEFAULT 0,
  closing_cash  numeric(14,2),
  expected_cash numeric(14,2),
  variance      numeric(14,2),
  notes         text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_shifts_company ON pos_shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_register ON pos_shifts(register_id);

ALTER TABLE pos_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage POS shifts" ON pos_shifts
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- Seed a default register for each company that has POS enabled
INSERT INTO pos_registers (company_id, name, location, is_active)
SELECT cm.company_id, 'Main Register', 'Default', true
FROM company_modules cm
WHERE cm.module_name = 'pos' AND cm.is_enabled = true
  AND NOT EXISTS (
    SELECT 1 FROM pos_registers pr WHERE pr.company_id = cm.company_id
  );
