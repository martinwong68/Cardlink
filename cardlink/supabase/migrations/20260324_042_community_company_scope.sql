-- Add company_id to boards for company-scoped communities
-- Each company can have their own community boards

ALTER TABLE boards ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS member_count integer NOT NULL DEFAULT 0;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Create index for fast company-scoped lookups
CREATE INDEX IF NOT EXISTS idx_boards_company_id ON boards(company_id);

-- Allow NULL company_id for global/public boards (backward compatibility)
