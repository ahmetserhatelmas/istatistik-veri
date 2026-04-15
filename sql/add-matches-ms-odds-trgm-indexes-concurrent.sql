-- Aynı indeksler, tabloya uzun süre yazma kilidi istemeyen ortam için (ör. üretim).
-- CONCURRENTLY transaction içinde ÇALIŞMAZ — her komutu psql’de TEK TEK yapıştırıp çalıştırın
-- (bir önceki bitmeden sonrakine geçmeyin). Supabase SQL Editor genelde tek transaction’dır; bu dosyayı orada ÇALIŞTIRMA.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_ms1_trgm ON public.matches USING gin (ms1 gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_msx_trgm ON public.matches USING gin (msx gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_ms2_trgm ON public.matches USING gin (ms2 gin_trgm_ops);
