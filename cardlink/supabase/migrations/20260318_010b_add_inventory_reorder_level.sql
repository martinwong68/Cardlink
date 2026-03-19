ALTER TABLE inv_products ADD COLUMN IF NOT EXISTS reorder_level integer NOT NULL DEFAULT 5;
