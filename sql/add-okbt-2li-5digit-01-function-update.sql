-- okbt_basamak_toplam: 5-haneli (ABCDE) fonksiyonunu 2'li kombinasyonlar (idx 15-24)
-- ve eksik 4'lü A+C+D+E (idx 25) ile genişlet.
-- Bu dosyayı ÖNCE çalıştırın; ardından add-okbt-2li-5digit-stored-cols.sql çalıştırın.
-- Mevcut obktb_0..14 sütunları etkilenmez.

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
  a  := substring(d5 from 1 for 1)::int;
  b  := substring(d5 from 2 for 1)::int;
  c  := substring(d5 from 3 for 1)::int;
  di := substring(d5 from 4 for 1)::int;
  e  := substring(d5 from 5 for 1)::int;
  RETURN CASE idx
    -- 3'lü (0–9)
    WHEN 0  THEN a + b + e
    WHEN 1  THEN a + c + e
    WHEN 2  THEN a + di + e
    WHEN 3  THEN a + b + di
    WHEN 4  THEN a + c + di
    WHEN 5  THEN a + b + c
    WHEN 6  THEN b + di + e
    WHEN 7  THEN b + c + e
    WHEN 8  THEN b + c + di
    WHEN 9  THEN c + di + e
    -- 4'lü (10–13)
    WHEN 10 THEN a + b + c + e
    WHEN 11 THEN a + b + di + e
    WHEN 12 THEN a + b + c + di
    WHEN 13 THEN b + c + di + e
    -- 5'li (14)
    WHEN 14 THEN a + b + c + di + e
    -- 2'li (15–24)
    WHEN 15 THEN a + b
    WHEN 16 THEN a + c
    WHEN 17 THEN a + di
    WHEN 18 THEN a + e
    WHEN 19 THEN b + c
    WHEN 20 THEN b + di
    WHEN 21 THEN b + e
    WHEN 22 THEN c + di
    WHEN 23 THEN c + e
    WHEN 24 THEN di + e
    -- Eksik 4'lü: A+C+D+E (25)
    WHEN 25 THEN a + c + di + e
    ELSE NULL
  END;
END;
$$;

COMMENT ON FUNCTION public.okbt_basamak_toplam(text, integer) IS
  'IY kodundan 5 basamak (A-E) turetir; 26 OKBT toplamlarindan idx (0-25) olanini doner. 0-9: 3lu, 10-13: 4lu, 14: 5li, 15-24: 2li, 25: A+C+D+E.';
