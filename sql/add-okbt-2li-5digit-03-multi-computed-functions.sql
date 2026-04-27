-- Çok kaynaklı OKBT: 2'li kombinasyonlar (idx 15–24) + A+C+D+E (idx 25).
-- Kaynaklar: t1i, t2i, kodms, kodiy, kodcs, kodau.
-- ÖNCE: add-okbt-2li-5digit-01-function-update.sql çalıştırılmış olmalı.
-- DDL only — anında çalışır, tablo taraması yapmaz.

-- ── t1i ──────────────────────────────────────────────────────
-- t1i_obktb_15: A+B
CREATE OR REPLACE FUNCTION public.t1i_obktb_15(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t1i::text, 15) $$;

-- t1i_obktb_16: A+C
CREATE OR REPLACE FUNCTION public.t1i_obktb_16(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t1i::text, 16) $$;

-- t1i_obktb_17: A+D
CREATE OR REPLACE FUNCTION public.t1i_obktb_17(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t1i::text, 17) $$;

-- t1i_obktb_18: A+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_18(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t1i::text, 18) $$;

-- t1i_obktb_19: B+C
CREATE OR REPLACE FUNCTION public.t1i_obktb_19(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t1i::text, 19) $$;

-- t1i_obktb_20: B+D
CREATE OR REPLACE FUNCTION public.t1i_obktb_20(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t1i::text, 20) $$;

-- t1i_obktb_21: B+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_21(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t1i::text, 21) $$;

-- t1i_obktb_22: C+D
CREATE OR REPLACE FUNCTION public.t1i_obktb_22(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t1i::text, 22) $$;

-- t1i_obktb_23: C+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_23(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t1i::text, 23) $$;

-- t1i_obktb_24: D+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_24(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t1i::text, 24) $$;

-- t1i_obktb_25: A+C+D+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_25(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t1i::text, 25) $$;

-- ── t2i ──────────────────────────────────────────────────────
-- t2i_obktb_15: A+B
CREATE OR REPLACE FUNCTION public.t2i_obktb_15(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t2i::text, 15) $$;

-- t2i_obktb_16: A+C
CREATE OR REPLACE FUNCTION public.t2i_obktb_16(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t2i::text, 16) $$;

-- t2i_obktb_17: A+D
CREATE OR REPLACE FUNCTION public.t2i_obktb_17(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t2i::text, 17) $$;

-- t2i_obktb_18: A+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_18(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t2i::text, 18) $$;

-- t2i_obktb_19: B+C
CREATE OR REPLACE FUNCTION public.t2i_obktb_19(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t2i::text, 19) $$;

-- t2i_obktb_20: B+D
CREATE OR REPLACE FUNCTION public.t2i_obktb_20(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t2i::text, 20) $$;

-- t2i_obktb_21: B+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_21(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t2i::text, 21) $$;

-- t2i_obktb_22: C+D
CREATE OR REPLACE FUNCTION public.t2i_obktb_22(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t2i::text, 22) $$;

-- t2i_obktb_23: C+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_23(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t2i::text, 23) $$;

-- t2i_obktb_24: D+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_24(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t2i::text, 24) $$;

-- t2i_obktb_25: A+C+D+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_25(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.t2i::text, 25) $$;

-- ── kodms ──────────────────────────────────────────────────────
-- kodms_obktb_15: A+B
CREATE OR REPLACE FUNCTION public.kodms_obktb_15(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_ms::text, 15) $$;

-- kodms_obktb_16: A+C
CREATE OR REPLACE FUNCTION public.kodms_obktb_16(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_ms::text, 16) $$;

-- kodms_obktb_17: A+D
CREATE OR REPLACE FUNCTION public.kodms_obktb_17(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_ms::text, 17) $$;

-- kodms_obktb_18: A+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_18(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_ms::text, 18) $$;

-- kodms_obktb_19: B+C
CREATE OR REPLACE FUNCTION public.kodms_obktb_19(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_ms::text, 19) $$;

-- kodms_obktb_20: B+D
CREATE OR REPLACE FUNCTION public.kodms_obktb_20(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_ms::text, 20) $$;

-- kodms_obktb_21: B+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_21(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_ms::text, 21) $$;

-- kodms_obktb_22: C+D
CREATE OR REPLACE FUNCTION public.kodms_obktb_22(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_ms::text, 22) $$;

-- kodms_obktb_23: C+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_23(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_ms::text, 23) $$;

-- kodms_obktb_24: D+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_24(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_ms::text, 24) $$;

-- kodms_obktb_25: A+C+D+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_25(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_ms::text, 25) $$;

-- ── kodiy ──────────────────────────────────────────────────────
-- kodiy_obktb_15: A+B
CREATE OR REPLACE FUNCTION public.kodiy_obktb_15(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 15) $$;

-- kodiy_obktb_16: A+C
CREATE OR REPLACE FUNCTION public.kodiy_obktb_16(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 16) $$;

-- kodiy_obktb_17: A+D
CREATE OR REPLACE FUNCTION public.kodiy_obktb_17(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 17) $$;

-- kodiy_obktb_18: A+E
CREATE OR REPLACE FUNCTION public.kodiy_obktb_18(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 18) $$;

-- kodiy_obktb_19: B+C
CREATE OR REPLACE FUNCTION public.kodiy_obktb_19(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 19) $$;

-- kodiy_obktb_20: B+D
CREATE OR REPLACE FUNCTION public.kodiy_obktb_20(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 20) $$;

-- kodiy_obktb_21: B+E
CREATE OR REPLACE FUNCTION public.kodiy_obktb_21(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 21) $$;

-- kodiy_obktb_22: C+D
CREATE OR REPLACE FUNCTION public.kodiy_obktb_22(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 22) $$;

-- kodiy_obktb_23: C+E
CREATE OR REPLACE FUNCTION public.kodiy_obktb_23(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 23) $$;

-- kodiy_obktb_24: D+E
CREATE OR REPLACE FUNCTION public.kodiy_obktb_24(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 24) $$;

-- kodiy_obktb_25: A+C+D+E
CREATE OR REPLACE FUNCTION public.kodiy_obktb_25(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_iy::text, 25) $$;

-- ── kodcs ──────────────────────────────────────────────────────
-- kodcs_obktb_15: A+B
CREATE OR REPLACE FUNCTION public.kodcs_obktb_15(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_cs::text, 15) $$;

-- kodcs_obktb_16: A+C
CREATE OR REPLACE FUNCTION public.kodcs_obktb_16(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_cs::text, 16) $$;

-- kodcs_obktb_17: A+D
CREATE OR REPLACE FUNCTION public.kodcs_obktb_17(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_cs::text, 17) $$;

-- kodcs_obktb_18: A+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_18(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_cs::text, 18) $$;

-- kodcs_obktb_19: B+C
CREATE OR REPLACE FUNCTION public.kodcs_obktb_19(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_cs::text, 19) $$;

-- kodcs_obktb_20: B+D
CREATE OR REPLACE FUNCTION public.kodcs_obktb_20(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_cs::text, 20) $$;

-- kodcs_obktb_21: B+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_21(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_cs::text, 21) $$;

-- kodcs_obktb_22: C+D
CREATE OR REPLACE FUNCTION public.kodcs_obktb_22(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_cs::text, 22) $$;

-- kodcs_obktb_23: C+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_23(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_cs::text, 23) $$;

-- kodcs_obktb_24: D+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_24(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_cs::text, 24) $$;

-- kodcs_obktb_25: A+C+D+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_25(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_cs::text, 25) $$;

-- ── kodau ──────────────────────────────────────────────────────
-- kodau_obktb_15: A+B
CREATE OR REPLACE FUNCTION public.kodau_obktb_15(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_au::text, 15) $$;

-- kodau_obktb_16: A+C
CREATE OR REPLACE FUNCTION public.kodau_obktb_16(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_au::text, 16) $$;

-- kodau_obktb_17: A+D
CREATE OR REPLACE FUNCTION public.kodau_obktb_17(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_au::text, 17) $$;

-- kodau_obktb_18: A+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_18(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_au::text, 18) $$;

-- kodau_obktb_19: B+C
CREATE OR REPLACE FUNCTION public.kodau_obktb_19(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_au::text, 19) $$;

-- kodau_obktb_20: B+D
CREATE OR REPLACE FUNCTION public.kodau_obktb_20(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_au::text, 20) $$;

-- kodau_obktb_21: B+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_21(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_au::text, 21) $$;

-- kodau_obktb_22: C+D
CREATE OR REPLACE FUNCTION public.kodau_obktb_22(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_au::text, 22) $$;

-- kodau_obktb_23: C+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_23(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_au::text, 23) $$;

-- kodau_obktb_24: D+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_24(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_au::text, 24) $$;

-- kodau_obktb_25: A+C+D+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_25(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt_basamak_toplam(r.kod_au::text, 25) $$;

