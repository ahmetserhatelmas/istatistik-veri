-- PARÇA 1/3 — Önce bunu çalıştırın.
-- Sonra: add-matches-okbt-basamak-generated-cols-02-cols-0-7.sql
-- En son: add-matches-okbt-basamak-generated-cols-03-cols-8-14.sql
-- Bittiğinde: create-matches-suffix-view.sql (kod sonek görünümü kullanıyorsanız).

CREATE OR REPLACE FUNCTION public.okbt_basamak_toplam(kod_iy text, idx integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
  d5 text;
  a int; b int; c int; di int; e int;
BEGIN
  IF kod_iy IS NULL OR btrim(kod_iy) = '' THEN
    RETURN NULL;
  END IF;
  digits := regexp_replace(kod_iy, '\D', '', 'g');
  IF length(digits) < 1 THEN
    RETURN NULL;
  END IF;
  IF length(digits) >= 5 THEN
    d5 := right(digits, 5);
  ELSE
    d5 := lpad(digits, 5, '0');
  END IF;
  a := substring(d5 from 1 for 1)::int;
  b := substring(d5 from 2 for 1)::int;
  c := substring(d5 from 3 for 1)::int;
  di := substring(d5 from 4 for 1)::int;
  e := substring(d5 from 5 for 1)::int;
  RETURN CASE idx
    WHEN 0 THEN a + b + e
    WHEN 1 THEN a + c + e
    WHEN 2 THEN a + di + e
    WHEN 3 THEN a + b + di
    WHEN 4 THEN a + c + di
    WHEN 5 THEN a + b + c
    WHEN 6 THEN b + di + e
    WHEN 7 THEN b + c + e
    WHEN 8 THEN b + c + di
    WHEN 9 THEN c + di + e
    WHEN 10 THEN a + b + c + e
    WHEN 11 THEN a + b + di + e
    WHEN 12 THEN a + b + c + di
    WHEN 13 THEN b + c + di + e
    WHEN 14 THEN a + b + c + di + e
    ELSE NULL
  END;
END;
$$;

COMMENT ON FUNCTION public.okbt_basamak_toplam(text, integer) IS
  'IY kodundan 5 basamak (A–E) türetir; 15 OKBT toplamından idx (0–14) olanı döner.';
