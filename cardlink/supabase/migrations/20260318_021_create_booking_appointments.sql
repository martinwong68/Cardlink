CREATE TABLE booking_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES booking_services(id),
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_user_id uuid REFERENCES auth.users(id),
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  notes text,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_appointments_date ON booking_appointments(company_id, appointment_date);
ALTER TABLE booking_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage appointments" ON booking_appointments
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
