CREATE TABLE ai_action_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES ai_conversations(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  card_type text NOT NULL CHECK (card_type IN ('journal_entry','invoice','inventory_update','expense','navigation','report','general')),
  title text NOT NULL,
  description text,
  suggested_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','amended','rejected')),
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  source_module text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  amended_data jsonb,
  feedback_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_action_cards_company ON ai_action_cards(company_id, status);

ALTER TABLE ai_action_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company cards" ON ai_action_cards
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
