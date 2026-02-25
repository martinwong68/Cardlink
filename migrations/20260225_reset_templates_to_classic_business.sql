-- Temporarily keep only classic-business template

UPDATE public.business_cards
SET template = 'classic-business'
WHERE template IS DISTINCT FROM 'classic-business';

ALTER TABLE public.business_cards
  ALTER COLUMN template SET DEFAULT 'classic-business';
