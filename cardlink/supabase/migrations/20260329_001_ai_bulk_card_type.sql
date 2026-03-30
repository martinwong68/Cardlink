-- Migration: Expand ai_action_cards.card_type CHECK constraint
-- Adds new card types for document-processing workflow while keeping
-- all original values so existing rows are not violated.

ALTER TABLE ai_action_cards
  DROP CONSTRAINT IF EXISTS ai_action_cards_card_type_check;

ALTER TABLE ai_action_cards
  ADD CONSTRAINT ai_action_cards_card_type_check
  CHECK (card_type IN (
    -- original values
    'journal_entry',
    'invoice',
    'inventory_update',
    'expense',
    'navigation',
    'report',
    'general',
    -- new values
    'payment',
    'stock_adjustment',
    'product',
    'purchase_order',
    'sale',
    'lead',
    'contact',
    'bulk_import'
  ));
