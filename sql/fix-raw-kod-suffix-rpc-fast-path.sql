-- ═══════════════════════════════════════════════════════════════════════════
-- get_matches_by_raw_kod_suffix: hızlı yol optimizasyonu
--
-- Sorun:
--   İndeksli yol bile matches tablosunu tarih_d hesabı için tam tarar (400k satır,
--   pg_typeof() her satırda çağrılır) → JOIN'e rağmen timeout.
--
-- Çözüm:
--   1) Tarih filtresi YOK → sadece match_raw_kod_suffix(n, suffix) indeksini kullan.
--      matches ile JOIN yok, ≈ anlık.
--   2) Tarih filtresi VAR → basit DATE_TRUNC ile matches.tarih cast, pg_typeof() yok.
--
-- Çalıştırma: Supabase SQL Editor'de bir kez çalıştırın.
-- ═══════════════════════════════════════════════════════════════════════════

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

  SELECT EXISTS (SELECT 1 FROM public.match_raw_kod_suffix LIMIT 1)
  INTO index_populated;

  IF index_populated THEN

    IF p_tarih_from IS NULL AND p_tarih_to IS NULL THEN
      -- ── Hızlı yol: tarih filtresi yok — sadece (n, suffix) indeksi ──────
      SELECT COALESCE(array_agg(DISTINCT mrs.match_id), ARRAY[]::bigint[])
      INTO r
      FROM public.match_raw_kod_suffix mrs
      WHERE mrs.n = p_n::smallint
        AND mrs.suffix = p_suffix;

    ELSE
      -- ── Tarih filtreli yol: basit cast, pg_typeof() yok ──────────────────
      SELECT COALESCE(array_agg(DISTINCT mrs.match_id), ARRAY[]::bigint[])
      INTO r
      FROM public.match_raw_kod_suffix mrs
      INNER JOIN public.matches m ON m.id = mrs.match_id
      WHERE mrs.n = p_n::smallint
        AND mrs.suffix = p_suffix
        AND (
          p_tarih_from IS NULL
          OR (m.tarih IS NOT NULL
              AND (m.tarih::text)::date >= p_tarih_from)
        )
        AND (
          p_tarih_to IS NULL
          OR (m.tarih IS NOT NULL
              AND (m.tarih::text)::date <= p_tarih_to)
        );
    END IF;

  ELSE
    -- ── Fallback: indeks tablosu boşsa jsonb_each tarama (backfill bitmeden) ──
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
        AND upper(trim(kv.key)) NOT IN (
          'KODIG','KODIKYS',
          'KODIYAU05','KODIYAU15','KODIYAU25',
          'KODIYMS','KODKG',
          'KODMSAU15','KODMSAU25','KODMSAU35','KODMSAU45',
          'KODSK','KODTC','KODTG',
          'KODDAU05','KODDAU15','KODDAU25','KODDAU35','KODDCGOY',
          'KODEAU05','KODEAU15','KODEAU25','KODEAU35',
          'KODHMS11','KODHMS12','KODHMS21','KODHMS22'
        )
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

-- İzinler (değişmedi, yenileme için)
REVOKE ALL ON FUNCTION public.get_matches_by_raw_kod_suffix(bigint, integer, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_matches_by_raw_kod_suffix(bigint, integer, date, date) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_matches_by_raw_kod_suffix(bigint, integer, date, date)
  TO service_role;
