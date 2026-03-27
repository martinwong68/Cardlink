-- ================================================================
-- Upgrade Items Master Table
-- Add barcode, stock tracking, reorder level, image, and module sync flags
-- ================================================================

-- New columns for Item Master
ALTER TABLE items ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS stock_quantity numeric(14,2) DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS reorder_level numeric(14,2) DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT true;
ALTER TABLE items ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS synced_to_pos boolean NOT NULL DEFAULT true;
ALTER TABLE items ADD COLUMN IF NOT EXISTS synced_to_store boolean NOT NULL DEFAULT true;
ALTER TABLE items ADD COLUMN IF NOT EXISTS synced_to_inventory boolean NOT NULL DEFAULT true;

-- Index for barcode lookup
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(company_id, barcode);

-- Add master_item_id to pos_products if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_products' AND column_name = 'master_item_id'
  ) THEN
    ALTER TABLE pos_products ADD COLUMN master_item_id uuid REFERENCES items(id) ON DELETE SET NULL;
  END IF;
END $$;
