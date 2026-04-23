-- `mkt_display` üzerinde süzüm için indeks. Backfill tamamlandıktan sonra bir kez çalıştırın.
-- Editörde timeout olursa psql ile: SET statement_timeout = 0; sonra bu dosya.

CREATE INDEX IF NOT EXISTS idx_matches_mkt_display ON public.matches (mkt_display);
