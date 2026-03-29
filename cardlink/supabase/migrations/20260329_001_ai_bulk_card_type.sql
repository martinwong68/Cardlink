-- Migration: Add 'bulk_import' to ai_action_cards.card_type CHECK constraint
-- This supports the new document-processing workflow where multiple items
-- are imported from a single uploaded document.

ALTER TABLE ai_action_cards
  DROP CONSTRAINT IF EXISTS ai_action_cards_card_type_check;

ALTER TABLE ai_action_cards
  ADD CONSTRAINT ai_action_cards_card_type_check
  CHECK (card_type IN (
    'expense',
    'invoice',
    'journal_entry',
    'payment',
    'stock_adjustment',
    'product',
    'purchase_order',
    'sale',
    'lead',
    'contact',
    'bulk_import'
  ));
