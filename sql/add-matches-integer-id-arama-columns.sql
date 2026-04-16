-- Lig / sezon / bookmaker ID jokerli arama: sayısal sütun; PostgREST ILIKE doğrudan integer üzerinde kullanılamaz.
-- API: t1i_arama (sql/add-matches-t1i-t2i-arama-columns.sql) ile aynı desen — metin sütun + ILIKE.
-- Çalıştırdıktan sonra kod sonek görünümü kullanıyorsanız: sql/create-matches-suffix-view.sql ile yenileyin (m.* güncellenir).
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/add-matches-integer-id-arama-columns.sql
--
-- SQL Editor’de "Error: Failed to fetch (api.supabase.com)" → tarayıcı/ağ veya panel zaman aşımı; yukarıdaki psql
-- yolu doğrudan Postgres’e bağlanır ve bu hatayı baypas eder. Büyük tabloda ADD COLUMN uzun sürebilir.

SET statement_timeout = 0;
SET lock_timeout = '5min';

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS lig_id_arama text GENERATED ALWAYS AS (COALESCE(lig_id::text, '')) STORED,
  ADD COLUMN IF NOT EXISTS alt_lig_id_arama text GENERATED ALWAYS AS (COALESCE(alt_lig_id::text, '')) STORED,
  ADD COLUMN IF NOT EXISTS sezon_id_arama text GENERATED ALWAYS AS (COALESCE(sezon_id::text, '')) STORED,
  ADD COLUMN IF NOT EXISTS bookmaker_id_arama text GENERATED ALWAYS AS (COALESCE(bookmaker_id::text, '')) STORED;

COMMENT ON COLUMN public.matches.lig_id_arama IS 'API: cf_lig_id jokerli — lig_id metin.';
COMMENT ON COLUMN public.matches.alt_lig_id_arama IS 'API: cf_alt_lig_id jokerli — alt_lig_id metin.';
COMMENT ON COLUMN public.matches.sezon_id_arama IS 'API: cf_sezon_id jokerli — sezon_id metin.';
COMMENT ON COLUMN public.matches.bookmaker_id_arama IS 'API: cf_bookmaker_id jokerli — bookmaker_id metin.';
