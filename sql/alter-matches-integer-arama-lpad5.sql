-- Tam sayı *_arama sütunları: ham ::text (örn. "2497") jokerli ILIKE'da baştaki 0 ile
-- genişletilmiş desenle (örn. 0_497) uyuşmaz; UI 5 hane gösterimiyle uyum için lpad(5,'0').
-- Örn. *?497 → 0?497 → ILIKE 0_497 yalnızca "02497" metninde eşleşir.
--
-- Bağımlı görünüm: matches_with_suffix_cols (m.*) — önce düşürülür; sonunda yenileyin:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/create-matches-suffix-view.sql
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/alter-matches-integer-arama-lpad5.sql

SET statement_timeout = 0;
SET lock_timeout = '10min';

DROP VIEW IF EXISTS public.matches_with_suffix_cols CASCADE;

ALTER TABLE public.matches DROP COLUMN IF EXISTS t1i_arama;
ALTER TABLE public.matches DROP COLUMN IF EXISTS t2i_arama;
ALTER TABLE public.matches DROP COLUMN IF EXISTS lig_id_arama;
ALTER TABLE public.matches DROP COLUMN IF EXISTS alt_lig_id_arama;
ALTER TABLE public.matches DROP COLUMN IF EXISTS sezon_id_arama;
ALTER TABLE public.matches DROP COLUMN IF EXISTS bookmaker_id_arama;

ALTER TABLE public.matches
  ADD COLUMN t1i_arama text GENERATED ALWAYS AS (
    CASE WHEN t1i IS NULL THEN '' ELSE lpad(t1i::text, 5, '0') END
  ) STORED,
  ADD COLUMN t2i_arama text GENERATED ALWAYS AS (
    CASE WHEN t2i IS NULL THEN '' ELSE lpad(t2i::text, 5, '0') END
  ) STORED,
  ADD COLUMN lig_id_arama text GENERATED ALWAYS AS (
    CASE WHEN lig_id IS NULL THEN '' ELSE lpad(lig_id::text, 5, '0') END
  ) STORED,
  ADD COLUMN alt_lig_id_arama text GENERATED ALWAYS AS (
    CASE WHEN alt_lig_id IS NULL THEN '' ELSE lpad(alt_lig_id::text, 5, '0') END
  ) STORED,
  ADD COLUMN sezon_id_arama text GENERATED ALWAYS AS (
    CASE WHEN sezon_id IS NULL THEN '' ELSE lpad(sezon_id::text, 5, '0') END
  ) STORED,
  ADD COLUMN bookmaker_id_arama text GENERATED ALWAYS AS (
    CASE WHEN bookmaker_id IS NULL THEN '' ELSE lpad(bookmaker_id::text, 5, '0') END
  ) STORED;

COMMENT ON COLUMN public.matches.t1i_arama IS 'API: bidir_takimid (ev) jokerli — t1i 5 hane soldan 0 (UI ile uyum).';
COMMENT ON COLUMN public.matches.t2i_arama IS 'API: bidir_takimid (dep) jokerli — t2i 5 hane soldan 0 (UI ile uyum).';
COMMENT ON COLUMN public.matches.lig_id_arama IS 'API: cf_lig_id jokerli — lig_id 5 hane soldan 0.';
COMMENT ON COLUMN public.matches.alt_lig_id_arama IS 'API: cf_alt_lig_id jokerli — alt_lig_id 5 hane soldan 0.';
COMMENT ON COLUMN public.matches.sezon_id_arama IS 'API: cf_sezon_id jokerli — sezon_id 5 hane soldan 0.';
COMMENT ON COLUMN public.matches.bookmaker_id_arama IS 'API: cf_bookmaker_id jokerli — bookmaker_id 5 hane soldan 0.';
