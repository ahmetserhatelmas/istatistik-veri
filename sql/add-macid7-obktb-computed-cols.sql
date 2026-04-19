-- Maç ID (7 haneli) için PostgREST computed column fonksiyonları.
-- Amaç: cf_macid_obktb_{idx} filtreleri doğrudan WHERE ifadesine çevrilsin
-- (RPC + ID IN (...) yerine). Büyük sonuç kümelerinde URL uzunluğu sorunu olmaz,
-- sayfalama ile tutarlı çalışır.
--
-- İstemcide Maç ID 7 haneli ABCDEFG olarak hesaplanıyor (20 formül).
-- Mevcut `macid_obktb_0..14` fonksiyonları 5 HANELİ idi — uyuşmuyordu.
-- Burada yeni isimle (`macid7_obktb_*`) 7 haneli 20 fonksiyon tanımlıyoruz.
--
-- Gereken: sql/add-okbt-digit-sum-server-filter.sql (public.okbt7_basamak_toplam).

CREATE OR REPLACE FUNCTION public.macid7_obktb_0(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 0) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_1(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 1) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_2(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 2) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_3(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 3) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_4(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 4) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_5(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 5) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_6(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 6) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_7(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 7) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_8(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 8) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_9(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 9) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_10(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 10) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_11(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 11) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_12(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 12) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_13(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 13) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_14(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 14) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_15(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 15) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_16(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 16) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_17(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 17) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_18(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 18) $$;

CREATE OR REPLACE FUNCTION public.macid7_obktb_19(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 19) $$;

COMMENT ON FUNCTION public.macid7_obktb_7(public.matches) IS
  'PostgREST computed column — Maç ID (7 haneli) OKBT formülü idx=7 (C+D+E).';

-- ── matches_with_suffix_cols görünümü üzerinde de aynı fonksiyonlar ──────────
-- Kullanıcı aynı anda "Kod son N hane" (ks_suffix) + OKBT filtresi uygularsa
-- API matches_with_suffix_cols view'ından seçim yapıyor; computed column'lar
-- view tipine de tanımlı olmalı ki filtre WHERE'e çıksın.
DO $$
DECLARE
  i int;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'matches_with_suffix_cols' AND relkind = 'v') THEN
    FOR i IN 0..19 LOOP
      EXECUTE format(
        'CREATE OR REPLACE FUNCTION public.macid7_obktb_%s(r public.matches_with_suffix_cols) '
        'RETURNS integer LANGUAGE sql IMMUTABLE AS $fn$ SELECT public.okbt7_basamak_toplam(r.id::text, %s) $fn$',
        i, i
      );
    END LOOP;
  END IF;
END $$;

-- PostgREST şema önbelleğini tazele (gerekmezse Supabase kendi yenilemesini yapar).
NOTIFY pgrst, 'reload schema';
