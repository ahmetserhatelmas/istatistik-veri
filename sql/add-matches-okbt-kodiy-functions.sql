-- İY Kod · OKBT — PostgREST computed column fonksiyonları (15 adet)
-- Supabase SQL Editor'e tümünü yapıştır ve Run'a bas — anında çalışır.

CREATE OR REPLACE FUNCTION public.kodiy_obktb_0(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 0)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_1(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 1)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_2(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 2)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_3(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 3)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_4(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 4)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_5(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 5)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_6(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 6)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_7(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 7)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_8(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 8)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_9(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 9)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_10(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 10)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_11(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 11)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_12(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 12)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_13(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 13)
$$;

CREATE OR REPLACE FUNCTION public.kodiy_obktb_14(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_iy::text, 14)
$$;
