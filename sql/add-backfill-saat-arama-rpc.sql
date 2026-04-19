-- Optimize edilmiş backfill RPC: sadece NULL saat_arama satırlarını günceller.
-- id aralığı dar tutulur; PK index kullanımı garanti.
-- Kullanım: Node scripti bu fonksiyonu paralel çağırır.

CREATE OR REPLACE FUNCTION public.backfill_saat_arama_range(p_lo bigint, p_hi bigint)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = 0
SET lock_timeout = 0
AS $$
DECLARE v_count int;
BEGIN
  UPDATE public.matches
     SET saat_arama = to_char(saat, 'HH24:MI')
   WHERE id >= p_lo AND id < p_hi
     AND saat IS NOT NULL
     AND saat_arama IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_saat_arama_range(bigint, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_saat_arama_range(bigint, bigint) TO service_role;
