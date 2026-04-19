-- RPC: saat_arama indekslerini düşürür. Dev server/diğer bağlantıların aldığı
-- okuma kilidi yüzünden doğrudan DROP INDEX komutu Supabase HTTP proxy'sinin
-- 60sn timeout'una takılıyordu. RPC, statement_timeout=0 + lock_timeout=5min ile
-- kilit beklese bile kesintiye uğramaz.
--
-- Çalıştırma: node scripts/drop-saat-arama-indexes.mjs (aşağıda) ya da doğrudan
-- SQL Editor'de RPC'yi oluştur, sonra REST endpoint'inden çağır.

CREATE OR REPLACE FUNCTION public.drop_saat_arama_indexes()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = 0
SET lock_timeout = '5min'
AS $$
BEGIN
  DROP INDEX IF EXISTS public.idx_matches_saat_arama_trgm;
  DROP INDEX IF EXISTS public.idx_matches_saat_arama_btree;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.drop_saat_arama_indexes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.drop_saat_arama_indexes() TO service_role;
