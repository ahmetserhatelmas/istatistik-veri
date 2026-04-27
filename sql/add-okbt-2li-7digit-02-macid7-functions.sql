-- macid7_obktb_20..40: 7-haneli Maç ID için tüm 2'li kombinasyonlar (C(7,2)=21).
-- ÖNCE: add-okbt-2li-7digit-01-function-update.sql çalıştırılmış olmalı.
-- DDL only — anında çalışır, tablo taraması yapmaz.

-- macid7_obktb_20: A+B
CREATE OR REPLACE FUNCTION public.macid7_obktb_20(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 20) $$;

-- macid7_obktb_21: A+C
CREATE OR REPLACE FUNCTION public.macid7_obktb_21(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 21) $$;

-- macid7_obktb_22: A+D
CREATE OR REPLACE FUNCTION public.macid7_obktb_22(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 22) $$;

-- macid7_obktb_23: A+E
CREATE OR REPLACE FUNCTION public.macid7_obktb_23(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 23) $$;

-- macid7_obktb_24: A+F
CREATE OR REPLACE FUNCTION public.macid7_obktb_24(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 24) $$;

-- macid7_obktb_25: A+G
CREATE OR REPLACE FUNCTION public.macid7_obktb_25(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 25) $$;

-- macid7_obktb_26: B+C
CREATE OR REPLACE FUNCTION public.macid7_obktb_26(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 26) $$;

-- macid7_obktb_27: B+D
CREATE OR REPLACE FUNCTION public.macid7_obktb_27(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 27) $$;

-- macid7_obktb_28: B+E
CREATE OR REPLACE FUNCTION public.macid7_obktb_28(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 28) $$;

-- macid7_obktb_29: B+F
CREATE OR REPLACE FUNCTION public.macid7_obktb_29(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 29) $$;

-- macid7_obktb_30: B+G
CREATE OR REPLACE FUNCTION public.macid7_obktb_30(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 30) $$;

-- macid7_obktb_31: C+D
CREATE OR REPLACE FUNCTION public.macid7_obktb_31(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 31) $$;

-- macid7_obktb_32: C+E
CREATE OR REPLACE FUNCTION public.macid7_obktb_32(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 32) $$;

-- macid7_obktb_33: C+F
CREATE OR REPLACE FUNCTION public.macid7_obktb_33(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 33) $$;

-- macid7_obktb_34: C+G
CREATE OR REPLACE FUNCTION public.macid7_obktb_34(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 34) $$;

-- macid7_obktb_35: D+E
CREATE OR REPLACE FUNCTION public.macid7_obktb_35(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 35) $$;

-- macid7_obktb_36: D+F
CREATE OR REPLACE FUNCTION public.macid7_obktb_36(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 36) $$;

-- macid7_obktb_37: D+G
CREATE OR REPLACE FUNCTION public.macid7_obktb_37(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 37) $$;

-- macid7_obktb_38: E+F
CREATE OR REPLACE FUNCTION public.macid7_obktb_38(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 38) $$;

-- macid7_obktb_39: E+G
CREATE OR REPLACE FUNCTION public.macid7_obktb_39(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 39) $$;

-- macid7_obktb_40: F+G
CREATE OR REPLACE FUNCTION public.macid7_obktb_40(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 40) $$;

