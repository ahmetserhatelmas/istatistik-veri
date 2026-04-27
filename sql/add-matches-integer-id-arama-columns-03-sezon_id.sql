-- 3/4 — sezon_id_arama
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/add-matches-integer-id-arama-columns-03-sezon_id.sql
SET statement_timeout = 0;
SET lock_timeout = '10min';

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS sezon_id_arama text GENERATED ALWAYS AS (
    CASE WHEN sezon_id IS NULL THEN '' ELSE lpad(sezon_id::text, 5, '0') END
  ) STORED;

COMMENT ON COLUMN public.matches.sezon_id_arama IS 'API: cf_sezon_id jokerli — sezon_id 5 hane soldan 0.';
