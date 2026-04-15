-- Parça 1/5 — id_arama (timeout olursa psql + SET statement_timeout = 0;)
SET statement_timeout = 0;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS id_arama text GENERATED ALWAYS AS (id::text) STORED;

COMMENT ON COLUMN public.matches.id_arama IS 'API: jokerli maç kodu ilike (tam DB).';
