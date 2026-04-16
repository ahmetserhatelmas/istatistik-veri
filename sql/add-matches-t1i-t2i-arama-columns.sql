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
  ADD COLUMN IF NOT EXISTS t1i_arama text GENERATED ALWAYS AS (t1i::text) STORED,
  ADD COLUMN IF NOT EXISTS t2i_arama text GENERATED ALWAYS AS (t2i::text) STORED;

COMMENT ON COLUMN public.matches.t1i_arama IS 'API: bidir_takimid (ev) jokerli arama — t1i metin.';
COMMENT ON COLUMN public.matches.t2i_arama IS 'API: bidir_takimid (dep) jokerli arama — t2i metin.';
