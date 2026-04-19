-- Aynı indeksler, CONCURRENTLY — tablo yazmaya açık kalır; TRANSACTION İÇİNDE ÇALIŞMAZ.
--
-- Supabase SQL Editor: Her CREATE INDEX satırını TEK BAŞINA yeni bir sorgu sekmesinde çalıştırmayı deneyin;
-- bazı ortamlarda yine transaction sarılır ve 25001 verir. O zaman psql kullanın:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_t1_trgm ON public.matches USING gin (t1 gin_trgm_ops);"
--   (her indeks için ayrı -c)
--
-- Önce: CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_t1_trgm
  ON public.matches USING gin (t1 gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_t2_trgm
  ON public.matches USING gin (t2 gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_lig_adi_trgm
  ON public.matches USING gin (lig_adi gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_lig_kodu_trgm
  ON public.matches USING gin (lig_kodu gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_alt_lig_adi_trgm
  ON public.matches USING gin (alt_lig_adi gin_trgm_ops);
