-- 2/4 — alt_lig_id_arama
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/add-matches-integer-id-arama-columns-02-alt_lig_id.sql
SET statement_timeout = 0;
SET lock_timeout = '10min';

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS alt_lig_id_arama text GENERATED ALWAYS AS (
    CASE WHEN alt_lig_id IS NULL THEN '' ELSE lpad(alt_lig_id::text, 5, '0') END
  ) STORED;

COMMENT ON COLUMN public.matches.alt_lig_id_arama IS 'API: cf_alt_lig_id jokerli — alt_lig_id 5 hane soldan 0.';
