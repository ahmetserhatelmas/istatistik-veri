-- saat_arama backfill — küçük parça (Supabase SQL Editor timeout'undan kaçınmak için).
-- Önce add-matches-saat-arama-column.sql çalışmış olmalı.
--
-- Format: to_char(saat, 'HH24:MI') → 5 karakter "HH:MM" (ör. "01:30").
-- Böylece UI hücresindeki "01:30" ile birebir eşleşir (saniye yok).
--
-- Bu dosyayı "Run" ile tekrar tekrar çalıştırın; "Success. N rows updated" içindeki N
-- genelde LIMIT kadar olur. N = 0 olunca iş bitmiştir.
--
-- Daha önce saat::text (saniyeli) doldurulmuşsa: WHERE koşulu farkı yakalar ve
-- bu çalıştırmada eski "01:30:00" değerleri "01:30" ile yeniden yazılır.
--
-- Hâlâ timeout alırsanız: LIMIT değerini 50 veya 25 yapın.
--
-- Alternatif (subquery tüm tabloyu tarayıp timeout veriyorsa): primary key blokları.
-- Bir kez: SELECT min(id), max(id) FROM public.matches;
-- Sonra örnek (aralığı kendi min/max’inize göre kaydırın, 20k’lık parçalar):
--
--   UPDATE public.matches SET saat_arama = to_char(saat, 'HH24:MI')
--   WHERE id BETWEEN 2000000 AND 2020000 AND saat IS NOT NULL;
--
-- saat NULL satırlar için: ayrıca
--   UPDATE public.matches SET saat_arama = NULL WHERE saat IS NULL AND saat_arama IS NOT NULL;
--
-- ── psql / uzun timeout (tek seferde tüm tablo) ─────────────────────────────
--   SET statement_timeout = 0;
--   UPDATE public.matches SET saat_arama = to_char(saat, 'HH24:MI')
--   WHERE saat IS NOT NULL
--     AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM to_char(saat, 'HH24:MI'));

UPDATE public.matches AS m
SET saat_arama = to_char(m.saat, 'HH24:MI')
FROM (
  SELECT id
  FROM public.matches
  WHERE saat IS NOT NULL
    AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM to_char(saat, 'HH24:MI'))
  ORDER BY id
  LIMIT 100
) AS sub
WHERE m.id = sub.id;
