-- Tek maç (matches.id): raw_data JSON içinde HER DERİNLİKTE değeri tam "3" olan yollar.
-- (997 satırlık liste = sadece ÜST düzey anahtarlar; bu sorgu iç içe nesne + dizileri de gezer.)
-- id’yi değiştirin: 2881413. Güvenlik: en fazla 25 seviye derinlik.

WITH RECURSIVE expand AS (
  /* kök: sadece matches + jsonb_each — expand’a referans yok */
  SELECT
    m.id,
    e.key::text AS path,
    e.value AS val,
    1 AS depth
  FROM public.matches m
  CROSS JOIN LATERAL jsonb_each(m.raw_data) e
  WHERE m.id = 2881413
    AND m.raw_data IS NOT NULL
    AND jsonb_typeof(m.raw_data) = 'object'

  UNION ALL

  /* PG: özyinelemeli terimde expand en fazla BİR kez — nesne + dizi LATERAL içinde birleşir */
  SELECT sub.id, sub.path, sub.val, sub.depth
  FROM expand x
  CROSS JOIN LATERAL (
    SELECT
      x.id,
      x.path || '.' || e.key,
      e.value,
      x.depth + 1
    FROM jsonb_each(
      CASE
        WHEN jsonb_typeof(x.val) = 'object' THEN x.val
        ELSE '{}'::jsonb
      END
    ) AS e

    UNION ALL

    SELECT
      x.id,
      x.path || '[' || (o.idx - 1)::text || ']',
      o.elem,
      x.depth + 1
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(x.val) = 'array' THEN x.val
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS o(elem, idx)
  ) AS sub(id, path, val, depth)
  WHERE x.depth < 25
)
SELECT
  e.id AS mac_id,
  e.path AS anahtar_yolu,
  e.val AS ham_json
FROM expand e
WHERE jsonb_typeof(e.val) IN ('number', 'string')
  AND (e.val #>> '{}') = '3'
ORDER BY e.path;

-- İsteğe bağlı: 1 veya 2 için — üstteki WHERE satırını şununla değiştirin:
--   AND (e.val #>> '{}') IN ('1', '2', '3')

-- Çok satır gelirse (birçok oran 3): son SELECT öncesine ekleyin:
-- WHERE (e.path ILIKE '%MB%' OR replace(upper(e.path), ' ', '') LIKE '%MBS%')

-- Üst düzey anahtar listesi (997 satır) → sql/discover-single-match-extras.sql
