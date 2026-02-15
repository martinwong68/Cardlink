-- Add template column to business_cards table
-- This migration adds support for card templates

-- Add template column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_cards' AND column_name = 'template'
  ) THEN
    ALTER TABLE business_cards ADD COLUMN template TEXT DEFAULT NULL;
  END IF;
END $$;

-- Add index for faster template queries
CREATE INDEX IF NOT EXISTS idx_business_cards_template ON business_cards(template);

-- Update existing cards to use classic-business template as default
UPDATE business_cards 
SET template = 'classic-business' 
WHERE template IS NULL;

-- Add comment
COMMENT ON COLUMN business_cards.template IS 'Template ID for the business card design (e.g., classic-business, minimalist, modern-tech)';
