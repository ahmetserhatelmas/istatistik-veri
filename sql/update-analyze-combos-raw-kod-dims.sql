-- analyze_combos: raw_data içindeki KOD* alanlarını da boyut olarak destekle.
--
-- Yeni boyut formatı:
--   raw:<JSON_KEY>:<n>
-- Örnek:
--   raw:KODAU_6:2
--
-- Eski format aynı:
--   id:2 | kod_ms:3 | kod_cs:4 | kod_iy:5 | kod_au:2
--
-- Güvenlik: JSON_KEY yalnızca [A-Za-z0-9_]+ (UI/API ile aynı SAFE_RAW_JSON_KEY yaklaşımı)
--
-- Supabase SQL Editor tek transaction çalıştırır; büyük tabloda kısa süreli lock riski olabilir.
-- İsterseniz CONCURRENTLY gerektiren başka işlemlerden ayrı çalıştırın.

CREATE OR REPLACE FUNCTION analyze_combos(
  p_dims         text[],
  p_sonuc_iy     text    DEFAULT NULL,
  p_sonuc_ms     text    DEFAULT NULL,
  p_tarih_from   date    DEFAULT NULL,
  p_tarih_to     date    DEFAULT NULL,
  p_lig_adi      text    DEFAULT NULL,
  p_alt_lig_id   integer DEFAULT NULL,
  p_gun          integer DEFAULT NULL,
  p_ay           integer DEFAULT NULL,
  p_yil          integer DEFAULT NULL,
  p_limit        integer DEFAULT 50000
)
RETURNS TABLE(combo text, cnt bigint, ids bigint[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_select_parts text[] := ARRAY[]::text[];
  v_null_parts   text[] := ARRAY[]::text[];
  v_sql          text;
  v_dim          text;
  v_parts        text[];
  v_kind         text; -- 'col' | 'raw'
  v_col          text;
  v_json_key     text;
  v_n            int;
BEGIN
  IF p_dims IS NULL OR array_length(p_dims, 1) IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_dim IN ARRAY p_dims LOOP
    v_parts := string_to_array(v_dim, ':');

    -- raw:KEY:n  (KEY içinde ':' olmamalı)
    IF array_length(v_parts, 1) = 3 AND lower(v_parts[1]) = 'raw' THEN
      v_kind := 'raw';
      v_json_key := v_parts[2];
      v_n := v_parts[3]::int;

      IF v_json_key IS NULL OR v_json_key !~ '^[A-Za-z0-9_]+$' THEN
        RAISE EXCEPTION 'Geçersiz raw_data anahtarı: %', v_json_key;
      END IF;
      IF v_n < 1 OR v_n > 10 THEN
        RAISE EXCEPTION 'Geçersiz hane sayısı: %. 1-10 arası olmalı.', v_n;
      END IF;

      v_select_parts := array_append(
        v_select_parts,
        format(
          $s$lpad(right(abs((regexp_replace(coalesce(raw_data->>%L, ''), '[^0-9]', '', 'g')))::bigint)::text, %s), %s, '0')$s$,
          v_json_key,
          v_n,
          v_n
        )
      );

      v_null_parts := array_append(
        v_null_parts,
        format(
          $s$AND (raw_data->>%L) IS NOT NULL
              AND btrim(raw_data->>%L) <> ''
              AND regexp_replace(coalesce(raw_data->>%L, ''), '[^0-9]', '', 'g') <> ''$s$,
          v_json_key,
          v_json_key,
          v_json_key
        )
      );

    ELSE
      -- col:n
      IF array_length(v_parts, 1) <> 2 THEN
        RAISE EXCEPTION 'Geçersiz boyut formatı: %. Beklenen: "alan:n" veya "raw:ALAN:n"', v_dim;
      END IF;

      v_kind := 'col';
      v_col := v_parts[1];
      v_n   := v_parts[2]::int;

      IF v_col NOT IN ('id','kod_ms','kod_cs','kod_iy','kod_au') THEN
        RAISE EXCEPTION 'Desteklenmeyen alan: %. Geçerli: id, kod_ms, kod_cs, kod_iy, kod_au veya raw:KEY:n', v_col;
      END IF;
      IF v_n < 1 OR v_n > 10 THEN
        RAISE EXCEPTION 'Geçersiz hane sayısı: %. 1-10 arası olmalı.', v_n;
      END IF;

      v_select_parts := array_append(
        v_select_parts,
        format('lpad(right(abs(%I::text), %s), %s, ''0'')', v_col, v_n, v_n)
      );

      v_null_parts := array_append(
        v_null_parts,
        format('AND %I IS NOT NULL', v_col)
      );
    END IF;
  END LOOP;

  v_sql := format($f$
    SELECT combo, COUNT(*)::bigint AS cnt, array_agg(id ORDER BY id) AS ids
    FROM (
      SELECT id, array_to_string(ARRAY[%s], '|') AS combo
      FROM matches
      WHERE TRUE
        AND ($1 IS NULL OR sonuc_iy ILIKE $1)
        AND ($2 IS NULL OR sonuc_ms ILIKE $2)
        AND ($3 IS NULL OR tarih >= $3)
        AND ($4 IS NULL OR tarih <= $4)
        AND ($5 IS NULL OR lig_adi = $5)
        AND ($6 IS NULL OR alt_lig_id = $6)
        AND ($7 IS NULL OR EXTRACT(DAY   FROM tarih)::int = $7)
        AND ($8 IS NULL OR EXTRACT(MONTH FROM tarih)::int = $8)
        AND ($9 IS NULL OR EXTRACT(YEAR  FROM tarih)::int = $9)
        %s
      LIMIT $10
    ) AS sub
    WHERE combo IS NOT NULL AND combo <> ''
    GROUP BY combo
    ORDER BY cnt DESC, combo ASC
  $f$,
    array_to_string(v_select_parts, ', '),
    CASE WHEN array_length(v_null_parts, 1) IS NULL THEN '' ELSE array_to_string(v_null_parts, ' ') END
  );

  RETURN QUERY EXECUTE v_sql
    USING
      NULLIF(p_sonuc_iy, ''),
      NULLIF(p_sonuc_ms, ''),
      p_tarih_from,
      p_tarih_to,
      NULLIF(p_lig_adi, ''),
      p_alt_lig_id,
      p_gun,
      p_ay,
      p_yil,
      p_limit;
END;
$$;
