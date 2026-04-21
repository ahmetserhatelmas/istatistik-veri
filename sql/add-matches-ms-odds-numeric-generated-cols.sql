-- Maç sonucu 1 / X / 2 oranları (metin) için güvenli sayı kolonları — cf_ms1 / cf_msx / cf_ms2
-- ile < > aralığı ve PostgREST count doğru çalışır (geçersiz / boş / "-" → NULL).
--
-- 1) Bu dosyayı Supabase SQL Editor’de çalıştırın.
-- 2) Ardından sql/create-matches-suffix-view.sql dosyasını tekrar çalıştırın (m.* ile yeni kolonlar görünüme düşsün).

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS ms1_n double precision
  GENERATED ALWAYS AS (
    CASE
      WHEN btrim(ms1) ~ '^[0-9]+([.,][0-9]+)?$'
      THEN replace(btrim(ms1), ',', '.')::double precision
      ELSE NULL
    END
  ) STORED;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS msx_n double precision
  GENERATED ALWAYS AS (
    CASE
      WHEN btrim(msx) ~ '^[0-9]+([.,][0-9]+)?$'
      THEN replace(btrim(msx), ',', '.')::double precision
      ELSE NULL
    END
  ) STORED;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS ms2_n double precision
  GENERATED ALWAYS AS (
    CASE
      WHEN btrim(ms2) ~ '^[0-9]+([.,][0-9]+)?$'
      THEN replace(btrim(ms2), ',', '.')::double precision
      ELSE NULL
    END
  ) STORED;

COMMENT ON COLUMN public.matches.ms1_n IS 'MS1 oranı (sayı); metin süzümü ms1, karşılaştırma cf_* için ms1_n.';
COMMENT ON COLUMN public.matches.msx_n IS 'MSX oranı (sayı); metin süzümü msx, karşılaştırma cf_* için msx_n.';
COMMENT ON COLUMN public.matches.ms2_n IS 'MS2 oranı (sayı); metin süzümü ms2, karşılaştırma cf_* için ms2_n.';

ANALYZE public.matches;

-- cf_ms* + cf_saat birlikte sık kullanılıyorsa planlayıcıya yardım (SQL Editor’de bir kez)
CREATE INDEX IF NOT EXISTS idx_matches_ms1_n ON public.matches (ms1_n) WHERE ms1_n IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_msx_n ON public.matches (msx_n) WHERE msx_n IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_ms2_n ON public.matches (ms2_n) WHERE ms2_n IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_saat_arama_ms2_n ON public.matches (saat_arama, ms2_n)
  WHERE ms2_n IS NOT NULL AND saat_arama IS NOT NULL;
