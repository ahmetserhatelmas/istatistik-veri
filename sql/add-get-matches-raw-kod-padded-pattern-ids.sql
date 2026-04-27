-- Ham veri KOD* (KODHMS hariç) joker ön-filtresi: API’deki padRawKodNumericDisplay ile aynı mantık.
-- raw_data->>'KODIYMS' = '2072' iken tabloda 02072 gösterilir; LIKE '0%' eski yolda eşleşmezdi.
-- Çalıştır: Supabase SQL Editor (service_role / PostgREST şema önbelleği NOTIFY ile yenilenir).

CREATE OR REPLACE FUNCTION public.raw_json_kod_pad5_compare_text(j jsonb, k text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN j IS NULL OR k IS NULL OR NOT (j ? k) THEN ''
    WHEN NULLIF(btrim(j->>k), '') IS NULL THEN ''
    WHEN upper(k) LIKE 'KODHMS%' THEN btrim(j->>k)
    WHEN upper(k) = 'KODSK' AND btrim(j->>k) ~ '^[0-9]+$' AND length(btrim(j->>k)) < 8
      THEN lpad((btrim(j->>k))::bigint::text, 8, '0')
    WHEN upper(k) = 'KODSK' THEN btrim(j->>k)
    WHEN upper(k) NOT LIKE 'KOD%' THEN btrim(j->>k)
    WHEN btrim(j->>k) !~ '^[0-9]+$' THEN btrim(j->>k)
    WHEN length(btrim(j->>k)) >= 5 THEN btrim(j->>k)
    ELSE lpad((btrim(j->>k))::bigint::text, 5, '0')
  END;
$$;

COMMENT ON FUNCTION public.raw_json_kod_pad5_compare_text(jsonb, text) IS
  'raw_data KOD* (KODHMS ham): KODSK saf rakam <8 → 8 hane; diğer KOD* <5 → 5 hane — ham veri cf joker filtresi ile uyum.';

CREATE OR REPLACE FUNCTION public.get_matches_raw_kod_padded_pattern_ids(
  json_key text,
  pattern text,
  case_insensitive boolean DEFAULT false
)
RETURNS bigint[]
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(array_agg(m.id), '{}'::bigint[])
  FROM public.matches m
  WHERE public.raw_json_kod_pad5_compare_text(m.raw_data, json_key) <> ''
    AND CASE
      WHEN case_insensitive THEN public.raw_json_kod_pad5_compare_text(m.raw_data, json_key) ILIKE pattern
      ELSE public.raw_json_kod_pad5_compare_text(m.raw_data, json_key) LIKE pattern
    END;
$$;

COMMENT ON FUNCTION public.get_matches_raw_kod_padded_pattern_ids(text, text, boolean) IS
  'Ham veri KOD* (KODHMS hariç) basit LIKE/ILIKE deseni — padlenmiş metin üzerinde id listesi (ORDER BY yok).';

GRANT EXECUTE ON FUNCTION public.raw_json_kod_pad5_compare_text(jsonb, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_matches_raw_kod_padded_pattern_ids(text, text, boolean) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
