-- ═══════════════════════════════════════════════════════════════════════════
-- KOD* son N hane (ks_any_*): indeksli arama — tüm maçlar, eksik veri yok.
--
-- Önceki tam tarama (jsonb_each her istek) zaman aşımına düşer. Çözüm:
--   • match_raw_kod_suffix: her maç için n=2..10 ve o maçtaki herhangi bir KOD*
--     sayısal değerinin son n hanesi (suffix) satır olarak saklanır.
--   • get_matches_by_raw_kod_suffix: yalnızca bu tablo + (n,suffix) indeksi.
--   • Trigger: matches INSERT/UPDATE raw_data → satırlar yenilenir.
--
-- Kurulum sırası:
--   1) Bu dosyanın tamamını Supabase SQL Editor’de çalıştırın.
--   2) Mevcut satırlar: sql/backfill-match-raw-kod-suffix.sql yönergeleri veya
--      `npm run backfill:kod-suffix` (parçalı RPC; tek INSERT timeout verir).
--
-- Supabase “Potential issues” penceresi çıkarsa:
--   • Yeşil: “Run and enable RLS” — önerilen. service_role RLS’yi atlar; Next.js API’niz
--     SUPABASE_SERVICE_ROLE_KEY kullandığı için RPC / tetikleyici çalışmaya devam eder.
--   • Turuncu “Run without RLS” da teknik olarak çalışır; güvenlik için yeşili tercih edin.
-- ═══════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_matches_match_raw_kod_suffix ON public.matches;
DROP FUNCTION IF EXISTS public.matches_refresh_match_raw_kod_suffix() CASCADE;
DROP TABLE IF EXISTS public.match_raw_kod_suffix CASCADE;
DROP FUNCTION IF EXISTS public.matches_raw_kod_numeric_values(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.get_matches_by_raw_kod_suffix(bigint, integer);
DROP FUNCTION IF EXISTS public.get_matches_by_raw_kod_suffix(bigint, integer, date, date);

-- raw_data içinden sayısal KOD* değerleri (üst + bir seviye iç nesne).
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
  ) y
  WHERE y.nv IS NOT NULL AND y.nv <= 9223372036854775807::numeric;
$$;

CREATE TABLE public.match_raw_kod_suffix (
  match_id bigint NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  n smallint NOT NULL CHECK (n >= 2 AND n <= 10),
  suffix bigint NOT NULL,
  PRIMARY KEY (match_id, n, suffix)
);

CREATE INDEX idx_match_raw_kod_suffix_n_suffix
  ON public.match_raw_kod_suffix (n, suffix);

ALTER TABLE public.match_raw_kod_suffix ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.match_raw_kod_suffix IS
  'KOD* ham alanlarından türetilen son n hane; get_matches_by_raw_kod_suffix indeksli okuma.';

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

CREATE TRIGGER trg_matches_match_raw_kod_suffix
  AFTER INSERT OR UPDATE OF raw_data ON public.matches
  FOR EACH ROW
  EXECUTE PROCEDURE public.matches_refresh_match_raw_kod_suffix();

CREATE OR REPLACE FUNCTION public.get_matches_by_raw_kod_suffix(
  p_suffix bigint,
  p_n integer,
  p_tarih_from date DEFAULT NULL,
  p_tarih_to date DEFAULT NULL
)
RETURNS bigint[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r bigint[];
  index_populated boolean;
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);

  -- İndeks tablosu doluysa hızlı yol; boşsa (backfill henüz yapılmadı) eski jsonb_each yolu.
  SELECT EXISTS (SELECT 1 FROM public.match_raw_kod_suffix LIMIT 1)
  INTO index_populated;

  IF index_populated THEN
    SELECT COALESCE(array_agg(DISTINCT j.id), ARRAY[]::bigint[])
    INTO r
    FROM (
      SELECT mrs.match_id AS id
      FROM public.match_raw_kod_suffix mrs
      INNER JOIN (
        SELECT
          id,
          CASE
            WHEN tarih IS NULL THEN NULL::date
            WHEN pg_typeof(tarih)::regtype::text IN (
              'date', 'timestamp without time zone', 'timestamp with time zone'
            ) THEN (tarih::timestamp)::date
            WHEN trim(tarih::text) ~ '^\d{4}-\d{2}-\d{2}'
              THEN left(trim(tarih::text), 10)::date
            WHEN trim(tarih::text) ~ '^\d{2}\.\d{2}\.\d{4}'
              THEN to_date(left(trim(tarih::text), 10), 'DD.MM.YYYY')
            ELSE NULL::date
          END AS tarih_d
        FROM public.matches
      ) mt ON mt.id = mrs.match_id
      WHERE mrs.n = p_n::smallint
        AND mrs.suffix = p_suffix
        AND (p_tarih_from IS NULL OR (mt.tarih_d IS NOT NULL AND mt.tarih_d >= p_tarih_from))
        AND (p_tarih_to IS NULL OR (mt.tarih_d IS NOT NULL AND mt.tarih_d <= p_tarih_to))
    ) j;
  ELSE
    -- Fallback: doğrudan jsonb_each tarama (backfill bitmeden geçici).
    SELECT COALESCE(array_agg(DISTINCT s.id), ARRAY[]::bigint[])
    INTO r
    FROM (
      SELECT DISTINCT m.id
      FROM (
        SELECT b.id, b.raw_data
        FROM (
          SELECT
            id,
            raw_data,
            CASE
              WHEN tarih IS NULL THEN NULL::date
              WHEN pg_typeof(tarih)::regtype::text IN (
                'date', 'timestamp without time zone', 'timestamp with time zone'
              ) THEN (tarih::timestamp)::date
              WHEN trim(tarih::text) ~ '^\d{4}-\d{2}-\d{2}'
                THEN left(trim(tarih::text), 10)::date
              WHEN trim(tarih::text) ~ '^\d{2}\.\d{2}\.\d{4}'
                THEN to_date(left(trim(tarih::text), 10), 'DD.MM.YYYY')
              ELSE NULL::date
            END AS tarih_d
          FROM public.matches
          WHERE raw_data IS NOT NULL
            AND jsonb_typeof(raw_data) = 'object'
        ) b
        WHERE (p_tarih_from IS NULL OR (b.tarih_d IS NOT NULL AND b.tarih_d >= p_tarih_from))
          AND (p_tarih_to IS NULL OR (b.tarih_d IS NOT NULL AND b.tarih_d <= p_tarih_to))
          -- Tarih verilmemişse yükü azaltmak için son 18 ay (backfill bitince bu dal kullanılmaz).
          AND (
            (p_tarih_from IS NOT NULL OR p_tarih_to IS NOT NULL)
            OR b.tarih_d >= (CURRENT_DATE - INTERVAL '540 days')
          )
      ) m
      CROSS JOIN LATERAL (
        SELECT e.key, e.value FROM jsonb_each(m.raw_data) AS e
        UNION ALL
        SELECT e2.key, e2.value
        FROM jsonb_each(m.raw_data) AS e1
        CROSS JOIN LATERAL jsonb_each(e1.value) AS e2
        WHERE jsonb_typeof(e1.value) = 'object'
      ) AS kv
      WHERE trim(kv.key) ~* '^kod'
        AND (
          (
            jsonb_typeof(kv.value) = 'number'
            AND (abs(trunc((kv.value #>> '{}')::numeric))::bigint
                 % (power(10::numeric, p_n))::bigint) = p_suffix
          ) OR (
            jsonb_typeof(kv.value) = 'string'
            AND trim(both from kv.value #>> '{}') ~ '^-?[0-9]+$'
            AND (abs(trim(both from kv.value #>> '{}')::bigint)
                 % (power(10::numeric, p_n))::bigint) = p_suffix
          )
        )
    ) s;
  END IF;

  RETURN COALESCE(r, ARRAY[]::bigint[]);
END;
$$;

-- Doğrudan tablo erişimi yalnız service_role (istemci anon bu tabloyu kullanmıyor).
REVOKE ALL ON TABLE public.match_raw_kod_suffix FROM PUBLIC;
REVOKE ALL ON TABLE public.match_raw_kod_suffix FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE, UPDATE ON public.match_raw_kod_suffix TO service_role;

REVOKE ALL ON FUNCTION public.matches_raw_kod_numeric_values(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.matches_raw_kod_numeric_values(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.matches_raw_kod_numeric_values(jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.matches_refresh_match_raw_kod_suffix() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.matches_refresh_match_raw_kod_suffix() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.matches_refresh_match_raw_kod_suffix() TO service_role;

REVOKE ALL ON FUNCTION public.get_matches_by_raw_kod_suffix(bigint, integer, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_matches_by_raw_kod_suffix(bigint, integer, date, date) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_matches_by_raw_kod_suffix(bigint, integer, date, date)
  TO service_role;

-- Parçalı backfill (SQL Editor / API timeout’undan kaçınır).
CREATE OR REPLACE FUNCTION public.backfill_match_raw_kod_suffix_range(p_lo bigint, p_hi bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ins bigint;
BEGIN
  PERFORM set_config('statement_timeout', '600000', true);

  INSERT INTO public.match_raw_kod_suffix (match_id, n, suffix)
  SELECT DISTINCT
    m.id,
    g.n::smallint,
    (v.val % (power(10::numeric, g.n))::bigint) AS suffix
  FROM public.matches m
  CROSS JOIN LATERAL public.matches_raw_kod_numeric_values(m.raw_data) AS v
  CROSS JOIN generate_series(2, 10) AS g(n)
  WHERE m.id BETWEEN p_lo AND p_hi
    AND m.raw_data IS NOT NULL
    AND jsonb_typeof(m.raw_data) = 'object'
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS ins = ROW_COUNT;
  RETURN ins;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_match_raw_kod_suffix_range(bigint, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.backfill_match_raw_kod_suffix_range(bigint, bigint) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_match_raw_kod_suffix_range(bigint, bigint) TO service_role;

-- Keyset backfill: yalnızca gerçek satırlar (count << max(id) iken id aralığı taramasından çok daha az iş).
CREATE OR REPLACE FUNCTION public.backfill_match_raw_kod_suffix_keyset(
  p_after bigint,
  p_limit integer
)
RETURNS TABLE (next_cursor bigint, rows_inserted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mx bigint;
  cnt bigint;
  nbatch bigint;
BEGIN
  PERFORM set_config('statement_timeout', '600000', true);

  DROP TABLE IF EXISTS _bf_match_raw_kod_keyset;
  CREATE TEMP TABLE _bf_match_raw_kod_keyset
  ON COMMIT DROP AS
  SELECT id, raw_data
  FROM public.matches
  WHERE id > p_after
    AND raw_data IS NOT NULL
    AND jsonb_typeof(raw_data) = 'object'
  ORDER BY id ASC
  LIMIT p_limit;

  SELECT COUNT(*) INTO nbatch FROM _bf_match_raw_kod_keyset;
  IF nbatch = 0 THEN
    RETURN QUERY SELECT NULL::bigint, 0::bigint;
    RETURN;
  END IF;

  SELECT MAX(id) INTO mx FROM _bf_match_raw_kod_keyset;

  INSERT INTO public.match_raw_kod_suffix (match_id, n, suffix)
  SELECT DISTINCT
    m.id,
    g.n::smallint,
    (v.val % (power(10::numeric, g.n))::bigint) AS suffix
  FROM _bf_match_raw_kod_keyset m
  CROSS JOIN LATERAL public.matches_raw_kod_numeric_values(m.raw_data) AS v
  CROSS JOIN generate_series(2, 10) AS g(n)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS cnt = ROW_COUNT;

  RETURN QUERY SELECT mx, cnt;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_match_raw_kod_suffix_keyset(bigint, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.backfill_match_raw_kod_suffix_keyset(bigint, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_match_raw_kod_suffix_keyset(bigint, integer) TO service_role;
