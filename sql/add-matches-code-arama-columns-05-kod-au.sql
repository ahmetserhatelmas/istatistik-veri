-- Parça 5/5
SET statement_timeout = 0;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS kod_au_arama text GENERATED ALWAYS AS (COALESCE(kod_au::text, '')) STORED;

-- İsteğe bağlı (pg_trgm yüklüyse; ayrı çalıştırın):
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_id_arama_trgm ON public.matches USING gin (id_arama gin_trgm_ops);
