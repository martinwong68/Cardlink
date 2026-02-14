-- NFC 系統完整設置 SQL
-- 按順序執行以下命令

-- 1. 確保 nfc_tap_logs 表結構正確
-- 先刪除可能存在的舊表（僅用於測試，生產環境請小心）
-- DROP TABLE IF EXISTS nfc_tap_logs CASCADE;

CREATE TABLE IF NOT EXISTS nfc_tap_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfc_card_id UUID REFERENCES nfc_cards(id) ON DELETE CASCADE,
  nfc_uid TEXT,  -- 可選欄位，用於記錄卡片 UID
  ip_address TEXT,
  user_agent TEXT,
  tapped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 如果表已存在但缺少 nfc_uid 欄位或有 NOT NULL 約束，調整它
DO $$ 
BEGIN
  -- 如果 nfc_uid 欄位不存在，添加它
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nfc_tap_logs' AND column_name = 'nfc_uid'
  ) THEN
    ALTER TABLE nfc_tap_logs ADD COLUMN nfc_uid TEXT;
  END IF;
  
  -- 如果 nfc_uid 有 NOT NULL 約束，移除它
  ALTER TABLE nfc_tap_logs ALTER COLUMN nfc_uid DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not modify nfc_tap_logs: %', SQLERRM;
END $$;

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_nfc_tap_logs_card_id ON nfc_tap_logs(nfc_card_id);
CREATE INDEX IF NOT EXISTS idx_nfc_tap_logs_tapped_at ON nfc_tap_logs(tapped_at);

-- 2. 先刪除現有函數
DROP FUNCTION IF EXISTS handle_nfc_tap(text, text, text);
DROP FUNCTION IF EXISTS register_nfc_card(text, uuid);
DROP FUNCTION IF EXISTS change_nfc_linked_card(uuid, uuid);

-- 3. 創建 handle_nfc_tap 函數
CREATE OR REPLACE FUNCTION handle_nfc_tap(
  nfc_uid TEXT,
  ip TEXT,
  user_agent TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  card_record RECORD;
BEGIN
  -- 查找 NFC 卡片
  SELECT * INTO card_record
  FROM nfc_cards
  WHERE nfc_cards.nfc_uid = handle_nfc_tap.nfc_uid;

  -- 如果找不到卡片
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'action', 'error',
      'error', 'Card not found'
    );
  END IF;

  -- 記錄點擊日誌（包括 nfc_uid）
  INSERT INTO nfc_tap_logs (nfc_card_id, nfc_uid, ip_address, user_agent, tapped_at)
  VALUES (card_record.id, nfc_uid, ip, user_agent, NOW());

  -- 更新總點擊次數和最後點擊時間
  UPDATE nfc_cards
  SET 
    total_taps = COALESCE(total_taps, 0) + 1,
    last_tapped_at = NOW()
  WHERE id = card_record.id;

  -- 根據狀態返回相應動作
  CASE card_record.status
    WHEN 'unregistered' THEN
      RETURN jsonb_build_object(
        'action', 'register',
        'nfc_uid', nfc_uid
      );
    WHEN 'suspended' THEN
      RETURN jsonb_build_object('action', 'suspended');
    WHEN 'deactivated' THEN
      RETURN jsonb_build_object('action', 'deactivated');
    WHEN 'active' THEN
      -- 如果已連結名片，獲取 slug 並重定向
      IF card_record.linked_card_id IS NOT NULL THEN
        DECLARE
          card_slug TEXT;
        BEGIN
          SELECT slug INTO card_slug
          FROM business_cards
          WHERE id = card_record.linked_card_id;
          
          IF card_slug IS NOT NULL THEN
            RETURN jsonb_build_object(
              'action', 'redirect',
              'slug', card_slug
            );
          ELSE
            RETURN jsonb_build_object('action', 'no_card');
          END IF;
        END;
      ELSE
        RETURN jsonb_build_object('action', 'no_card');
      END IF;
    ELSE
      RETURN jsonb_build_object('action', 'error');
  END CASE;
EXCEPTION
  WHEN OTHERS THEN
    -- 記錄錯誤並返回
    RAISE NOTICE 'Error in handle_nfc_tap: %', SQLERRM;
    RETURN jsonb_build_object(
      'action', 'error',
      'error', SQLERRM
    );
END;
$$;

-- 4. 創建 register_nfc_card 函數
CREATE OR REPLACE FUNCTION register_nfc_card(
  p_nfc_uid TEXT,
  p_linked_card_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  card_record RECORD;
  user_id_from_card UUID;
  current_user_id UUID;
BEGIN
  -- 獲取當前用戶 ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- 檢查 business_card 是否屬於當前用戶
  SELECT user_id INTO user_id_from_card
  FROM business_cards
  WHERE id = p_linked_card_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Business card not found'
    );
  END IF;

  IF user_id_from_card != current_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized'
    );
  END IF;

  -- 查找 NFC 卡片
  SELECT * INTO card_record
  FROM nfc_cards
  WHERE nfc_uid = p_nfc_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Card UID not recognized'
    );
  END IF;

  -- 檢查卡片是否已經被註冊
  IF card_record.owner_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Card already registered'
    );
  END IF;

  -- 註冊卡片
  UPDATE nfc_cards
  SET 
    owner_id = current_user_id,
    linked_card_id = p_linked_card_id,
    status = 'active',
    registered_at = NOW(),
    updated_at = NOW()
  WHERE id = card_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'card_id', card_record.id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- 5. 創建 change_nfc_linked_card 函數
CREATE OR REPLACE FUNCTION change_nfc_linked_card(
  p_nfc_card_id UUID,
  p_new_linked_card_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  card_owner_id UUID;
  new_card_owner_id UUID;
BEGIN
  -- 獲取當前用戶 ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- 檢查 NFC 卡片是否屬於當前用戶
  SELECT owner_id INTO card_owner_id
  FROM nfc_cards
  WHERE id = p_nfc_card_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NFC card not found'
    );
  END IF;

  IF card_owner_id != current_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized'
    );
  END IF;

  -- 檢查新的 business_card 是否屬於當前用戶
  SELECT user_id INTO new_card_owner_id
  FROM business_cards
  WHERE id = p_new_linked_card_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Business card not found'
    );
  END IF;

  IF new_card_owner_id != current_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized to link this card'
    );
  END IF;

  -- 更新連結
  UPDATE nfc_cards
  SET 
    linked_card_id = p_new_linked_card_id,
    updated_at = NOW()
  WHERE id = p_nfc_card_id;

  RETURN jsonb_build_object(
    'success', true,
    'card_id', p_nfc_card_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- 6. 驗證設置
-- 檢查函數是否創建成功
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('handle_nfc_tap', 'register_nfc_card', 'change_nfc_linked_card');

-- 測試 handle_nfc_tap 函數
SELECT handle_nfc_tap('TEST123456', '127.0.0.1', 'Test User Agent');
