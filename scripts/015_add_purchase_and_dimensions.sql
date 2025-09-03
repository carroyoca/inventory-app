-- Add purchase metadata and physical dimensions to inventory_items
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS year_of_purchase SMALLINT CHECK (year_of_purchase IS NULL OR year_of_purchase >= 1950),
  ADD COLUMN IF NOT EXISTS purchase_currency TEXT CHECK (purchase_currency IN ('USD','EUR','ARS')),
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS price_eur_at_purchase NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS length_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS width_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(10,2);

-- Optional: indexes for filtering/sorting
CREATE INDEX IF NOT EXISTS idx_inventory_items_year_of_purchase ON public.inventory_items(year_of_purchase);
CREATE INDEX IF NOT EXISTS idx_inventory_items_purchase_currency ON public.inventory_items(purchase_currency);
