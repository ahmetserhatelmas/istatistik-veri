-- Maç sonucu 1 / X / 2 → ms1_n / msx_n / ms2_n (cf_ms* sayısal süzüm + indeks).
--
-- ÖNEMLİ: Tablo çok büyükse GENERATED STORED tek seferde tüm satırları hesaplar →
-- Supabase SQL Editor “upstream timeout” verir. O durumda:
--   → sql/add-matches-ms-odds-numeric-cols-batched.sql (parçalı UPDATE + tetik)
--
-- Bu dosyayı yalnızca küçük tabloda veya psql / uzun statement_timeout ile deneyin.
-- Aşağıda oturum süresini kapatmayı deneriz (proje limiti yine de kesebilir).

SET statement_timeout = '0';
SET lock_timeout = '30min';

-- 1) Aşağıyı çalıştırın (veya batched dosyayı kullanın).
-- 2) sql/create-matches-suffix-view.sql yenileyin.

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

-- İndeksler: sql/add-matches-ms-odds-numeric-cols-indexes.sql
