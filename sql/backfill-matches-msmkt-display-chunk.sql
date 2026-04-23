-- msmkt_display doldurma — küçük parçalar. Editör timeout: `npm run backfill:msmkt` (Direct DATABASE_URL).
-- Tekrar çalıştırın; NULL kalmayana kadar.
-- İlerleme: SELECT count(*) FROM matches WHERE msmkt_display IS NULL;
--
-- Bittiğinde: sql/add-matches-msmkt-display-index.sql

WITH cte AS (
  SELECT id
  FROM public.matches
  WHERE msmkt_display IS NULL
  ORDER BY id
  LIMIT 5000
)
UPDATE public.matches m
SET msmkt_display = public.kod_ms_digit_sum_display(m.kod_ms)
FROM cte
WHERE m.id = cte.id;
