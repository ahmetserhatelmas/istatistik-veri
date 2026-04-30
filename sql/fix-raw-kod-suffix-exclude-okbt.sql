-- ═══════════════════════════════════════════════════════════════════════════
-- KOD* son hane indeksi: raw_data OKBT kaynak anahtarlarını dışla
--
-- Sorun:
--   raw_data artık OKBT kaynak anahtarlarını içeriyor (KODIG, KODIYMS, vs.).
--   matches_raw_kod_numeric_values bu anahtarları da topluyor; match_raw_kod_suffix
--   şişiyor ve "son hane" araması yanlış maçları buluyor (400k gibi absürt sonuçlar).
--
-- Çözüm:
--   1) matches_raw_kod_numeric_values'a NOT IN filtresi ekle (27 OKBT anahtarı hariç).
--   2) Tetikleyiciyi yeniden bağla (aynı fonksiyonu kullanır; REPLACE yeterli).
--   3) match_raw_kod_suffix'teki kirli satırları sil.
--   4) Backfill'i yeniden çalıştır (npm run backfill:kod-suffix).
--
-- Çalıştırma sırası:
--   A) Bu dosyayı Supabase SQL Editor'de bir kez çalıştırın.
--   B) Ardından terminalde: npm run backfill:kod-suffix
--      (veya keyset RPC: sql/backfill-match-raw-kod-suffix.sql kılavuzuna bakın)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) Güncellenmiş yardımcı fonksiyon ────────────────────────────────────
-- OKBT raw kaynak anahtarları hariç (KODIG, KODIKYS, KODIYAU05 … KODHMS22).
-- Bu anahtarlar oyun kodu değil; basamak toplam hesabında INPUT olarak kullanılır.
CREATE OR REPLACE FUNCTION public.matches_raw_kod_numeric_values(p_raw jsonb)
RETURNS TABLE (val bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT y.nv::bigint AS val
  FROM (
    SELECT
      CASE
        WHEN jsonb_typeof(kv.value) = 'number' THEN
          abs(trunc((kv.value #>> '{}')::numeric))::numeric
        WHEN jsonb_typeof(kv.value) = 'string'
          AND trim(both from kv.value #>> '{}') ~ '^-?[0-9]+$' THEN
          abs(trim(both from kv.value #>> '{}')::numeric)
        ELSE NULL::numeric
      END AS nv
    FROM (
      SELECT p_raw AS pr
      WHERE p_raw IS NOT NULL AND jsonb_typeof(p_raw) = 'object'
    ) r
    CROSS JOIN LATERAL (
      SELECT e.key, e.value
      FROM jsonb_each(r.pr) AS e
      UNION ALL
      SELECT e2.key, e2.value
      FROM jsonb_each(r.pr) AS e1
      CROSS JOIN LATERAL jsonb_each(e1.value) AS e2
      WHERE jsonb_typeof(e1.value) = 'object'
    ) AS kv
    WHERE trim(kv.key) ~* '^kod'
      -- OKBT raw kaynak anahtarlarını dışla (oyun kodu değil, basamak formülü girdisi)
      AND upper(trim(kv.key)) NOT IN (
        'KODIG','KODIKYS',
        'KODIYAU05','KODIYAU15','KODIYAU25',
        'KODIYMS',
        'KODKG',
        'KODMSAU15','KODMSAU25','KODMSAU35','KODMSAU45',
        'KODSK','KODTC','KODTG',
        'KODDAU05','KODDAU15','KODDAU25','KODDAU35','KODDCGOY',
        'KODEAU05','KODEAU15','KODEAU25','KODEAU35',
        'KODHMS11','KODHMS12','KODHMS21','KODHMS22'
      )
  ) y
  WHERE y.nv IS NOT NULL AND y.nv <= 9223372036854775807::numeric;
$$;

-- ── 2) Tetikleyici: REPLACE yeterliydi; yine de açıkça yenile ─────────────
-- (Tetikleyici gövdesi değişmedi; sadece yukarıdaki fn güncellendiği için
--  bir sonraki raw_data UPDATE/INSERT artık temiz sonuçlar üretecek.)
CREATE OR REPLACE FUNCTION public.matches_refresh_match_raw_kod_suffix()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.raw_data IS NOT DISTINCT FROM NEW.raw_data THEN
    RETURN NEW;
  END IF;

  DELETE FROM public.match_raw_kod_suffix WHERE match_id = NEW.id;

  IF NEW.raw_data IS NULL OR jsonb_typeof(NEW.raw_data) <> 'object' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.match_raw_kod_suffix (match_id, n, suffix)
  SELECT DISTINCT
    NEW.id,
    g.n::smallint,
    (v.val % (power(10::numeric, g.n))::bigint) AS suffix
  FROM public.matches_raw_kod_numeric_values(NEW.raw_data) AS v
  CROSS JOIN generate_series(2, 10) AS g(n)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── 3) Tabloyu temizle (TRUNCATE — anında biter, DELETE gibi timeout vermez) ──
TRUNCATE TABLE public.match_raw_kod_suffix;

-- ANALYZE: planner istatistiklerini güncelle
ANALYZE public.match_raw_kod_suffix;

-- ── 4) Backfill ───────────────────────────────────────────────────────────
-- Tabloyu temizledikten sonra keyset backfill'i yeniden çalıştırın:
--
--   npm run backfill:kod-suffix
--
-- veya SQL Editor'de (küçük tablolar için):
--   SELECT public.backfill_match_raw_kod_suffix_keyset(0, 800);
--   -- next_cursor NULL olana kadar devam edin.
--
-- Bittikten sonra:
--   ANALYZE public.match_raw_kod_suffix;
--
-- ── Doğrulama ─────────────────────────────────────────────────────────────
-- Backfill sonrası OKBT anahtarı kalmadığını kontrol etmek için:
-- (match_raw_kod_suffix dolaylı tablo; doğrudan kontrol mümkün değil.)
-- Bunun yerine: tek bir maç için matches_raw_kod_numeric_values çağırın:
--   SELECT val FROM public.matches_raw_kod_numeric_values(
--     (SELECT raw_data FROM public.matches WHERE raw_data IS NOT NULL LIMIT 1)
--   );
-- Sonuçlar artık yalnızca gerçek oyun kodu değerlerini içermeli.
