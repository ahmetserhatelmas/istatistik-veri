-- MBS (1–3) — raw_data içinde hangi anahtarların bu değerleri taşıdığını keşfetmek.
-- NOT: Tüm matches üzerinde jsonb_each = tam tarama → Supabase SQL Editor’de zaman aşımı olur.
--       Aşağıdaki sorgular önce küçük bir ALT KÜME seçer (varsayılan 2500 satır, en yeni id).
--       LIMIT değerini ihtiyaca göre değiştirin (500 / 5000 / …).

-- İsteğe bağlı (rol izin veriyorsa): oturum süresini artırın.
-- SET statement_timeout = '120s';

-- ═══════════════════════════════════════════════════════════════════════════
-- Hızlı kontrol: örnek kümede üst düzey MB / MBS anahtarı var mı? (jsonb_each yok)
-- ═══════════════════════════════════════════════════════════════════════════
WITH sample AS (
  SELECT id, raw_data
  FROM public.matches
  WHERE raw_data IS NOT NULL
    AND jsonb_typeof(raw_data) = 'object'
  ORDER BY id DESC
  LIMIT 2500
)
SELECT
  COUNT(*) FILTER (WHERE s.raw_data ? 'MB') AS rows_with_mb_key,
  COUNT(*) FILTER (WHERE s.raw_data ? 'MBS') AS rows_with_mbs_key,
  COUNT(*) AS sample_rows
FROM sample AS s;

-- ═══════════════════════════════════════════════════════════════════════════
-- Hızlı kontrol 2: MB / MBS değer dağılımı (yine jsonb_each yok, sadece ->)
-- ═══════════════════════════════════════════════════════════════════════════
WITH sample AS (
  SELECT id, raw_data
  FROM public.matches
  WHERE raw_data IS NOT NULL
    AND jsonb_typeof(raw_data) = 'object'
  ORDER BY id DESC
  LIMIT 2500
)
SELECT
  'MB' AS key_hint,
  (s.raw_data -> 'MB' #>> '{}') AS val_text,
  COUNT(*) AS row_count
FROM sample AS s
WHERE s.raw_data ? 'MB'
GROUP BY 1, 2
UNION ALL
SELECT
  'MBS',
  (s.raw_data -> 'MBS' #>> '{}'),
  COUNT(*)
FROM sample AS s
WHERE s.raw_data ? 'MBS'
GROUP BY 1, 2
ORDER BY key_hint, row_count DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1) Üst düzey: değeri 1 / 2 / 3 olan anahtarlar (jsonb_each — sadece örnek küme)
-- ═══════════════════════════════════════════════════════════════════════════
WITH sample AS (
  SELECT id, raw_data
  FROM public.matches
  WHERE raw_data IS NOT NULL
    AND jsonb_typeof(raw_data) = 'object'
  ORDER BY id DESC
  LIMIT 2500
)
SELECT
  e.key AS raw_key,
  COUNT(*) AS row_count,
  COUNT(DISTINCT m.id) AS distinct_match_ids
FROM sample AS m
CROSS JOIN LATERAL jsonb_each(m.raw_data) AS e
WHERE jsonb_typeof(e.value) IN ('number', 'string')
  AND (e.value #>> '{}') IN ('1', '2', '3')
GROUP BY e.key
ORDER BY row_count DESC, raw_key;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) Bir seviye iç nesne (örnek 1500 satır — iç içe daha ağır)
-- ═══════════════════════════════════════════════════════════════════════════
WITH sample AS (
  SELECT id, raw_data
  FROM public.matches
  WHERE raw_data IS NOT NULL
    AND jsonb_typeof(raw_data) = 'object'
  ORDER BY id DESC
  LIMIT 1500
)
SELECT
  (e1.key || '.' || e2.key) AS raw_key_path,
  COUNT(*) AS row_count,
  COUNT(DISTINCT m.id) AS distinct_match_ids
FROM sample AS m
CROSS JOIN LATERAL jsonb_each(m.raw_data) AS e1
CROSS JOIN LATERAL jsonb_each(e1.value) AS e2
WHERE jsonb_typeof(e1.value) = 'object'
  AND jsonb_typeof(e2.value) IN ('number', 'string')
  AND (e2.value #>> '{}') IN ('1', '2', '3')
GROUP BY e1.key, e2.key
ORDER BY row_count DESC, raw_key_path;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) İsim ipucu: MB / MBS adı ve 1–3 (örnek küme; tam tablo değil)
-- ═══════════════════════════════════════════════════════════════════════════
WITH sample AS (
  SELECT id, raw_data
  FROM public.matches
  WHERE raw_data IS NOT NULL
    AND jsonb_typeof(raw_data) = 'object'
  ORDER BY id DESC
  LIMIT 2500
)
SELECT
  e.key AS raw_key,
  (e.value #>> '{}') AS val,
  COUNT(*) AS row_count
FROM sample AS m
CROSS JOIN LATERAL jsonb_each(m.raw_data) AS e
WHERE jsonb_typeof(e.value) IN ('number', 'string')
  AND (e.value #>> '{}') IN ('1', '2', '3')
  AND (
    upper(replace(e.key, ' ', '')) IN ('MB', 'MBS')
    OR (upper(e.key) LIKE '%MBS%' AND upper(e.key) NOT LIKE '%KOD%')
  )
GROUP BY e.key, (e.value #>> '{}')
ORDER BY row_count DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4) Tek maç — sadece "3" ve MB/MBS: ayrı dosya (tek Run ile güvenli)
--    → sql/discover-single-match-value-3.sql  (id = 2881413 örnek; değiştirin)
-- ═══════════════════════════════════════════════════════════════════════════
