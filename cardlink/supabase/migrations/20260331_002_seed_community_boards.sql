-- ════════════════════════════════════════════════════════════
-- Seed 3 global community boards with sub-boards
-- These boards are public (company_id IS NULL) and visible to everyone.
-- Forum posts are seeded separately via the seed-trial-data script
-- because they require an author_id (FK → auth.users).
-- ════════════════════════════════════════════════════════════

-- Board 1: Announcements
INSERT INTO boards (id, name, slug, description, icon, sort_order, company_id, visibility)
VALUES (
  '00000000-0000-0000-0000-000000000b01',
  'Announcements',
  'announcements',
  'Official platform updates, feature releases, and important notices from the Cardlink team.',
  '📢',
  1,
  NULL,
  'public'
) ON CONFLICT DO NOTHING;

-- Board 2: User Guide
INSERT INTO boards (id, name, slug, description, icon, sort_order, company_id, visibility)
VALUES (
  '00000000-0000-0000-0000-000000000b02',
  'User Guide',
  'user-guide',
  'Step-by-step tutorials and guides to help you get the most out of every Cardlink feature.',
  '📖',
  2,
  NULL,
  'public'
) ON CONFLICT DO NOTHING;

-- Board 3: General Discussion
INSERT INTO boards (id, name, slug, description, icon, sort_order, company_id, visibility)
VALUES (
  '00000000-0000-0000-0000-000000000b03',
  'General Discussion',
  'general-discussion',
  'Ask questions, share tips, request features, and connect with other Cardlink users.',
  '💬',
  3,
  NULL,
  'public'
) ON CONFLICT DO NOTHING;

-- ── Sub-boards for Announcements ─────────────────────────
INSERT INTO sub_boards (id, board_id, name, slug, description, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000s01', '00000000-0000-0000-0000-000000000b01', 'Platform Updates',  'platform-updates',  'Release notes, bug fixes, and infrastructure changes.',   1),
  ('00000000-0000-0000-0000-000000000s02', '00000000-0000-0000-0000-000000000b01', 'Feature Releases',  'feature-releases',  'Announcements for new modules and major feature launches.', 2)
ON CONFLICT DO NOTHING;

-- ── Sub-boards for User Guide ────────────────────────────
INSERT INTO sub_boards (id, board_id, name, slug, description, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000s03', '00000000-0000-0000-0000-000000000b02', 'Getting Started',        'getting-started',        'First-time setup, registration, and company onboarding guides.', 1),
  ('00000000-0000-0000-0000-000000000s04', '00000000-0000-0000-0000-000000000b02', 'Business Modules Guide',  'business-modules-guide', 'How-to guides for Accounting, HR, CRM, POS, Inventory, and more.', 2),
  ('00000000-0000-0000-0000-000000000s05', '00000000-0000-0000-0000-000000000b02', 'NFC & Digital Cards',     'nfc-digital-cards',      'Setting up NFC cards, QR codes, and public card sharing.',        3),
  ('00000000-0000-0000-0000-000000000s06', '00000000-0000-0000-0000-000000000b02', 'Billing & Subscription',  'billing-subscription',   'Plans, upgrades, Stripe payments, and billing FAQ.',              4)
ON CONFLICT DO NOTHING;

-- ── Sub-boards for General Discussion ────────────────────
INSERT INTO sub_boards (id, board_id, name, slug, description, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000s07', '00000000-0000-0000-0000-000000000b03', 'Tips & Tricks',     'tips-tricks',       'Share workflows, shortcuts, and best practices.',     1),
  ('00000000-0000-0000-0000-000000000s08', '00000000-0000-0000-0000-000000000b03', 'Feature Requests',  'feature-requests',  'Suggest and vote on features you would like to see.',  2),
  ('00000000-0000-0000-0000-000000000s09', '00000000-0000-0000-0000-000000000b03', 'Showcase',          'showcase',          'Show off your Cardlink setup, cards, and store.',      3)
ON CONFLICT DO NOTHING;
