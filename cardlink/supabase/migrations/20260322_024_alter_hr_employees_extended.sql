-- Extend hr_employees with additional fields for SME compliance
-- Emergency contact, address, national ID, bank details, reporting manager

ALTER TABLE hr_employees
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relation text,
  ADD COLUMN IF NOT EXISTS reporting_manager_id uuid REFERENCES hr_employees(id) ON DELETE SET NULL;
