-- Add marketplace listing fields to inventory_items
-- Safe to run multiple times

ALTER TABLE public.inventory_items 
  ADD COLUMN IF NOT EXISTS listing_title TEXT,
  ADD COLUMN IF NOT EXISTS listing_description TEXT;

COMMENT ON COLUMN public.inventory_items.listing_title IS 'Title for marketplace listing (AI-assisted)';
COMMENT ON COLUMN public.inventory_items.listing_description IS 'Body/description for marketplace listing (AI-assisted)';

