-- Tarama modu "MAÇ ARA" (tarama_q): ILIKE '%kelime%' için pg_trgm GIN indeksleri.
--
-- Bu sürüm CONCURRENTLY KULLANMAZ — Supabase SQL Editor tüm script’i tek transaction’da çalıştırır;
-- CREATE INDEX CONCURRENTLY transaction içinde yasaktır (25001).
--
-- Trade-off: indeks oluşurken tabloda kısa süreli yazma kilidi (çok büyük tabloda uzun sürebilir).
-- Üretimde kilidi en aza indirmek için: add-matches-tarama-trgm-indexes-concurrent.sql + psql (her indeks ayrı, autocommit).
--
-- Önce: sql/enable-pg-trgm.sql veya aşağıdaki extension satırı.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_matches_t1_trgm
  ON public.matches USING gin (t1 gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_matches_t2_trgm
  ON public.matches USING gin (t2 gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_matches_lig_adi_trgm
  ON public.matches USING gin (lig_adi gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_matches_lig_kodu_trgm
  ON public.matches USING gin (lig_kodu gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_matches_alt_lig_adi_trgm
  ON public.matches USING gin (alt_lig_adi gin_trgm_ops);
