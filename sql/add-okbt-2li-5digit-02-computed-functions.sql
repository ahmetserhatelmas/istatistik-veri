-- obktb_15..25: 2'li kombinasyonlar + A+C+D+E icin computed column fonksiyonlar.
-- STORED sutun yerine kullanilir: tablo taramasi yok, aninda calisir.
-- Once: add-okbt-2li-5digit-01-function-update.sql calistirilmis olmali.

-- 2'li (idx 15-24)
-- obktb_15: A+B
CREATE OR REPLACE FUNCTION public.obktb_15(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 15) $$;

-- obktb_16: A+C
CREATE OR REPLACE FUNCTION public.obktb_16(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 16) $$;

-- obktb_17: A+D
CREATE OR REPLACE FUNCTION public.obktb_17(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 17) $$;

-- obktb_18: A+E
CREATE OR REPLACE FUNCTION public.obktb_18(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 18) $$;

-- obktb_19: B+C
CREATE OR REPLACE FUNCTION public.obktb_19(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 19) $$;

-- obktb_20: B+D
CREATE OR REPLACE FUNCTION public.obktb_20(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 20) $$;

-- obktb_21: B+E
CREATE OR REPLACE FUNCTION public.obktb_21(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 21) $$;

-- obktb_22: C+D
CREATE OR REPLACE FUNCTION public.obktb_22(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 22) $$;

-- obktb_23: C+E
CREATE OR REPLACE FUNCTION public.obktb_23(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 23) $$;

-- obktb_24: D+E
CREATE OR REPLACE FUNCTION public.obktb_24(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 24) $$;

-- Eksik 4'lu (idx 25)
-- obktb_25: A+C+D+E
CREATE OR REPLACE FUNCTION public.obktb_25(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 25) $$;
