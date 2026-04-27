-- Lig / sezon / bookmaker ID jokerli arama: sayısal sütun; PostgREST ILIKE doğrudan integer üzerinde kullanılamaz.
-- API: t1i_arama (sql/add-matches-t1i-t2i-arama-columns.sql) ile aynı desen — metin sütun + ILIKE; değer 5 hane lpad (UI *? uyumu).
-- Çalıştırdıktan sonra kod sonek görünümü kullanıyorsanız: sql/create-matches-suffix-view.sql ile yenileyin (m.* güncellenir).
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ZAMAN AŞIMI / "Failed to fetch" (Supabase SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════
-- • Panel tarayıcıdan uzun süren DDL isteğini HTTP ile keser; Postgres hâlâ çalışıyor olabilir.
-- • Çözüm: doğrudan Postgres (psql veya "Session pooler" / port 5432 bağlantı dizesi). Transaction pooler DDL için uygun değildir.
-- • Tek ALTER ile 4 GENERATED STORED sütunu: tablo üzerinde uzun süren tek bir yeniden yazım. Zaman aşımı alıyorsanız
--   aynı işi DÖRT AYRI dosyada deneyin (her biri yine tabloyu yeniden yazar; toplam süre uzayabilir ama ara istekleri kısaltır):
--       sql/add-matches-integer-id-arama-columns-01-lig_id.sql
--       sql/add-matches-integer-id-arama-columns-02-alt_lig_id.sql
--       sql/add-matches-integer-id-arama-columns-03-sezon_id.sql
--       sql/add-matches-integer-id-arama-columns-04-bookmaker_id.sql
--   Sırayla çalıştırın; biri "column already exists" derse o adımı atlayıp devam edin.
--
-- Tek seferde (tercih — Postgres bir kez heap rewrite yapar):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/add-matches-integer-id-arama-columns.sql
--
-- SQL Editor’de "Error: Failed to fetch (api.supabase.com)" → tarayıcı/ağ veya panel zaman aşımı; yukarıdaki psql
-- yolu doğrudan Postgres’e bağlanır ve bu hatayı baypas eder.

SET statement_timeout = 0;
SET lock_timeout = '10min';

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS lig_id_arama text GENERATED ALWAYS AS (
    CASE WHEN lig_id IS NULL THEN '' ELSE lpad(lig_id::text, 5, '0') END
  ) STORED,
  ADD COLUMN IF NOT EXISTS alt_lig_id_arama text GENERATED ALWAYS AS (
    CASE WHEN alt_lig_id IS NULL THEN '' ELSE lpad(alt_lig_id::text, 5, '0') END
  ) STORED,
  ADD COLUMN IF NOT EXISTS sezon_id_arama text GENERATED ALWAYS AS (
    CASE WHEN sezon_id IS NULL THEN '' ELSE lpad(sezon_id::text, 5, '0') END
  ) STORED,
  ADD COLUMN IF NOT EXISTS bookmaker_id_arama text GENERATED ALWAYS AS (
    CASE WHEN bookmaker_id IS NULL THEN '' ELSE lpad(bookmaker_id::text, 5, '0') END
  ) STORED;

COMMENT ON COLUMN public.matches.lig_id_arama IS 'API: cf_lig_id jokerli — lig_id 5 hane soldan 0.';
COMMENT ON COLUMN public.matches.alt_lig_id_arama IS 'API: cf_alt_lig_id jokerli — alt_lig_id 5 hane soldan 0.';
COMMENT ON COLUMN public.matches.sezon_id_arama IS 'API: cf_sezon_id jokerli — sezon_id 5 hane soldan 0.';
COMMENT ON COLUMN public.matches.bookmaker_id_arama IS 'API: cf_bookmaker_id jokerli — bookmaker_id 5 hane soldan 0.';
