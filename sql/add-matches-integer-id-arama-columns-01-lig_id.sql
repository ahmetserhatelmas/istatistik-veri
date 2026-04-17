-- 1/4 — lig_id_arama (GENERATED STORED; büyük tabloda dakikalar sürebilir)
-- Supabase SQL Editor "Failed to fetch" → istemci/HTTP zaman aşımı; psql ile çalıştırın:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/add-matches-integer-id-arama-columns-01-lig_id.sql
SET statement_timeout = 0;
SET lock_timeout = '10min';

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS lig_id_arama text GENERATED ALWAYS AS (COALESCE(lig_id::text, '')) STORED;

COMMENT ON COLUMN public.matches.lig_id_arama IS 'API: cf_lig_id jokerli — lig_id metin.';
