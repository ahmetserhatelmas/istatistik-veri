-- Saat sütunu `time without time zone` — PostgREST ILIKE doğrudan `saat` üzerinde çalışmaz.
-- `saat_arama` metin kolonu: uygulama `cf_saat` / `tarama_q` için bunu kullanır.
--
-- Bu dosya YALNIZCA hızlı DDL (kolon + fonksiyon + tetikleyici). Büyük UPDATE yok —
-- Supabase SQL Editor "upstream timeout" vermesin diye backfill ayrı dosyada.
--
-- Sıra:
--   1) Bu dosyayı çalıştırın (bir kez).
--   2) sql/backfill-matches-saat-arama-chunk.sql dosyasını tekrar tekrar çalıştırın (0 satır olana kadar).
--   3) create-matches-suffix-view.sql yenileyin (m.* ile saat_arama görünüme düşsün).
--
-- Tüm tabloyu tek seferde doldurmak için: psql + SET statement_timeout = 0; (aşağıdaki chunk dosyasındaki notlara bakın).

-- ── Kolon ───────────────────────────────────────────────────────────────────
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS saat_arama text;

COMMENT ON COLUMN public.matches.saat_arama IS
  'saat::text — ILIKE / tarama_q; backfill: backfill-matches-saat-arama-chunk.sql';

-- ── Tetikleyici (yeni / saat güncellenen satırlar) ───────────────────────────
CREATE OR REPLACE FUNCTION public.matches_set_saat_arama()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.saat_arama := CASE WHEN NEW.saat IS NULL THEN NULL ELSE NEW.saat::text END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matches_saat_arama ON public.matches;
CREATE TRIGGER trg_matches_saat_arama
BEFORE INSERT OR UPDATE OF saat ON public.matches
FOR EACH ROW
EXECUTE PROCEDURE public.matches_set_saat_arama();
