-- Çok kaynaklı OKBT: kod sütunu başına 15 PostgreSQL computed column fonksiyon.
-- Bu fonksiyonlar public.okbt_basamak_toplam() fonksiyonunu kullanır.
-- SADECE DDL: veri taraması yok, tablo üzerinde çalışmaz — Supabase SQL Editor'de anında çalışır.
-- Önce: sql/add-matches-okbt-basamak-generated-cols-01-function.sql çalıştırılmış olmalı.
-- PostgREST bu fonksiyonları 'computed column' olarak tanıyıp WHERE içinde kullanır.

-- ── macid (id) ─────────────────────────────────────────────────────────
-- macid_obktb_0: A+B+E
CREATE OR REPLACE FUNCTION public.macid_obktb_0(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 0)
$$;

-- macid_obktb_1: A+C+E
CREATE OR REPLACE FUNCTION public.macid_obktb_1(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 1)
$$;

-- macid_obktb_2: A+D+E
CREATE OR REPLACE FUNCTION public.macid_obktb_2(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 2)
$$;

-- macid_obktb_3: A+B+D
CREATE OR REPLACE FUNCTION public.macid_obktb_3(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 3)
$$;

-- macid_obktb_4: A+C+D
CREATE OR REPLACE FUNCTION public.macid_obktb_4(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 4)
$$;

-- macid_obktb_5: A+B+C
CREATE OR REPLACE FUNCTION public.macid_obktb_5(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 5)
$$;

-- macid_obktb_6: B+D+E
CREATE OR REPLACE FUNCTION public.macid_obktb_6(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 6)
$$;

-- macid_obktb_7: B+C+E
CREATE OR REPLACE FUNCTION public.macid_obktb_7(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 7)
$$;

-- macid_obktb_8: B+C+D
CREATE OR REPLACE FUNCTION public.macid_obktb_8(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 8)
$$;

-- macid_obktb_9: C+D+E
CREATE OR REPLACE FUNCTION public.macid_obktb_9(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 9)
$$;

-- macid_obktb_10: A+B+C+E
CREATE OR REPLACE FUNCTION public.macid_obktb_10(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 10)
$$;

-- macid_obktb_11: A+B+D+E
CREATE OR REPLACE FUNCTION public.macid_obktb_11(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 11)
$$;

-- macid_obktb_12: A+B+C+D
CREATE OR REPLACE FUNCTION public.macid_obktb_12(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 12)
$$;

-- macid_obktb_13: B+C+D+E
CREATE OR REPLACE FUNCTION public.macid_obktb_13(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 13)
$$;

-- macid_obktb_14: A+B+C+D+E
CREATE OR REPLACE FUNCTION public.macid_obktb_14(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.id::text, 14)
$$;

-- ── t1i (t1i) ─────────────────────────────────────────────────────────
-- t1i_obktb_0: A+B+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_0(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 0)
$$;

-- t1i_obktb_1: A+C+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_1(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 1)
$$;

-- t1i_obktb_2: A+D+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_2(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 2)
$$;

-- t1i_obktb_3: A+B+D
CREATE OR REPLACE FUNCTION public.t1i_obktb_3(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 3)
$$;

-- t1i_obktb_4: A+C+D
CREATE OR REPLACE FUNCTION public.t1i_obktb_4(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 4)
$$;

-- t1i_obktb_5: A+B+C
CREATE OR REPLACE FUNCTION public.t1i_obktb_5(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 5)
$$;

-- t1i_obktb_6: B+D+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_6(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 6)
$$;

-- t1i_obktb_7: B+C+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_7(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 7)
$$;

-- t1i_obktb_8: B+C+D
CREATE OR REPLACE FUNCTION public.t1i_obktb_8(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 8)
$$;

-- t1i_obktb_9: C+D+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_9(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 9)
$$;

-- t1i_obktb_10: A+B+C+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_10(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 10)
$$;

-- t1i_obktb_11: A+B+D+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_11(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 11)
$$;

-- t1i_obktb_12: A+B+C+D
CREATE OR REPLACE FUNCTION public.t1i_obktb_12(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 12)
$$;

-- t1i_obktb_13: B+C+D+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_13(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 13)
$$;

-- t1i_obktb_14: A+B+C+D+E
CREATE OR REPLACE FUNCTION public.t1i_obktb_14(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t1i::text, 14)
$$;

-- ── t2i (t2i) ─────────────────────────────────────────────────────────
-- t2i_obktb_0: A+B+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_0(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 0)
$$;

-- t2i_obktb_1: A+C+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_1(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 1)
$$;

-- t2i_obktb_2: A+D+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_2(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 2)
$$;

-- t2i_obktb_3: A+B+D
CREATE OR REPLACE FUNCTION public.t2i_obktb_3(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 3)
$$;

-- t2i_obktb_4: A+C+D
CREATE OR REPLACE FUNCTION public.t2i_obktb_4(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 4)
$$;

-- t2i_obktb_5: A+B+C
CREATE OR REPLACE FUNCTION public.t2i_obktb_5(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 5)
$$;

-- t2i_obktb_6: B+D+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_6(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 6)
$$;

-- t2i_obktb_7: B+C+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_7(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 7)
$$;

-- t2i_obktb_8: B+C+D
CREATE OR REPLACE FUNCTION public.t2i_obktb_8(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 8)
$$;

-- t2i_obktb_9: C+D+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_9(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 9)
$$;

-- t2i_obktb_10: A+B+C+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_10(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 10)
$$;

-- t2i_obktb_11: A+B+D+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_11(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 11)
$$;

-- t2i_obktb_12: A+B+C+D
CREATE OR REPLACE FUNCTION public.t2i_obktb_12(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 12)
$$;

-- t2i_obktb_13: B+C+D+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_13(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 13)
$$;

-- t2i_obktb_14: A+B+C+D+E
CREATE OR REPLACE FUNCTION public.t2i_obktb_14(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.t2i::text, 14)
$$;

-- ── kodms (kod_ms) ─────────────────────────────────────────────────────────
-- kodms_obktb_0: A+B+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_0(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 0)
$$;

-- kodms_obktb_1: A+C+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_1(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 1)
$$;

-- kodms_obktb_2: A+D+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_2(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 2)
$$;

-- kodms_obktb_3: A+B+D
CREATE OR REPLACE FUNCTION public.kodms_obktb_3(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 3)
$$;

-- kodms_obktb_4: A+C+D
CREATE OR REPLACE FUNCTION public.kodms_obktb_4(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 4)
$$;

-- kodms_obktb_5: A+B+C
CREATE OR REPLACE FUNCTION public.kodms_obktb_5(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 5)
$$;

-- kodms_obktb_6: B+D+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_6(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 6)
$$;

-- kodms_obktb_7: B+C+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_7(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 7)
$$;

-- kodms_obktb_8: B+C+D
CREATE OR REPLACE FUNCTION public.kodms_obktb_8(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 8)
$$;

-- kodms_obktb_9: C+D+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_9(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 9)
$$;

-- kodms_obktb_10: A+B+C+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_10(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 10)
$$;

-- kodms_obktb_11: A+B+D+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_11(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 11)
$$;

-- kodms_obktb_12: A+B+C+D
CREATE OR REPLACE FUNCTION public.kodms_obktb_12(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 12)
$$;

-- kodms_obktb_13: B+C+D+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_13(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 13)
$$;

-- kodms_obktb_14: A+B+C+D+E
CREATE OR REPLACE FUNCTION public.kodms_obktb_14(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_ms::text, 14)
$$;

-- ── kodcs (kod_cs) ─────────────────────────────────────────────────────────
-- kodcs_obktb_0: A+B+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_0(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 0)
$$;

-- kodcs_obktb_1: A+C+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_1(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 1)
$$;

-- kodcs_obktb_2: A+D+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_2(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 2)
$$;

-- kodcs_obktb_3: A+B+D
CREATE OR REPLACE FUNCTION public.kodcs_obktb_3(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 3)
$$;

-- kodcs_obktb_4: A+C+D
CREATE OR REPLACE FUNCTION public.kodcs_obktb_4(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 4)
$$;

-- kodcs_obktb_5: A+B+C
CREATE OR REPLACE FUNCTION public.kodcs_obktb_5(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 5)
$$;

-- kodcs_obktb_6: B+D+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_6(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 6)
$$;

-- kodcs_obktb_7: B+C+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_7(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 7)
$$;

-- kodcs_obktb_8: B+C+D
CREATE OR REPLACE FUNCTION public.kodcs_obktb_8(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 8)
$$;

-- kodcs_obktb_9: C+D+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_9(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 9)
$$;

-- kodcs_obktb_10: A+B+C+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_10(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 10)
$$;

-- kodcs_obktb_11: A+B+D+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_11(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 11)
$$;

-- kodcs_obktb_12: A+B+C+D
CREATE OR REPLACE FUNCTION public.kodcs_obktb_12(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 12)
$$;

-- kodcs_obktb_13: B+C+D+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_13(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 13)
$$;

-- kodcs_obktb_14: A+B+C+D+E
CREATE OR REPLACE FUNCTION public.kodcs_obktb_14(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_cs::text, 14)
$$;

-- ── kodau (kod_au) ─────────────────────────────────────────────────────────
-- kodau_obktb_0: A+B+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_0(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 0)
$$;

-- kodau_obktb_1: A+C+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_1(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 1)
$$;

-- kodau_obktb_2: A+D+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_2(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 2)
$$;

-- kodau_obktb_3: A+B+D
CREATE OR REPLACE FUNCTION public.kodau_obktb_3(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 3)
$$;

-- kodau_obktb_4: A+C+D
CREATE OR REPLACE FUNCTION public.kodau_obktb_4(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 4)
$$;

-- kodau_obktb_5: A+B+C
CREATE OR REPLACE FUNCTION public.kodau_obktb_5(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 5)
$$;

-- kodau_obktb_6: B+D+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_6(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 6)
$$;

-- kodau_obktb_7: B+C+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_7(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 7)
$$;

-- kodau_obktb_8: B+C+D
CREATE OR REPLACE FUNCTION public.kodau_obktb_8(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 8)
$$;

-- kodau_obktb_9: C+D+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_9(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 9)
$$;

-- kodau_obktb_10: A+B+C+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_10(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 10)
$$;

-- kodau_obktb_11: A+B+D+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_11(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 11)
$$;

-- kodau_obktb_12: A+B+C+D
CREATE OR REPLACE FUNCTION public.kodau_obktb_12(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 12)
$$;

-- kodau_obktb_13: B+C+D+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_13(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 13)
$$;

-- kodau_obktb_14: A+B+C+D+E
CREATE OR REPLACE FUNCTION public.kodau_obktb_14(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public.okbt_basamak_toplam(r.kod_au::text, 14)
$$;

-- Fonksiyonlara yorum ekle
COMMENT ON FUNCTION public.macid_obktb_0(public.matches) IS
  'id kolonu için OKBT formül idx=0 (A+B+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_1(public.matches) IS
  'id kolonu için OKBT formül idx=1 (A+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_2(public.matches) IS
  'id kolonu için OKBT formül idx=2 (A+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_3(public.matches) IS
  'id kolonu için OKBT formül idx=3 (A+B+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_4(public.matches) IS
  'id kolonu için OKBT formül idx=4 (A+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_5(public.matches) IS
  'id kolonu için OKBT formül idx=5 (A+B+C) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_6(public.matches) IS
  'id kolonu için OKBT formül idx=6 (B+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_7(public.matches) IS
  'id kolonu için OKBT formül idx=7 (B+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_8(public.matches) IS
  'id kolonu için OKBT formül idx=8 (B+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_9(public.matches) IS
  'id kolonu için OKBT formül idx=9 (C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_10(public.matches) IS
  'id kolonu için OKBT formül idx=10 (A+B+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_11(public.matches) IS
  'id kolonu için OKBT formül idx=11 (A+B+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_12(public.matches) IS
  'id kolonu için OKBT formül idx=12 (A+B+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_13(public.matches) IS
  'id kolonu için OKBT formül idx=13 (B+C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.macid_obktb_14(public.matches) IS
  'id kolonu için OKBT formül idx=14 (A+B+C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_0(public.matches) IS
  't1i kolonu için OKBT formül idx=0 (A+B+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_1(public.matches) IS
  't1i kolonu için OKBT formül idx=1 (A+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_2(public.matches) IS
  't1i kolonu için OKBT formül idx=2 (A+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_3(public.matches) IS
  't1i kolonu için OKBT formül idx=3 (A+B+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_4(public.matches) IS
  't1i kolonu için OKBT formül idx=4 (A+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_5(public.matches) IS
  't1i kolonu için OKBT formül idx=5 (A+B+C) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_6(public.matches) IS
  't1i kolonu için OKBT formül idx=6 (B+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_7(public.matches) IS
  't1i kolonu için OKBT formül idx=7 (B+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_8(public.matches) IS
  't1i kolonu için OKBT formül idx=8 (B+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_9(public.matches) IS
  't1i kolonu için OKBT formül idx=9 (C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_10(public.matches) IS
  't1i kolonu için OKBT formül idx=10 (A+B+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_11(public.matches) IS
  't1i kolonu için OKBT formül idx=11 (A+B+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_12(public.matches) IS
  't1i kolonu için OKBT formül idx=12 (A+B+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_13(public.matches) IS
  't1i kolonu için OKBT formül idx=13 (B+C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t1i_obktb_14(public.matches) IS
  't1i kolonu için OKBT formül idx=14 (A+B+C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_0(public.matches) IS
  't2i kolonu için OKBT formül idx=0 (A+B+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_1(public.matches) IS
  't2i kolonu için OKBT formül idx=1 (A+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_2(public.matches) IS
  't2i kolonu için OKBT formül idx=2 (A+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_3(public.matches) IS
  't2i kolonu için OKBT formül idx=3 (A+B+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_4(public.matches) IS
  't2i kolonu için OKBT formül idx=4 (A+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_5(public.matches) IS
  't2i kolonu için OKBT formül idx=5 (A+B+C) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_6(public.matches) IS
  't2i kolonu için OKBT formül idx=6 (B+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_7(public.matches) IS
  't2i kolonu için OKBT formül idx=7 (B+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_8(public.matches) IS
  't2i kolonu için OKBT formül idx=8 (B+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_9(public.matches) IS
  't2i kolonu için OKBT formül idx=9 (C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_10(public.matches) IS
  't2i kolonu için OKBT formül idx=10 (A+B+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_11(public.matches) IS
  't2i kolonu için OKBT formül idx=11 (A+B+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_12(public.matches) IS
  't2i kolonu için OKBT formül idx=12 (A+B+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_13(public.matches) IS
  't2i kolonu için OKBT formül idx=13 (B+C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.t2i_obktb_14(public.matches) IS
  't2i kolonu için OKBT formül idx=14 (A+B+C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_0(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=0 (A+B+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_1(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=1 (A+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_2(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=2 (A+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_3(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=3 (A+B+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_4(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=4 (A+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_5(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=5 (A+B+C) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_6(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=6 (B+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_7(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=7 (B+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_8(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=8 (B+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_9(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=9 (C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_10(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=10 (A+B+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_11(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=11 (A+B+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_12(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=12 (A+B+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_13(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=13 (B+C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodms_obktb_14(public.matches) IS
  'kod_ms kolonu için OKBT formül idx=14 (A+B+C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_0(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=0 (A+B+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_1(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=1 (A+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_2(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=2 (A+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_3(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=3 (A+B+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_4(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=4 (A+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_5(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=5 (A+B+C) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_6(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=6 (B+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_7(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=7 (B+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_8(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=8 (B+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_9(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=9 (C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_10(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=10 (A+B+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_11(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=11 (A+B+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_12(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=12 (A+B+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_13(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=13 (B+C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodcs_obktb_14(public.matches) IS
  'kod_cs kolonu için OKBT formül idx=14 (A+B+C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_0(public.matches) IS
  'kod_au kolonu için OKBT formül idx=0 (A+B+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_1(public.matches) IS
  'kod_au kolonu için OKBT formül idx=1 (A+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_2(public.matches) IS
  'kod_au kolonu için OKBT formül idx=2 (A+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_3(public.matches) IS
  'kod_au kolonu için OKBT formül idx=3 (A+B+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_4(public.matches) IS
  'kod_au kolonu için OKBT formül idx=4 (A+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_5(public.matches) IS
  'kod_au kolonu için OKBT formül idx=5 (A+B+C) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_6(public.matches) IS
  'kod_au kolonu için OKBT formül idx=6 (B+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_7(public.matches) IS
  'kod_au kolonu için OKBT formül idx=7 (B+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_8(public.matches) IS
  'kod_au kolonu için OKBT formül idx=8 (B+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_9(public.matches) IS
  'kod_au kolonu için OKBT formül idx=9 (C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_10(public.matches) IS
  'kod_au kolonu için OKBT formül idx=10 (A+B+C+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_11(public.matches) IS
  'kod_au kolonu için OKBT formül idx=11 (A+B+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_12(public.matches) IS
  'kod_au kolonu için OKBT formül idx=12 (A+B+C+D) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_13(public.matches) IS
  'kod_au kolonu için OKBT formül idx=13 (B+C+D+E) — PostgREST computed column.';
COMMENT ON FUNCTION public.kodau_obktb_14(public.matches) IS
  'kod_au kolonu için OKBT formül idx=14 (A+B+C+D+E) — PostgREST computed column.';

