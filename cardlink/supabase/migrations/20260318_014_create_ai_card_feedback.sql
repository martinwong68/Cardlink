CREATE TABLE ai_card_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES ai_action_cards(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  feedback_type text NOT NULL CHECK (feedback_type IN ('approved','rejected','amended')),
  rejection_reason text,
  amendment_diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_card_feedback_company ON ai_card_feedback(company_id);
CREATE INDEX idx_ai_card_feedback_card ON ai_card_feedback(card_id);

ALTER TABLE ai_card_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own feedback" ON ai_card_feedback
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
