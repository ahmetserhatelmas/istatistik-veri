-- Parça 3/5
SET statement_timeout = 0;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS kod_iy_arama text GENERATED ALWAYS AS (COALESCE(kod_iy::text, '')) STORED;
