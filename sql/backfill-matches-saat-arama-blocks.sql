-- saat_arama backfill — id blokları (Supabase SQL Editor timeout'u dar plan).
--
-- full.sql çalışmazsa (10 dk bile yetmezse), bu dosyadaki tek-tek blokları
-- sırayla "Run" ile çalıştırın. Her blok yalnızca 50.000'lik id aralığını günceller;
-- 1–2 sn'de biter, timeout riski yoktur.
--
-- Önce min/max id'yi öğrenin:
--   SELECT MIN(id), MAX(id) FROM public.matches;
-- Aşağıdaki blokları min(id)'ten başlayıp max(id)'i geçecek kadar çoğaltın.
-- (Fazladan blok sorun değil — 0 satır günceller.)
--
-- Örnek olarak 0 – 500.000 arası 10 blok verildi. Kendi max'ınıza göre artırın.

UPDATE public.matches SET saat_arama = to_char(saat, 'HH24:MI')
 WHERE id >=      0 AND id <  50000 AND saat IS NOT NULL
   AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM to_char(saat, 'HH24:MI'));

UPDATE public.matches SET saat_arama = to_char(saat, 'HH24:MI')
 WHERE id >=  50000 AND id < 100000 AND saat IS NOT NULL
   AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM to_char(saat, 'HH24:MI'));

UPDATE public.matches SET saat_arama = to_char(saat, 'HH24:MI')
 WHERE id >= 100000 AND id < 150000 AND saat IS NOT NULL
   AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM to_char(saat, 'HH24:MI'));

UPDATE public.matches SET saat_arama = to_char(saat, 'HH24:MI')
 WHERE id >= 150000 AND id < 200000 AND saat IS NOT NULL
   AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM to_char(saat, 'HH24:MI'));

UPDATE public.matches SET saat_arama = to_char(saat, 'HH24:MI')
 WHERE id >= 200000 AND id < 250000 AND saat IS NOT NULL
   AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM to_char(saat, 'HH24:MI'));

UPDATE public.matches SET saat_arama = to_char(saat, 'HH24:MI')
 WHERE id >= 250000 AND id < 300000 AND saat IS NOT NULL
   AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM to_char(saat, 'HH24:MI'));

UPDATE public.matches SET saat_arama = to_char(saat, 'HH24:MI')
 WHERE id >= 300000 AND id < 350000 AND saat IS NOT NULL
   AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM to_char(saat, 'HH24:MI'));

UPDATE public.matches SET saat_arama = to_char(saat, 'HH24:MI')
 WHERE id >= 350000 AND id < 400000 AND saat IS NOT NULL
   AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM to_char(saat, 'HH24:MI'));

UPDATE public.matches SET saat_arama = to_char(saat, 'HH24:MI')
 WHERE id >= 400000 AND id < 450000 AND saat IS NOT NULL
   AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM to_char(saat, 'HH24:MI'));

UPDATE public.matches SET saat_arama = to_char(saat, 'HH24:MI')
 WHERE id >= 450000 AND id < 500000 AND saat IS NOT NULL
   AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM to_char(saat, 'HH24:MI'));

-- … max(id)'i aşana kadar blokları kopyala-yapıştır ile artır …

-- Doğrulama (hepsi bittiğinde backfill_bekleyen = 0 olmalı):
SELECT
  COUNT(*) AS toplam,
  COUNT(saat_arama) AS saat_arama_dolu,
  COUNT(*) FILTER (WHERE saat IS NOT NULL AND saat_arama IS NULL) AS backfill_bekleyen
FROM public.matches;
