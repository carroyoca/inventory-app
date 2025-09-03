-- Create table for yearly/daily FX rates (EUR base)
CREATE TABLE IF NOT EXISTS public.fx_rates (
  rate_date DATE NOT NULL,
  base_currency TEXT NOT NULL DEFAULT 'EUR',
  currency TEXT NOT NULL,
  rate NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (rate_date, base_currency, currency)
);

CREATE INDEX IF NOT EXISTS idx_fx_rates_currency_date ON public.fx_rates(currency, rate_date);

-- RLS (optional): allow reads; writes via service role only
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY fx_rates_read ON public.fx_rates FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

