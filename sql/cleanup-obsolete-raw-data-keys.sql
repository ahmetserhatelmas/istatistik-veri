-- Adım 2: Yukarıdaki sorguda bulunan obsolete keyleri tüm satırlardan sil.
-- Önce find-obsolete-raw-data-keys.sql çalıştırıp listeyi onaylayın,
-- sonra aşağıdaki ARRAY'i o listeyle doldurun.
--
-- NOT: 44K satırda UPDATE uzun sürebilir. CONCURRENTLY çalışmaz (sadece INDEX için).
-- Supabase'de timeout varsa, aşağıdaki batch versiyonunu kullanın.

-- TEK SEFERDE (küçük tablolar için):
UPDATE public.matches
SET raw_data = raw_data - ARRAY[
  -- buraya find-obsolete-raw-data-keys.sql çıktısındaki keyleri ekleyin:
  -- 'ESK_KEY_1',
  -- 'ESK_KEY_2',
  -- 'ESK_KEY_3'
]::text[]
WHERE raw_data IS NOT NULL
  AND raw_data ?| ARRAY[
  -- 'ESK_KEY_1',
  -- 'ESK_KEY_2'
]::text[];


-- BATCH VERSIYONU (44K+ satır için önerilen — her çalıştırmada 1000 satır):
-- Supabase'de birkaç kez çalıştırın; etkilenen satır 0 olunca bitti demektir.
--
-- DO $$
-- DECLARE
--   obsolete_keys text[] := ARRAY[
--     'ESK_KEY_1', 'ESK_KEY_2'
--   ];
-- BEGIN
--   UPDATE public.matches
--   SET raw_data = raw_data - obsolete_keys
--   WHERE id IN (
--     SELECT id FROM public.matches
--     WHERE raw_data IS NOT NULL
--       AND raw_data ?| obsolete_keys
--     LIMIT 1000
--   );
--   RAISE NOTICE 'Batch done: % rows', found;
-- END $$;
