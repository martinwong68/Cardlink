INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, ai_actions_monthly, max_companies, max_users, storage_mb, pdf_export, document_ocr_monthly, features, sort_order) VALUES
('Starter', 'starter', 20, 200, 50, 1, 3, 1024, false, 5, 
 '{"ai_chat":true,"store":"basic","custom_ai_rules":false,"support":"email"}', 1),
('Professional', 'professional', 40, 400, 200, 3, 5, 5120, true, 20, 
 '{"ai_chat":true,"store":"full","custom_ai_rules":false,"support":"email"}', 2),
('Business', 'business', 60, 600, 2000, 999, 20, 51200, true, 200, 
 '{"ai_chat":true,"store":"full_analytics","custom_ai_rules":true,"support":"priority"}', 3)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  ai_actions_monthly = EXCLUDED.ai_actions_monthly,
  max_companies = EXCLUDED.max_companies,
  max_users = EXCLUDED.max_users,
  storage_mb = EXCLUDED.storage_mb,
  pdf_export = EXCLUDED.pdf_export,
  document_ocr_monthly = EXCLUDED.document_ocr_monthly,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;
