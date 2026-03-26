-- RPC to atomically increment purchased_card_slots on profiles
-- Returns the new slot count after increment
CREATE OR REPLACE FUNCTION increment_purchased_card_slots(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count integer;
BEGIN
  UPDATE profiles
  SET purchased_card_slots = COALESCE(purchased_card_slots, 0) + 1
  WHERE id = p_user_id
  RETURNING purchased_card_slots INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;
