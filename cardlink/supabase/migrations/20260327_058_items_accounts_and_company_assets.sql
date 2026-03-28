-- ================================================================
-- Add accounting account references to items master table
-- Allows each item to have a default credit and debit account
-- ================================================================

ALTER TABLE items ADD COLUMN IF NOT EXISTS credit_account_id uuid;
ALTER TABLE items ADD COLUMN IF NOT EXISTS debit_account_id uuid;

-- Add FK constraints if accounts table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
    -- credit_account_id FK
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'items_credit_account_id_fkey' AND table_name = 'items'
    ) THEN
      ALTER TABLE items ADD CONSTRAINT items_credit_account_id_fkey
        FOREIGN KEY (credit_account_id) REFERENCES accounts(id) ON DELETE SET NULL;
    END IF;
    -- debit_account_id FK
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'items_debit_account_id_fkey' AND table_name = 'items'
    ) THEN
      ALTER TABLE items ADD CONSTRAINT items_debit_account_id_fkey
        FOREIGN KEY (debit_account_id) REFERENCES accounts(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Create company-assets storage bucket for company logo and cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to company-assets bucket
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can update company assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-assets');

CREATE POLICY "Anyone can view company assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can delete company assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-assets');
