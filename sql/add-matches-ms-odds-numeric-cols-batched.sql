-- Maç sonucu ms1/msx/ms2 → ms1_n / msx_n / ms2_n (double precision)
-- Büyük tabloda GENERATED STORED tek seferde zaman aşımı verir; bu dosya parçalı doldurur.
--
-- 1) Bu dosyanın tamamını bir kez çalıştırın (fonksiyon + sütunlar + tetik).
-- 2) Aşağıdaki SELECT … backfill_ms_n_range … komutlarını id aralıklarıyla TEK TEK
--    çalıştırın (her biri ~10–60 sn). Bitene kadar satır sayısı 0 olana kadar devam.
-- 3) Son: indeksler + ANALYZE; ardından sql/create-matches-suffix-view.sql yenileyin.

SET statement_timeout = '120s';

CREATE OR REPLACE FUNCTION public.matches_odd_text_to_n(s text)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN s IS NULL THEN NULL::double precision
    WHEN btrim(s) ~ '^[0-9]+([.,][0-9]+)?$' THEN replace(btrim(s), ',', '.')::double precision
    ELSE NULL::double precision
  END;
$$;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS ms1_n double precision;
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS msx_n double precision;
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS ms2_n double precision;

COMMENT ON COLUMN public.matches.ms1_n IS 'MS1 sayısal; cf_ms1 karşılaştırma. Tetik + backfill.';
COMMENT ON COLUMN public.matches.msx_n IS 'MSX sayısal; cf_msx karşılaştırma.';
COMMENT ON COLUMN public.matches.ms2_n IS 'MS2 sayısal; cf_ms2 karşılaştırma.';

-- Bir id aralığını doldurur; dönüş: güncellenen satır sayısı
CREATE OR REPLACE FUNCTION public.backfill_ms_n_range(p_lo bigint, p_hi bigint)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE n bigint;
BEGIN
  UPDATE public.matches m
  SET
    ms1_n = public.matches_odd_text_to_n(m.ms1::text),
    msx_n = public.matches_odd_text_to_n(m.msx::text),
    ms2_n = public.matches_odd_text_to_n(m.ms2::text)
  WHERE m.id >= p_lo AND m.id < p_hi;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.matches_sync_ms_n()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ms1_n := public.matches_odd_text_to_n(NEW.ms1::text);
  NEW.msx_n := public.matches_odd_text_to_n(NEW.msx::text);
  NEW.ms2_n := public.matches_odd_text_to_n(NEW.ms2::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matches_sync_ms_n ON public.matches;
CREATE TRIGGER trg_matches_sync_ms_n
  BEFORE INSERT OR UPDATE OF ms1, msx, ms2 ON public.matches
  FOR EACH ROW
  EXECUTE PROCEDURE public.matches_sync_ms_n();

-- ── Elle parça örnekleri (min/max kendi tablonuza göre değiştirin) ─────────────
-- SELECT min(id), max(id) FROM public.matches;
-- SELECT public.backfill_ms_n_range(1, 200001);
-- SELECT public.backfill_ms_n_range(200001, 400001);
-- … max(id)’e kadar devam.

-- İndeksler: sql/add-matches-ms-odds-numeric-cols-indexes.sql (backfill bittikten sonra).
