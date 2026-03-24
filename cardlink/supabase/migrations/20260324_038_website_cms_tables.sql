-- ============================================================
-- Migration 038: Website CMS Tables
-- Allows business owners to manage a customer-facing website
-- Content is editable from the Cardlink business dashboard
-- and served via public API for the separate website project
-- ============================================================

-- Website settings per company (theme, domain, branding)
CREATE TABLE IF NOT EXISTS website_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_title text NOT NULL DEFAULT '',
  tagline text DEFAULT '',
  logo_url text,
  favicon_url text,
  primary_color text DEFAULT '#4f46e5',
  secondary_color text DEFAULT '#06b6d4',
  font_family text DEFAULT 'Inter',
  custom_css text,
  custom_head_html text,
  contact_email text,
  contact_phone text,
  contact_address text,
  social_facebook text,
  social_instagram text,
  social_twitter text,
  social_linkedin text,
  social_youtube text,
  footer_text text,
  is_published boolean NOT NULL DEFAULT false,
  custom_domain text,
  meta_title text,
  meta_description text,
  meta_og_image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='website_settings' AND policyname='website_settings_company') THEN
    CREATE POLICY "website_settings_company" ON website_settings
      USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));
  END IF;
END $$;

-- Website pages (hero, about, services, contact, custom pages)
CREATE TABLE IF NOT EXISTS website_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  page_type text NOT NULL DEFAULT 'custom'
    CHECK (page_type IN ('home','about','services','contact','blog','custom','faq','gallery','testimonials')),
  content jsonb NOT NULL DEFAULT '{}',
  -- content structure: { sections: [{ type: 'hero'|'text'|'image'|'gallery'|'cta'|'features'|'testimonials'|'faq'|'form', data: {...} }] }
  is_published boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  show_in_nav boolean NOT NULL DEFAULT true,
  meta_title text,
  meta_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, slug)
);

ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='website_pages' AND policyname='website_pages_company') THEN
    CREATE POLICY "website_pages_company" ON website_pages
      USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));
  END IF;
END $$;

-- Website navigation / menu items
CREATE TABLE IF NOT EXISTS website_nav_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  page_id uuid REFERENCES website_pages(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES website_nav_items(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  open_in_new_tab boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE website_nav_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='website_nav_items' AND policyname='website_nav_items_company') THEN
    CREATE POLICY "website_nav_items_company" ON website_nav_items
      USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));
  END IF;
END $$;

-- Website media library
CREATE TABLE IF NOT EXISTS website_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  file_size int,
  alt_text text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE website_media ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='website_media' AND policyname='website_media_company') THEN
    CREATE POLICY "website_media_company" ON website_media
      USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));
  END IF;
END $$;

-- Website form submissions (from contact form, etc.)
CREATE TABLE IF NOT EXISTS website_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  page_id uuid REFERENCES website_pages(id),
  form_type text NOT NULL DEFAULT 'contact',
  data jsonb NOT NULL DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE website_form_submissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='website_form_submissions' AND policyname='website_form_submissions_company') THEN
    CREATE POLICY "website_form_submissions_company" ON website_form_submissions
      USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));
  END IF;
END $$;

-- Public read policy for website content (no auth needed)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='website_settings' AND policyname='website_settings_public_read') THEN
    CREATE POLICY "website_settings_public_read" ON website_settings FOR SELECT
      USING (is_published = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='website_pages' AND policyname='website_pages_public_read') THEN
    CREATE POLICY "website_pages_public_read" ON website_pages FOR SELECT
      USING (is_published = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='website_nav_items' AND policyname='website_nav_items_public_read') THEN
    CREATE POLICY "website_nav_items_public_read" ON website_nav_items FOR SELECT
      USING (is_visible = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='website_media' AND policyname='website_media_public_read') THEN
    CREATE POLICY "website_media_public_read" ON website_media FOR SELECT
      USING (true);
  END IF;
  -- Allow anonymous form submissions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='website_form_submissions' AND policyname='website_form_submissions_public_insert') THEN
    CREATE POLICY "website_form_submissions_public_insert" ON website_form_submissions FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_website_settings_company ON website_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_website_pages_company ON website_pages(company_id);
CREATE INDEX IF NOT EXISTS idx_website_pages_slug ON website_pages(company_id, slug);
CREATE INDEX IF NOT EXISTS idx_website_nav_items_company ON website_nav_items(company_id);
CREATE INDEX IF NOT EXISTS idx_website_media_company ON website_media(company_id);
CREATE INDEX IF NOT EXISTS idx_website_form_submissions_company ON website_form_submissions(company_id);
