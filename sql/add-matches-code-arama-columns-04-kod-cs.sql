-- Parça 4/5
SET statement_timeout = 0;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS kod_cs_arama text GENERATED ALWAYS AS (COALESCE(kod_cs::text, '')) STORED;
