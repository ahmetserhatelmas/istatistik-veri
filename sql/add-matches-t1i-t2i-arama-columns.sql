-- T-ID (bidir_takimid) jokerli arama: t1i / t2i sayısal; PostgREST ILIKE doğrudan integer üzerinde kullanılamaz (42883).
-- API: sql/add-matches-code-arama-columns.sql ile aynı desen — metin sütun + ILIKE.
-- Çalıştırdıktan sonra kod sonek görünümü kullanıyorsanız: sql/create-matches-suffix-view.sql (DROP + CREATE) ile yenileyin (m.* güncellenir).
--
-- Supabase SQL Editor: "upstream timeout" — çoğunlukla HTTP/proxy süresi; statement_timeout yetmez.
-- Çözüm: aşağıdaki dosyayı yerelden psql ile çalıştırın (Proje ayarları → Database → Connection string):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/add-matches-t1i-t2i-arama-columns.sql
-- İki ayrı ALTER yerine tek ALTER ile iki sütun: tablo genelde tek tam tarama ile güncellenir.

SET statement_timeout = 0;
SET lock_timeout = '5min';

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS t1i_arama text GENERATED ALWAYS AS (
    CASE WHEN t1i IS NULL THEN '' ELSE lpad(t1i::text, 5, '0') END
  ) STORED,
  ADD COLUMN IF NOT EXISTS t2i_arama text GENERATED ALWAYS AS (
    CASE WHEN t2i IS NULL THEN '' ELSE lpad(t2i::text, 5, '0') END
  ) STORED;

COMMENT ON COLUMN public.matches.t1i_arama IS 'API: bidir_takimid (ev) jokerli — t1i 5 hane soldan 0 (UI *? ile uyum).';
COMMENT ON COLUMN public.matches.t2i_arama IS 'API: bidir_takimid (dep) jokerli — t2i 5 hane soldan 0 (UI *? ile uyum).';
