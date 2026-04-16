-- OKBT “Oyun Basamak Kodu Toplamları”: kod_iy ile aynı mantık (src/lib/okbt-basamak-toplamlari.ts).
-- cf_obktb_0 … cf_obktb_14 tam tablo filtresi için GENERATED STORED text sütunları.
-- Çalıştırdıktan sonra: sql/create-matches-suffix-view.sql dosyasını yeniden çalıştırın (m.* genişlemesi).
--
-- Supabase SQL Editor zaman aşımı / “Failed to fetch” olursa aynı içerik 3 dosyada:
--   add-matches-okbt-basamak-generated-cols-01-function.sql
--   add-matches-okbt-basamak-generated-cols-02-cols-0-7.sql
--   add-matches-okbt-basamak-generated-cols-03-cols-8-14.sql
-- Sıra: 01 → 02 → 03.

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

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_0 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 0))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_1 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 1))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_2 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 2))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_3 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 3))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_4 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 4))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_5 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 5))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_6 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 6))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_7 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 7))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_8 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 8))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_9 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 9))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_10 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 10))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_11 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 11))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_12 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 12))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_13 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 13))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_14 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 14))::text) STORED;
