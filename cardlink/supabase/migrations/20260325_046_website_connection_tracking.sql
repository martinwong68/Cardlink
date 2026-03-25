-- ============================================================
-- Migration 046: Website Connection Tracking
-- Adds linked_website_url and last_heartbeat_at to website_settings
-- so the Cardlink app knows which external website is connected
-- to each company and when it last checked in.
--
-- linked_website_url: origin URL of the connected company-website-template
--                     (e.g. https://mycompany.vercel.app)
-- last_heartbeat_at:  timestamp of the last heartbeat ping from the website
-- ============================================================

ALTER TABLE website_settings
  ADD COLUMN IF NOT EXISTS linked_website_url text,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz;
