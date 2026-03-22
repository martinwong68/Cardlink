-- Migration: Enhance inv_products with additional fields for professional inventory management
-- Adds: description, cost_price, sell_price, max_stock_level, image_url, category, preferred_supplier_id

ALTER TABLE inv_products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE inv_products ADD COLUMN IF NOT EXISTS cost_price numeric(14,2) DEFAULT 0;
ALTER TABLE inv_products ADD COLUMN IF NOT EXISTS sell_price numeric(14,2) DEFAULT 0;
ALTER TABLE inv_products ADD COLUMN IF NOT EXISTS max_stock_level integer;
ALTER TABLE inv_products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE inv_products ADD COLUMN IF NOT EXISTS category_id uuid;
ALTER TABLE inv_products ADD COLUMN IF NOT EXISTS preferred_supplier_id uuid;
ALTER TABLE inv_products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE inv_products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'physical'
  CHECK (product_type IN ('physical', 'service', 'digital', 'consumable'));
