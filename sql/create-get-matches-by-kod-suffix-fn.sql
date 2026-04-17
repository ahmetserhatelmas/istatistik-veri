-- Herhangi bir KOD sütununun son N hanesi verilen sayıya eşit olan maçların ID'lerini döndürür.
-- Kullanım: SELECT get_matches_by_kod_suffix(852, 3);  -- son 3 hanesi 852 olan maçlar
CREATE OR REPLACE FUNCTION get_matches_by_kod_suffix(p_suffix bigint, p_n integer)
RETURNS bigint[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::bigint[])
  FROM matches
  WHERE
    (kod_ms IS NOT NULL AND ABS(kod_ms) % POWER(10, p_n)::bigint = p_suffix) OR
    (kod_iy IS NOT NULL AND ABS(kod_iy) % POWER(10, p_n)::bigint = p_suffix) OR
    (kod_cs IS NOT NULL AND ABS(kod_cs) % POWER(10, p_n)::bigint = p_suffix) OR
    (kod_au IS NOT NULL AND ABS(kod_au) % POWER(10, p_n)::bigint = p_suffix);
$$;
