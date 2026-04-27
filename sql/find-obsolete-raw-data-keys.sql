-- Hafif versiyon: tarih'e göre en eski 20 satır ile en yeni 20 satırı karşılaştır.
-- Eski satırlarda olup yeni satırlarda olmayan keyler = muhtemelen silinmiş/gereksiz.
-- Supabase SQL Editor'da çalıştırın (birkaç saniye sürer).

WITH recent_keys AS (
  SELECT DISTINCT jsonb_object_keys(raw_data) AS k
  FROM (
    SELECT raw_data FROM public.matches
    ORDER BY tarih DESC NULLS LAST
    LIMIT 20
  ) sub
  WHERE raw_data IS NOT NULL
),
old_keys AS (
  SELECT DISTINCT jsonb_object_keys(raw_data) AS k
  FROM (
    SELECT raw_data FROM public.matches
    ORDER BY tarih ASC NULLS LAST
    LIMIT 20
  ) sub
  WHERE raw_data IS NOT NULL
)
SELECT o.k AS only_in_old_rows
FROM old_keys o
LEFT JOIN recent_keys r ON r.k = o.k
WHERE r.k IS NULL
ORDER BY o.k;
