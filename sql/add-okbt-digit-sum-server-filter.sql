-- OKBT basamak toplamlarını sunucu tarafında filtrelemek için yardımcı
-- fonksiyonlar. Amaç: Tablo yalnızca ilk 100 satır gösterdiği için istemcide
-- filtreleme yapıldığında diğer filtreleri gevşetince sayılar değişebiliyor.
-- Bu fonksiyonlarla {src}_obktb_{idx} filtreleri sayfalama öncesi ID'lere
-- indirgenir ve "WHERE id IN (...)" olarak uygulanır.
--
-- NOT: 5-haneli kodlar için public.okbt_basamak_toplam(text, int) fonksiyonu
-- zaten kurulu olmalı (sql/add-matches-okbt-basamak-generated-cols-01-function.sql).

-- ── 7 haneli Maç ID (A-G, 20 formül) ─────────────────────────────────────────
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
    ELSE NULL
  END;
END;
$$;

COMMENT ON FUNCTION public.okbt7_basamak_toplam(text, integer) IS
  'Maç ID gibi 7 haneli kodlarda A-G basamaklarının 20 OKBT toplamından idx (0-19) olanı döner.';

-- ── Aralık (min..max) ile eşleşen maç ID listesi ─────────────────────────────
-- p_src: 'macid' | 't1i' | 't2i' | 'kodms' | 'kodiy' | 'kodcs' | 'kodau'
-- p_idx: macid için 0..19, diğerleri için 0..14
-- p_min/p_max: NULL → sınırsız. Her ikisi eşitse tam eşleşme.
CREATE OR REPLACE FUNCTION public.get_matches_by_obktb_range(
  p_src text,
  p_idx integer,
  p_min integer DEFAULT NULL,
  p_max integer DEFAULT NULL
) RETURNS SETOF bigint
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT m.id
  FROM public.matches m
  WHERE (
    CASE p_src
      WHEN 'macid' THEN public.okbt7_basamak_toplam(m.id::text, p_idx)
      WHEN 't1i'   THEN public.okbt_basamak_toplam(m.t1i::text, p_idx)
      WHEN 't2i'   THEN public.okbt_basamak_toplam(m.t2i::text, p_idx)
      WHEN 'kodms' THEN public.okbt_basamak_toplam(m.kod_ms::text, p_idx)
      WHEN 'kodiy' THEN public.okbt_basamak_toplam(m.kod_iy::text, p_idx)
      WHEN 'kodcs' THEN public.okbt_basamak_toplam(m.kod_cs::text, p_idx)
      WHEN 'kodau' THEN public.okbt_basamak_toplam(m.kod_au::text, p_idx)
      ELSE NULL
    END
  ) BETWEEN COALESCE(p_min, -2147483648) AND COALESCE(p_max, 2147483647);
$$;

COMMENT ON FUNCTION public.get_matches_by_obktb_range(text, integer, integer, integer) IS
  'Belirtilen OKBT basamak toplamı [p_min, p_max] aralığında olan tüm match.id''leri döner. NULL sınır = açık.';
