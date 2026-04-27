-- Şema kod kolonları (id 7 hane, kod_ms / kod_iy / kod_cs / kod_au 5 hane): UI `*23` → LIKE `%23`
-- padlenmiş metin üzerinde eşleşme (örn. kod_ms=4323 → 04323 ile sonu 23).
-- Ham raw_data KOD* için mevcut get_matches_raw_kod_padded_pattern_ids kullanılmaya devam eder.

CREATE OR REPLACE FUNCTION public.get_matches_schema_kod_padded_pattern_ids(
  col text,
  pattern text,
  case_insensitive boolean DEFAULT false
)
RETURNS bigint[]
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  pad int;
  sql text;
  res bigint[];
BEGIN
  IF col = 'id' THEN
    pad := 7;
  ELSIF col IN ('kod_ms', 'kod_iy', 'kod_cs', 'kod_au') THEN
    pad := 5;
  ELSE
    RETURN '{}'::bigint[];
  END IF;

  sql := format(
    $q$
    SELECT COALESCE(array_agg(s.id), '{}'::bigint[])
    FROM (
      SELECT m.id,
        CASE
          WHEN trim(m.%1$I::text) !~ '^[0-9]+$' THEN trim(m.%1$I::text)
          WHEN length(trim(m.%1$I::text)) >= %2$s THEN trim(m.%1$I::text)
          ELSE lpad((trim(m.%1$I::text))::bigint::text, %2$s, '0')
        END AS ptxt
      FROM public.matches m
      WHERE m.%1$I IS NOT NULL
    ) s
    WHERE s.ptxt <> ''
      AND CASE
        WHEN $1 THEN s.ptxt ILIKE $2
        ELSE s.ptxt LIKE $2
      END
    $q$,
    col,
    pad
  );

  EXECUTE sql INTO res USING case_insensitive, pattern;
  RETURN COALESCE(res, '{}'::bigint[]);
END;
$$;

COMMENT ON FUNCTION public.get_matches_schema_kod_padded_pattern_ids(text, text, boolean) IS
  'matches.id (7) ve kod_* (5) üzerinde padlenmiş metinle LIKE/ILIKE — UI sonek jokeri *23 vb.';

GRANT EXECUTE ON FUNCTION public.get_matches_schema_kod_padded_pattern_ids(text, text, boolean)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
