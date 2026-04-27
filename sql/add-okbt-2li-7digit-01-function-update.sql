-- okbt7_basamak_toplam: 7-haneli (ABCDEFG) fonksiyonunu tüm 2'li kombinasyonlar
-- (idx 20–40, C(7,2)=21 adet) ile genişlet.
-- ÖNCE bu dosyayı; ardından add-okbt-2li-7digit-02-macid7-functions.sql çalıştırın.

CREATE OR REPLACE FUNCTION public.okbt7_basamak_toplam(kod text, idx integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
  d7 text;
  a int; b int; c int; d int; e int; f int; g int;
BEGIN
  IF kod IS NULL OR btrim(kod) = '' THEN
    RETURN NULL;
  END IF;
  digits := regexp_replace(kod, '\D', '', 'g');
  IF length(digits) < 1 THEN
    RETURN NULL;
  END IF;
  IF length(digits) >= 7 THEN
    d7 := right(digits, 7);
  ELSE
    d7 := lpad(digits, 7, '0');
  END IF;
  a := substring(d7 from 1 for 1)::int;
  b := substring(d7 from 2 for 1)::int;
  c := substring(d7 from 3 for 1)::int;
  d := substring(d7 from 4 for 1)::int;
  e := substring(d7 from 5 for 1)::int;
  f := substring(d7 from 6 for 1)::int;
  g := substring(d7 from 7 for 1)::int;
  RETURN CASE idx
    -- Mevcut curated seçim (0–19)
    WHEN 0  THEN a + b + g
    WHEN 1  THEN a + c + g
    WHEN 2  THEN a + d + g
    WHEN 3  THEN a + e + g
    WHEN 4  THEN a + f + g
    WHEN 5  THEN b + c + d
    WHEN 6  THEN b + d + e
    WHEN 7  THEN c + d + e
    WHEN 8  THEN d + e + f
    WHEN 9  THEN e + f + g
    WHEN 10 THEN a + b + c + d
    WHEN 11 THEN b + c + d + e
    WHEN 12 THEN c + d + e + f
    WHEN 13 THEN d + e + f + g
    WHEN 14 THEN a + b + c + d + e
    WHEN 15 THEN b + c + d + e + f
    WHEN 16 THEN c + d + e + f + g
    WHEN 17 THEN a + b + c + d + e + f
    WHEN 18 THEN b + c + d + e + f + g
    WHEN 19 THEN a + b + c + d + e + f + g
    -- 2'li kombinasyonlar C(7,2)=21 (20–40)
    WHEN 20 THEN a + b
    WHEN 21 THEN a + c
    WHEN 22 THEN a + d
    WHEN 23 THEN a + e
    WHEN 24 THEN a + f
    WHEN 25 THEN a + g
    WHEN 26 THEN b + c
    WHEN 27 THEN b + d
    WHEN 28 THEN b + e
    WHEN 29 THEN b + f
    WHEN 30 THEN b + g
    WHEN 31 THEN c + d
    WHEN 32 THEN c + e
    WHEN 33 THEN c + f
    WHEN 34 THEN c + g
    WHEN 35 THEN d + e
    WHEN 36 THEN d + f
    WHEN 37 THEN d + g
    WHEN 38 THEN e + f
    WHEN 39 THEN e + g
    WHEN 40 THEN f + g
    ELSE NULL
  END;
END;
$$;

COMMENT ON FUNCTION public.okbt7_basamak_toplam(text, integer) IS
  'Maç ID gibi 7 haneli kodlarda A-G basamaklarının 41 OKBT toplamından idx (0-40) olanı döner.
   0-19: curated 3-7'li seçim; 20-40: tüm 2'li kombinasyonlar.';
