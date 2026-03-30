-- Migration: Add variant support to the items master table
-- Enables items like "iPhone 14 Plus 256 白" to be stored as:
--   name: "iPhone 14 Plus"
--   variant_attribute: "Storage/Color"
--   variant_value: "256GB White"
--
-- Also adds a barcode column, stock_quantity, reorder_level,
-- track_inventory, image_url, and module-sync flags if missing
-- (these were added in app code but may not exist in DB yet).

-- Variant columns
ALTER TABLE items ADD COLUMN IF NOT EXISTS variant_attribute text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS variant_value text;

-- Inventory tracking columns (may already exist from migration 056)
ALTER TABLE items ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS stock_quantity numeric DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS reorder_level numeric DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT true;
ALTER TABLE items ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS synced_to_pos boolean NOT NULL DEFAULT true;
ALTER TABLE items ADD COLUMN IF NOT EXISTS synced_to_store boolean NOT NULL DEFAULT true;
ALTER TABLE items ADD COLUMN IF NOT EXISTS synced_to_inventory boolean NOT NULL DEFAULT true;

-- Index for variant lookups
CREATE INDEX IF NOT EXISTS idx_items_variant ON items(company_id, name, variant_value);
