-- Employee documents (contracts, IDs, certificates, etc.)
CREATE TABLE hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  name text NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('contract','id_document','certificate','payslip','other')),
  file_url text NOT NULL,
  file_size integer,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hr_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage documents" ON hr_documents
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
