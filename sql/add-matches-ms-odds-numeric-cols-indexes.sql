-- ms*_n doldurulduktan SONRA bir kez çalıştırın (add-matches-ms-odds-numeric-cols-batched.sql aralıkları bittikten sonra).

SET statement_timeout = '300s';

CREATE INDEX IF NOT EXISTS idx_matches_ms1_n ON public.matches (ms1_n) WHERE ms1_n IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_msx_n ON public.matches (msx_n) WHERE msx_n IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_ms2_n ON public.matches (ms2_n) WHERE ms2_n IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_saat_arama_ms2_n ON public.matches (saat_arama, ms2_n)
  WHERE ms2_n IS NOT NULL AND saat_arama IS NOT NULL;

ANALYZE public.matches;
