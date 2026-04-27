-- analyze_combos: takım süzümü (ev/dep/legacy OR) + İY/MS skorunu "fokus takım önce" normalize et.
--
-- Bu dosya `sql/update-analyze-combos-raw-kod-dims.sql` içindeki fonksiyonun tam yerine geçer
-- (raw:KEY:n boyutları dahil). Supabase’te yalnızca bu dosyayı çalıştırmanız yeterli.
--
-- Skor mantığı (matches.sonuc_iy / sonuc_ms = ev–dep, t1–t2):
--   p_swap_skor_all = true  → tüm satırlarda karşılaştırma öncesi skor ters çevrilir (yalnız dep kulvarı dolu).
--   p_takim_or_ilike dolu   → satır başına: t1 eşleşirse ham skor, t2 eşleşirse çevrilmiş (legacy takım= OR).
--   p_force_raw_skor        → İY/MS ILIKE daima ham ev–dep (swap / satır başı yok).
--   p_force_swap_skor       → İY/MS ILIKE daima tüm satırlarda ters sıra (panel “dep önce”).
--   Öncelik: force_raw > (force_swap OR swap_all) > or_ilike satır başı > ham.
--
-- Takım WHERE (tablo ile aynı basit model; karma OR/AND jokerleri yok):
--   p_takim_ev_ilike  → t1 ILIKE ...
--   p_takim_dep_ilike → t2 ILIKE ...
--   p_takim_or_ilike  → (t1 ILIKE ... OR t2 ILIKE ...) — bidir boşken üst `takim=`
--
-- Önceki imzaları kaldır (parametre sayısı değişti).
DROP FUNCTION IF EXISTS analyze_combos(text[], text, text, date, date, text, integer, integer, integer, integer, integer);
DROP FUNCTION IF EXISTS analyze_combos(
  text[], text, text, date, date, text, integer, integer, integer, integer,
  text, text, text, boolean, integer
);

CREATE OR REPLACE FUNCTION analyze_combos(
  p_dims              text[],
  p_sonuc_iy          text    DEFAULT NULL,
  p_sonuc_ms          text    DEFAULT NULL,
  p_tarih_from        date    DEFAULT NULL,
  p_tarih_to          date    DEFAULT NULL,
  p_lig_adi           text    DEFAULT NULL,
  p_alt_lig_id        integer DEFAULT NULL,
  p_gun               integer DEFAULT NULL,
  p_ay                integer DEFAULT NULL,
  p_yil               integer DEFAULT NULL,
  p_takim_ev_ilike    text    DEFAULT NULL,
  p_takim_dep_ilike   text    DEFAULT NULL,
  p_takim_or_ilike    text    DEFAULT NULL,
  p_swap_skor_all     boolean DEFAULT FALSE,
  p_force_raw_skor    boolean DEFAULT FALSE,
  p_force_swap_skor   boolean DEFAULT FALSE,
  p_limit             integer DEFAULT 50000
)
RETURNS TABLE(combo text, cnt bigint, ids bigint[])
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_select_parts text[] := ARRAY[]::text[];
  v_null_parts   text[] := ARRAY[]::text[];
  v_sql          text;
  v_dim          text;
  v_parts        text[];
  v_kind         text;
  v_col          text;
  v_json_key     text;
  v_n            int;
BEGIN
  SET LOCAL statement_timeout = '55s';
  IF p_dims IS NULL OR array_length(p_dims, 1) IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_dim IN ARRAY p_dims LOOP
    v_parts := string_to_array(v_dim, ':');

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

      -- regexp_replace 3./4. argüman: boş metin ve 'g' — şablonda '''', ''g'' kullanma:
      -- dinamik SQL'de virgül kaybolup "near g" hatası veriyordu.
      v_select_parts := array_append(
        v_select_parts,
        format(
          $s$lpad(right(regexp_replace(coalesce(raw_data->>%L, ''), '[^0-9]', '', 'g'), %s), %s, '0')$s$,
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
        format('lpad(right(%I::text, %s), %s, ''0'')', v_col, v_n, v_n)
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
        AND ($10 IS NULL OR t1::text ILIKE $10)
        AND ($11 IS NULL OR t2::text ILIKE $11)
        AND ($12 IS NULL OR (t1::text ILIKE $12 OR t2::text ILIKE $12))
        AND ($1 IS NULL OR (
          CASE
            WHEN COALESCE($14, FALSE) THEN sonuc_iy ILIKE $1
            WHEN COALESCE($15, FALSE) OR COALESCE($13, FALSE) THEN
              CASE
                WHEN btrim(coalesce(sonuc_iy, '')) ~ '^[0-9]+-[0-9]+$'
                THEN split_part(btrim(sonuc_iy), '-', 2) || '-' || split_part(btrim(sonuc_iy), '-', 1)
                ELSE sonuc_iy
              END ILIKE $1
            WHEN $12 IS NOT NULL AND btrim($12) <> '' THEN
              CASE
                WHEN t1::text ILIKE $12 THEN sonuc_iy
                WHEN t2::text ILIKE $12 THEN
                  CASE
                    WHEN btrim(coalesce(sonuc_iy, '')) ~ '^[0-9]+-[0-9]+$'
                    THEN split_part(btrim(sonuc_iy), '-', 2) || '-' || split_part(btrim(sonuc_iy), '-', 1)
                    ELSE sonuc_iy
                  END
                ELSE sonuc_iy
              END ILIKE $1
            ELSE sonuc_iy ILIKE $1
          END
        ))
        AND ($2 IS NULL OR (
          CASE
            WHEN COALESCE($14, FALSE) THEN sonuc_ms ILIKE $2
            WHEN COALESCE($15, FALSE) OR COALESCE($13, FALSE) THEN
              CASE
                WHEN btrim(coalesce(sonuc_ms, '')) ~ '^[0-9]+-[0-9]+$'
                THEN split_part(btrim(sonuc_ms), '-', 2) || '-' || split_part(btrim(sonuc_ms), '-', 1)
                ELSE sonuc_ms
              END ILIKE $2
            WHEN $12 IS NOT NULL AND btrim($12) <> '' THEN
              CASE
                WHEN t1::text ILIKE $12 THEN sonuc_ms
                WHEN t2::text ILIKE $12 THEN
                  CASE
                    WHEN btrim(coalesce(sonuc_ms, '')) ~ '^[0-9]+-[0-9]+$'
                    THEN split_part(btrim(sonuc_ms), '-', 2) || '-' || split_part(btrim(sonuc_ms), '-', 1)
                    ELSE sonuc_ms
                  END
                ELSE sonuc_ms
              END ILIKE $2
            ELSE sonuc_ms ILIKE $2
          END
        ))
        AND ($3 IS NULL OR tarih >= $3)
        AND ($4 IS NULL OR tarih <= $4)
        AND ($5 IS NULL OR lig_adi = $5)
        AND ($6 IS NULL OR alt_lig_id = $6)
        AND ($7 IS NULL OR EXTRACT(DAY   FROM tarih)::int = $7)
        AND ($8 IS NULL OR EXTRACT(MONTH FROM tarih)::int = $8)
        AND ($9 IS NULL OR EXTRACT(YEAR  FROM tarih)::int = $9)
        %s
      LIMIT $16
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
      NULLIF(p_takim_ev_ilike, ''),
      NULLIF(p_takim_dep_ilike, ''),
      NULLIF(p_takim_or_ilike, ''),
      COALESCE(p_swap_skor_all, FALSE),
      COALESCE(p_force_raw_skor, FALSE),
      COALESCE(p_force_swap_skor, FALSE),
      p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION analyze_combos(
  text[], text, text, date, date, text, integer, integer, integer, integer,
  text, text, text, boolean, boolean, boolean, integer
)
TO anon, authenticated, service_role;
