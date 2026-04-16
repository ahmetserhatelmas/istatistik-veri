-- Sadece kalan obktb_13 ve obktb_14 — Supabase SQL Editor "upstream timeout" verirse bunu psql ile çalıştırın.
-- Dashboard: Project Settings → Database → Connection string → URI (port 5432, direct).
--
--   psql "postgresql://postgres:ŞİFRE@db.PROJE_REF.supabase.co:5432/postgres" \
--     -v ON_ERROR_STOP=1 -f sql/add-matches-okbt-basamak-only-13-14-psql.sql
--
-- Tek oturumda timeout kapatılır; işlem bitene kadar bekleyin (büyük tabloda uzun sürebilir).

SET statement_timeout = 0;

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_13 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 13))::text) STORED;

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_14 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 14))::text) STORED;
