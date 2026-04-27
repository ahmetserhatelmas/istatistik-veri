-- 4/4 — bookmaker_id_arama
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/add-matches-integer-id-arama-columns-04-bookmaker_id.sql
SET statement_timeout = 0;
SET lock_timeout = '10min';

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS bookmaker_id_arama text GENERATED ALWAYS AS (
    CASE WHEN bookmaker_id IS NULL THEN '' ELSE lpad(bookmaker_id::text, 5, '0') END
  ) STORED;

COMMENT ON COLUMN public.matches.bookmaker_id_arama IS 'API: cf_bookmaker_id jokerli — bookmaker_id 5 hane soldan 0.';
