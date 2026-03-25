-- Add community and store visibility settings.
-- Companies can enable/disable community and control visibility of community, store, and individual items.

-- Visibility enum type: 'public' (anyone), 'all_users' (logged-in users), 'members_only' (company members)
DO $$ BEGIN
  CREATE TYPE visibility_level AS ENUM ('public', 'all_users', 'members_only');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Company-level community & store visibility settings
ALTER TABLE companies ADD COLUMN IF NOT EXISTS community_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS community_visibility text NOT NULL DEFAULT 'public'
  CHECK (community_visibility IN ('public', 'all_users', 'members_only'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS store_visibility text NOT NULL DEFAULT 'public'
  CHECK (store_visibility IN ('public', 'all_users', 'members_only'));

-- Per-board visibility (replaces simple is_public boolean with granular control)
ALTER TABLE boards ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'all_users', 'members_only'));

-- Per-product visibility
ALTER TABLE store_products ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'all_users', 'members_only'));
