-- saat_arama backfill — küçük parça (Supabase SQL Editor timeout'undan kaçınmak için).
-- Önce add-matches-saat-arama-column.sql çalışmış olmalı.
--
-- Bu dosyayı "Run" ile tekrar tekrar çalıştırın; "Success. N rows updated" içindeki N
-- genelde LIMIT kadar olur. N = 0 olunca iş bitmiştir.
--
-- Hâlâ timeout alırsanız: LIMIT değerini 50 veya 25 yapın.
--
-- Alternatif (subquery tüm tabloyu tarayıp timeout veriyorsa): primary key blokları.
-- Bir kez: SELECT min(id), max(id) FROM public.matches;
-- Sonra örnek (aralığı kendi min/max’inize göre kaydırın, 20k’lık parçalar):
--
--   UPDATE public.matches SET saat_arama = saat::text
--   WHERE id BETWEEN 2000000 AND 2020000 AND saat IS NOT NULL;
--
-- saat NULL satırlar için: ayrıca
--   UPDATE public.matches SET saat_arama = NULL WHERE saat IS NULL AND saat_arama IS NOT NULL;
--
-- ── psql / uzun timeout (tek seferde tüm tablo) ─────────────────────────────
--   SET statement_timeout = 0;
--   UPDATE public.matches SET saat_arama = saat::text
--   WHERE saat IS NOT NULL
--     AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM saat::text);

UPDATE public.matches AS m
SET saat_arama = m.saat::text
FROM (
  SELECT id
  FROM public.matches
  WHERE saat IS NOT NULL
    AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM saat::text)
  ORDER BY id
  LIMIT 100
) AS sub
WHERE m.id = sub.id;
