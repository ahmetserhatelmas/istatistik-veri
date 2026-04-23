-- Eski satırlarda `mkt_display` doldurma — küçük parçalar (Supabase timeout önler).
-- Editör sürekli timeout veriyorsa: `DATABASE_URL` (Direct) ile `npm run backfill:mkt` (scripts/backfill-mkt-display.mjs).
-- SQL Editor’da bu bloğu tekrar tekrar çalıştırın; "0 rows" / etkilenen 0 olana kadar.
-- İlerlemeyi görmek için: SELECT count(*) FROM matches WHERE mkt_display IS NULL;
--
-- Bittiğinde (isteğe bağlı): sql/add-matches-mkt-display-index.sql

WITH cte AS (
  SELECT id
  FROM public.matches
  WHERE mkt_display IS NULL
  ORDER BY id
  LIMIT 5000
)
UPDATE public.matches m
SET mkt_display = public.match_id_mkt_display(m.id)
FROM cte
WHERE m.id = cte.id;
