-- Add background image support for business cards

ALTER TABLE public.business_cards
  ADD COLUMN IF NOT EXISTS background_image_url text;

COMMENT ON COLUMN public.business_cards.background_image_url
  IS 'Public URL of the uploaded card background image.';
