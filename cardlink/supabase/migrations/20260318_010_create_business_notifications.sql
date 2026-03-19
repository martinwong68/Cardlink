CREATE TABLE business_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_order','low_stock','new_connection','invoice_overdue','payment_received','booking_new','ai_suggestion','system')),
  title text NOT NULL,
  body text,
  metadata jsonb DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent','normal','info')),
  related_module text,
  related_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_notifications_company ON business_notifications(company_id, user_id, is_read);
CREATE INDEX idx_business_notifications_type ON business_notifications(type);

ALTER TABLE business_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON business_notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON business_notifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Service role can insert" ON business_notifications
  FOR INSERT WITH CHECK (true);
