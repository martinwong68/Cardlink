INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, ai_actions_monthly, max_companies, max_users, storage_mb, pdf_export, document_ocr_monthly, features, sort_order) VALUES
('Free', 'free', 0, 0, 0, 1, 1, 500, false, 0, 
 '{"ai_chat":false,"store":"basic","custom_ai_rules":false,"support":"community"}', 1),
('Professional', 'professional', 29, 290, 200, 3, 5, 5120, true, 20, 
 '{"ai_chat":true,"store":"full","custom_ai_rules":false,"support":"email"}', 2),
('Business', 'business', 79, 790, 2000, 999, 20, 51200, true, 200, 
 '{"ai_chat":true,"store":"full_analytics","custom_ai_rules":true,"support":"priority"}', 3);
