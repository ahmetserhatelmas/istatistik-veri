-- Not: İstemci ks_any_* filtresi artık `get_matches_by_raw_kod_suffix` (raw_data KOD*) kullanır.
-- Bu fonksiyon yalnızca kod_ms / kod_iy / kod_cs / kod_au tablo sütunları içindir (geriye dönük / el ile SQL).
-- Herhangi bir KOD sütununun son N hanesi verilen sayıya eşit olan maçların ID'lerini döndürür.
-- p_only_col NULL → kod_ms / kod_iy / kod_cs / kod_au birinde eşleşme yeterli.
-- p_only_col 'kod_ms' vb. → yalnız o sütunda aranır (elle MS son hane için).
-- Kullanım: SELECT get_matches_by_kod_suffix(852, 3, NULL);
CREATE OR REPLACE FUNCTION get_matches_by_kod_suffix(
  p_suffix bigint,
  p_n integer,
  p_only_col text DEFAULT NULL
)
RETURNS bigint[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::bigint[])
  FROM matches
  WHERE
    (
      p_only_col IS NULL
      AND (
        (kod_ms IS NOT NULL AND ABS(kod_ms) % POWER(10, p_n)::bigint = p_suffix) OR
        (kod_iy IS NOT NULL AND ABS(kod_iy) % POWER(10, p_n)::bigint = p_suffix) OR
        (kod_cs IS NOT NULL AND ABS(kod_cs) % POWER(10, p_n)::bigint = p_suffix) OR
        (kod_au IS NOT NULL AND ABS(kod_au) % POWER(10, p_n)::bigint = p_suffix)
      )
    )
    OR (
      p_only_col = 'kod_ms'
      AND kod_ms IS NOT NULL
      AND ABS(kod_ms) % POWER(10, p_n)::bigint = p_suffix
    )
    OR (
      p_only_col = 'kod_iy'
      AND kod_iy IS NOT NULL
      AND ABS(kod_iy) % POWER(10, p_n)::bigint = p_suffix
    )
    OR (
      p_only_col = 'kod_cs'
      AND kod_cs IS NOT NULL
      AND ABS(kod_cs) % POWER(10, p_n)::bigint = p_suffix
    )
    OR (
      p_only_col = 'kod_au'
      AND kod_au IS NOT NULL
      AND ABS(kod_au) % POWER(10, p_n)::bigint = p_suffix
    );
$$;
