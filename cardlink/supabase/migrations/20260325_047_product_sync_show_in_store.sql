-- Add show_in_store and show_in_pos flags to inventory products for cross-module sync
ALTER TABLE inv_products ADD COLUMN IF NOT EXISTS show_in_store boolean NOT NULL DEFAULT false;
ALTER TABLE inv_products ADD COLUMN IF NOT EXISTS show_in_pos boolean NOT NULL DEFAULT false;

-- Add inventory_item_id to pos_products for linking to inventory
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS inventory_item_id uuid REFERENCES inv_products(id);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_inv_products_show_in_store ON inv_products(company_id) WHERE show_in_store = true;
CREATE INDEX IF NOT EXISTS idx_inv_products_show_in_pos ON inv_products(company_id) WHERE show_in_pos = true;
CREATE INDEX IF NOT EXISTS idx_pos_products_inventory_item ON pos_products(inventory_item_id);
