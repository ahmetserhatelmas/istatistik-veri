-- Maç Sonucu 1 / X / 2 sütunlarında ilike '%...%' aramasını hızlandırmak (isteğe bağlı).
-- Büyük tabloda seq scan + zaman aşımını azaltır.
--
-- Supabase SQL Editor tüm betiği TEK TRANSACTION’da çalıştırır → CONCURRENTLY kullanılamaz (25001).
-- Bu dosya normal CREATE INDEX kullanır (kısa süre yazma kilidi olabilir).
-- Kesinti istemezseniz: sql/add-matches-ms-odds-trgm-indexes-concurrent.sql (psql, her satır ayrı oturum).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_matches_ms1_trgm ON public.matches USING gin (ms1 gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_matches_msx_trgm ON public.matches USING gin (msx gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_matches_ms2_trgm ON public.matches USING gin (ms2 gin_trgm_ops);
