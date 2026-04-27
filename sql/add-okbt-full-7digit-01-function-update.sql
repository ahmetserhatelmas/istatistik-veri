-- okbt7_basamak_toplam: 7-haneli A-G için TÜM 2-6'lı kombinasyonlar (119 adet).
-- Itertools sırası: 2'li önce, 6'lı son.
-- Bu dosyayı ÖNCE; ardından add-okbt-2li-7digit-02-macid7-functions-full.sql çalıştırın.

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
    WHEN   0 THEN a + b  -- A+B
    WHEN   1 THEN a + c  -- A+C
    WHEN   2 THEN a + d  -- A+D
    WHEN   3 THEN a + e  -- A+E
    WHEN   4 THEN a + f  -- A+F
    WHEN   5 THEN a + g  -- A+G
    WHEN   6 THEN b + c  -- B+C
    WHEN   7 THEN b + d  -- B+D
    WHEN   8 THEN b + e  -- B+E
    WHEN   9 THEN b + f  -- B+F
    WHEN  10 THEN b + g  -- B+G
    WHEN  11 THEN c + d  -- C+D
    WHEN  12 THEN c + e  -- C+E
    WHEN  13 THEN c + f  -- C+F
    WHEN  14 THEN c + g  -- C+G
    WHEN  15 THEN d + e  -- D+E
    WHEN  16 THEN d + f  -- D+F
    WHEN  17 THEN d + g  -- D+G
    WHEN  18 THEN e + f  -- E+F
    WHEN  19 THEN e + g  -- E+G
    WHEN  20 THEN f + g  -- F+G
    WHEN  21 THEN a + b + c  -- A+B+C
    WHEN  22 THEN a + b + d  -- A+B+D
    WHEN  23 THEN a + b + e  -- A+B+E
    WHEN  24 THEN a + b + f  -- A+B+F
    WHEN  25 THEN a + b + g  -- A+B+G
    WHEN  26 THEN a + c + d  -- A+C+D
    WHEN  27 THEN a + c + e  -- A+C+E
    WHEN  28 THEN a + c + f  -- A+C+F
    WHEN  29 THEN a + c + g  -- A+C+G
    WHEN  30 THEN a + d + e  -- A+D+E
    WHEN  31 THEN a + d + f  -- A+D+F
    WHEN  32 THEN a + d + g  -- A+D+G
    WHEN  33 THEN a + e + f  -- A+E+F
    WHEN  34 THEN a + e + g  -- A+E+G
    WHEN  35 THEN a + f + g  -- A+F+G
    WHEN  36 THEN b + c + d  -- B+C+D
    WHEN  37 THEN b + c + e  -- B+C+E
    WHEN  38 THEN b + c + f  -- B+C+F
    WHEN  39 THEN b + c + g  -- B+C+G
    WHEN  40 THEN b + d + e  -- B+D+E
    WHEN  41 THEN b + d + f  -- B+D+F
    WHEN  42 THEN b + d + g  -- B+D+G
    WHEN  43 THEN b + e + f  -- B+E+F
    WHEN  44 THEN b + e + g  -- B+E+G
    WHEN  45 THEN b + f + g  -- B+F+G
    WHEN  46 THEN c + d + e  -- C+D+E
    WHEN  47 THEN c + d + f  -- C+D+F
    WHEN  48 THEN c + d + g  -- C+D+G
    WHEN  49 THEN c + e + f  -- C+E+F
    WHEN  50 THEN c + e + g  -- C+E+G
    WHEN  51 THEN c + f + g  -- C+F+G
    WHEN  52 THEN d + e + f  -- D+E+F
    WHEN  53 THEN d + e + g  -- D+E+G
    WHEN  54 THEN d + f + g  -- D+F+G
    WHEN  55 THEN e + f + g  -- E+F+G
    WHEN  56 THEN a + b + c + d  -- A+B+C+D
    WHEN  57 THEN a + b + c + e  -- A+B+C+E
    WHEN  58 THEN a + b + c + f  -- A+B+C+F
    WHEN  59 THEN a + b + c + g  -- A+B+C+G
    WHEN  60 THEN a + b + d + e  -- A+B+D+E
    WHEN  61 THEN a + b + d + f  -- A+B+D+F
    WHEN  62 THEN a + b + d + g  -- A+B+D+G
    WHEN  63 THEN a + b + e + f  -- A+B+E+F
    WHEN  64 THEN a + b + e + g  -- A+B+E+G
    WHEN  65 THEN a + b + f + g  -- A+B+F+G
    WHEN  66 THEN a + c + d + e  -- A+C+D+E
    WHEN  67 THEN a + c + d + f  -- A+C+D+F
    WHEN  68 THEN a + c + d + g  -- A+C+D+G
    WHEN  69 THEN a + c + e + f  -- A+C+E+F
    WHEN  70 THEN a + c + e + g  -- A+C+E+G
    WHEN  71 THEN a + c + f + g  -- A+C+F+G
    WHEN  72 THEN a + d + e + f  -- A+D+E+F
    WHEN  73 THEN a + d + e + g  -- A+D+E+G
    WHEN  74 THEN a + d + f + g  -- A+D+F+G
    WHEN  75 THEN a + e + f + g  -- A+E+F+G
    WHEN  76 THEN b + c + d + e  -- B+C+D+E
    WHEN  77 THEN b + c + d + f  -- B+C+D+F
    WHEN  78 THEN b + c + d + g  -- B+C+D+G
    WHEN  79 THEN b + c + e + f  -- B+C+E+F
    WHEN  80 THEN b + c + e + g  -- B+C+E+G
    WHEN  81 THEN b + c + f + g  -- B+C+F+G
    WHEN  82 THEN b + d + e + f  -- B+D+E+F
    WHEN  83 THEN b + d + e + g  -- B+D+E+G
    WHEN  84 THEN b + d + f + g  -- B+D+F+G
    WHEN  85 THEN b + e + f + g  -- B+E+F+G
    WHEN  86 THEN c + d + e + f  -- C+D+E+F
    WHEN  87 THEN c + d + e + g  -- C+D+E+G
    WHEN  88 THEN c + d + f + g  -- C+D+F+G
    WHEN  89 THEN c + e + f + g  -- C+E+F+G
    WHEN  90 THEN d + e + f + g  -- D+E+F+G
    WHEN  91 THEN a + b + c + d + e  -- A+B+C+D+E
    WHEN  92 THEN a + b + c + d + f  -- A+B+C+D+F
    WHEN  93 THEN a + b + c + d + g  -- A+B+C+D+G
    WHEN  94 THEN a + b + c + e + f  -- A+B+C+E+F
    WHEN  95 THEN a + b + c + e + g  -- A+B+C+E+G
    WHEN  96 THEN a + b + c + f + g  -- A+B+C+F+G
    WHEN  97 THEN a + b + d + e + f  -- A+B+D+E+F
    WHEN  98 THEN a + b + d + e + g  -- A+B+D+E+G
    WHEN  99 THEN a + b + d + f + g  -- A+B+D+F+G
    WHEN 100 THEN a + b + e + f + g  -- A+B+E+F+G
    WHEN 101 THEN a + c + d + e + f  -- A+C+D+E+F
    WHEN 102 THEN a + c + d + e + g  -- A+C+D+E+G
    WHEN 103 THEN a + c + d + f + g  -- A+C+D+F+G
    WHEN 104 THEN a + c + e + f + g  -- A+C+E+F+G
    WHEN 105 THEN a + d + e + f + g  -- A+D+E+F+G
    WHEN 106 THEN b + c + d + e + f  -- B+C+D+E+F
    WHEN 107 THEN b + c + d + e + g  -- B+C+D+E+G
    WHEN 108 THEN b + c + d + f + g  -- B+C+D+F+G
    WHEN 109 THEN b + c + e + f + g  -- B+C+E+F+G
    WHEN 110 THEN b + d + e + f + g  -- B+D+E+F+G
    WHEN 111 THEN c + d + e + f + g  -- C+D+E+F+G
    WHEN 112 THEN a + b + c + d + e + f  -- A+B+C+D+E+F
    WHEN 113 THEN a + b + c + d + e + g  -- A+B+C+D+E+G
    WHEN 114 THEN a + b + c + d + f + g  -- A+B+C+D+F+G
    WHEN 115 THEN a + b + c + e + f + g  -- A+B+C+E+F+G
    WHEN 116 THEN a + b + d + e + f + g  -- A+B+D+E+F+G
    WHEN 117 THEN a + c + d + e + f + g  -- A+C+D+E+F+G
    WHEN 118 THEN b + c + d + e + f + g  -- B+C+D+E+F+G
    ELSE NULL
  END;
END;
$$;

COMMENT ON FUNCTION public.okbt7_basamak_toplam(text, integer) IS
  '7 haneli kod A-G basamakları; itertools 2-6 element kombinasyonları idx 0-118.';
