-- Parça 2/5
SET statement_timeout = 0;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS kod_ms_arama text GENERATED ALWAYS AS (COALESCE(kod_ms::text, '')) STORED;

COMMENT ON COLUMN public.matches.kod_ms_arama IS 'API: jokerli MS kodu ilike.';
