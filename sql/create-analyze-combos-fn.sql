-- ============================================================================
-- analyze_combos: Eşleştirme Paneli için RPC fonksiyonu
--
-- Kullanıcı seçtiği boyutların (maç kodu, kod_ms, kod_cs, kod_iy, kod_au)
-- seçili son-N hanelerini birleştirir ve kaç farklı kombinasyon olduğunu,
-- kaçının tekrar ettiğini ve hangi kombinasyonların hangi maç id'lerini
-- içerdiğini döndürür.
--
-- p_dims: ör. ARRAY['id:2','kod_ms:2','kod_cs:2'] → maç kodu son-2 + MS son-2 + CS son-2
--         format: "alan:n" — alan ∈ {id, kod_ms, kod_cs, kod_iy, kod_au}, n ∈ {2,3,4,5,...}
--
-- p_sonuc_iy / p_sonuc_ms / p_tarih_from / p_tarih_to / p_lig_adi / p_alt_lig_id:
--   kapsam filtreleri. NULL verilirse o filtre uygulanmaz.
--
-- Dönüş: (combo text, cnt bigint, ids bigint[])
--   combo: "74|38|27" gibi birleşik string (ayraç: '|')
--   cnt:   o kombinasyonda kaç maç var
--   ids:   maç id dizisi (limit yok, istemci tarafta süzülür)
-- ============================================================================

CREATE OR REPLACE FUNCTION analyze_combos(
  p_dims         text[],
  p_sonuc_iy     text    DEFAULT NULL,
  p_sonuc_ms     text    DEFAULT NULL,
  p_tarih_from   date    DEFAULT NULL,
  p_tarih_to     date    DEFAULT NULL,
  p_lig_adi      text    DEFAULT NULL,
  p_alt_lig_id   integer DEFAULT NULL,
  p_limit        integer DEFAULT 50000
)
RETURNS TABLE(combo text, cnt bigint, ids bigint[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_select_parts text[] := ARRAY[]::text[];
  v_sql          text;
  v_dim          text;
  v_col          text;
  v_n            int;
  v_parts        text[];
BEGIN
  IF p_dims IS NULL OR array_length(p_dims, 1) IS NULL THEN
    RETURN;
  END IF;

  -- her boyut için uygun SQL parçasını üret: lpad(right(abs(col)::text, n), n, '0')
  FOREACH v_dim IN ARRAY p_dims LOOP
    v_parts := string_to_array(v_dim, ':');
    IF array_length(v_parts, 1) <> 2 THEN
      RAISE EXCEPTION 'Geçersiz boyut formatı: %. Beklenen: "alan:n"', v_dim;
    END IF;
    v_col := v_parts[1];
    v_n   := v_parts[2]::int;

    IF v_col NOT IN ('id','kod_ms','kod_cs','kod_iy','kod_au') THEN
      RAISE EXCEPTION 'Desteklenmeyen alan: %. Geçerli: id, kod_ms, kod_cs, kod_iy, kod_au', v_col;
    END IF;
    IF v_n < 1 OR v_n > 10 THEN
      RAISE EXCEPTION 'Geçersiz hane sayısı: %. 1-10 arası olmalı.', v_n;
    END IF;

    v_select_parts := array_append(
      v_select_parts,
      format('lpad(right(abs(%I)::text, %s), %s, ''0'')', v_col, v_n, v_n)
    );
  END LOOP;

  -- dinamik SQL: combo = array_to_string(..., '|')
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
        -- boyutlardaki NULL değerleri dışla ki lpad patlaması olmasın
        %s
      LIMIT $7
    ) AS sub
    WHERE combo IS NOT NULL AND combo <> ''
    GROUP BY combo
    ORDER BY cnt DESC, combo ASC
  $f$,
    array_to_string(v_select_parts, ', '),
    -- null exclusion: her kullanılan kolon için
    (SELECT string_agg(format('AND %I IS NOT NULL', (string_to_array(d, ':'))[1]), ' ')
     FROM unnest(p_dims) d)
  );

  RETURN QUERY EXECUTE v_sql
    USING
      NULLIF(p_sonuc_iy, ''),
      NULLIF(p_sonuc_ms, ''),
      p_tarih_from,
      p_tarih_to,
      NULLIF(p_lig_adi, ''),
      p_alt_lig_id,
      p_limit;
END;
$$;

-- Yetki
GRANT EXECUTE ON FUNCTION analyze_combos(text[], text, text, date, date, text, integer, integer)
  TO anon, authenticated, service_role;

-- Örnek kullanım:
-- SELECT * FROM analyze_combos(
--   ARRAY['kod_ms:2','kod_cs:2'],
--   '1-0', '3-0',
--   '2026-01-01', '2026-12-31',
--   NULL, NULL, 50000
-- ) LIMIT 20;
