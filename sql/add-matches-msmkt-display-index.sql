-- MsMKT süzümü için. Backfill tamamlandıktan sonra bir kez.
-- Timeout: psql ile SET statement_timeout = 0;

CREATE INDEX IF NOT EXISTS idx_matches_msmkt_display ON public.matches (msmkt_display);
