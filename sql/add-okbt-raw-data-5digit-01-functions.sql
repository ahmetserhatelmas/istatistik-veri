-- Ham veri (raw_data JSONB) OKBT fonksiyonları: 27 kaynak × 26 kombinasyon = 702 fonksiyon.
-- okbt_basamak_toplam(text, int) zaten tanımlı olmalı
-- (bkz. add-okbt-2li-5digit-01-function-update.sql).
-- Her fonksiyon raw_data->>'KEY' değerini okur; key yoksa NULL döner.

DO $$
DECLARE
  pairs TEXT[][] := ARRAY[
    ARRAY['kodig',     'KODIG'],
    ARRAY['kodikys',   'KODIKYS'],
    ARRAY['kodiyau05', 'KODIYAU05'],
    ARRAY['kodiyau15', 'KODIYAU15'],
    ARRAY['kodiyau25', 'KODIYAU25'],
    ARRAY['kodiyms',   'KODIYMS'],
    ARRAY['kodkg',     'KODKG'],
    ARRAY['kodmsau15', 'KODMSAU15'],
    ARRAY['kodmsau25', 'KODMSAU25'],
    ARRAY['kodmsau35', 'KODMSAU35'],
    ARRAY['kodmsau45', 'KODMSAU45'],
    ARRAY['kodsk',     'KODSK'],
    ARRAY['kodtc',     'KODTC'],
    ARRAY['kodtg',     'KODTG'],
    ARRAY['koddau05',  'KODDAU05'],
    ARRAY['koddau15',  'KODDAU15'],
    ARRAY['koddau25',  'KODDAU25'],
    ARRAY['koddau35',  'KODDAU35'],
    ARRAY['koddcgoy',  'KODDCGOY'],
    ARRAY['kodeau05',  'KODEAU05'],
    ARRAY['kodeau15',  'KODEAU15'],
    ARRAY['kodeau25',  'KODEAU25'],
    ARRAY['kodeau35',  'KODEAU35'],
    ARRAY['kodhms11',  'KODHMS11'],
    ARRAY['kodhms12',  'KODHMS12'],
    ARRAY['kodhms21',  'KODHMS21'],
    ARRAY['kodhms22',  'KODHMS22']
  ];
  pair    TEXT[];
  src_id  TEXT;
  raw_key TEXT;
  idx     INT;
BEGIN
  FOREACH pair SLICE 1 IN ARRAY pairs LOOP
    src_id  := pair[1];
    raw_key := pair[2];
    FOR idx IN 0..25 LOOP
      EXECUTE format(
        'CREATE OR REPLACE FUNCTION public.%I(r public.matches) '
        'RETURNS integer LANGUAGE sql STABLE AS '
        '$q$ SELECT public.okbt_basamak_toplam(r.raw_data->>%L, %s) $q$;',
        src_id || '_obktb_' || idx::text,
        raw_key,
        idx
      );
    END LOOP;
  END LOOP;
END $$;

-- Supabase schema cache'i yenile (DDL event trigger yoksa elle çalıştır):
-- NOTIFY pgrst, 'reload schema';
