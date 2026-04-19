-- Tüm tabloyu tek seferde günceller. HTTP timeout olsa da DB işlemeye devam eder.
-- statement_timeout = 0 olduğu için süresiz çalışır.

CREATE OR REPLACE FUNCTION public.backfill_saat_arama_all()
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
   WHERE saat IS NOT NULL
     AND saat_arama IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_saat_arama_all() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_saat_arama_all() TO service_role;
