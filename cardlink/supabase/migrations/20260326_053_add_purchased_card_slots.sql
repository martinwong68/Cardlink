-- Add purchased_card_slots column to profiles for tracking namecard slot purchases ($8/mo each)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS purchased_card_slots integer NOT NULL DEFAULT 0;
