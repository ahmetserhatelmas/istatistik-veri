-- Kod kutusu (ks_*): görünüm sfx_* = public.matches_sfx_mod(...). İndeks aynı çağrı olmalı.
--
-- Sıra: 1) create-matches-suffix-view.sql  2) bu dosya
--
-- ── Hata: ERROR: XX000: tuple concurrently updated ─────────────────────────
-- Nedeni: Üretimde tabloya yazım + aynı anda çoklu CREATE INDEX (veya tek transaction’da
--         peş peşe DDL) sistem kataloğunda çakışma.
-- Çözüm:
--   A) Bu dosyada önce sadece DROP bloğunu çalıştır; sonra
--      sql/add-matches-suffix-expression-indexes-one-at-a-time.sql içindeki
--      her CREATE satırını Supabase’te TEK TEK seçip Run (15 ayrı çalıştırma).
--   B) Veya düşük trafikte bu dosyanın tamamını yeniden dene.
--   C) psql kullanıyorsanız: sql/add-matches-suffix-expression-indexes-concurrent.sql
--      (CONCURRENTLY; her satır ayrı, transaction dışında).
--
-- “Failed to fetch”: tarayıcı/ağ; SQL çalışmamış olur, tekrar deneyin.

CREATE OR REPLACE FUNCTION public.matches_sfx_mod(v bigint, modulus bigint)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT mod(abs(v), modulus);
$$;

-- Önceki (eşleşmeyen) indeksleri kaldır — isimler aynı kalacak şekilde yeniden oluşturulur
DROP INDEX IF EXISTS idx_matches_sfx_id_3;
DROP INDEX IF EXISTS idx_matches_sfx_id_4;
DROP INDEX IF EXISTS idx_matches_sfx_id_5;
DROP INDEX IF EXISTS idx_matches_sfx_kod_ms_3;
DROP INDEX IF EXISTS idx_matches_sfx_kod_ms_4;
DROP INDEX IF EXISTS idx_matches_sfx_kod_ms_5;
DROP INDEX IF EXISTS idx_matches_sfx_kod_iy_3;
DROP INDEX IF EXISTS idx_matches_sfx_kod_iy_4;
DROP INDEX IF EXISTS idx_matches_sfx_kod_iy_5;
DROP INDEX IF EXISTS idx_matches_sfx_kod_cs_3;
DROP INDEX IF EXISTS idx_matches_sfx_kod_cs_4;
DROP INDEX IF EXISTS idx_matches_sfx_kod_cs_5;
DROP INDEX IF EXISTS idx_matches_sfx_kod_au_3;
DROP INDEX IF EXISTS idx_matches_sfx_kod_au_4;
DROP INDEX IF EXISTS idx_matches_sfx_kod_au_5;

CREATE INDEX IF NOT EXISTS idx_matches_sfx_id_3 ON public.matches (public.matches_sfx_mod(id, 1000));
CREATE INDEX IF NOT EXISTS idx_matches_sfx_id_4 ON public.matches (public.matches_sfx_mod(id, 10000));
CREATE INDEX IF NOT EXISTS idx_matches_sfx_id_5 ON public.matches (public.matches_sfx_mod(id, 100000));

CREATE INDEX IF NOT EXISTS idx_matches_sfx_kod_ms_3 ON public.matches (public.matches_sfx_mod(kod_ms::bigint, 1000));
CREATE INDEX IF NOT EXISTS idx_matches_sfx_kod_ms_4 ON public.matches (public.matches_sfx_mod(kod_ms::bigint, 10000));
CREATE INDEX IF NOT EXISTS idx_matches_sfx_kod_ms_5 ON public.matches (public.matches_sfx_mod(kod_ms::bigint, 100000));

CREATE INDEX IF NOT EXISTS idx_matches_sfx_kod_iy_3 ON public.matches (public.matches_sfx_mod(kod_iy::bigint, 1000));
CREATE INDEX IF NOT EXISTS idx_matches_sfx_kod_iy_4 ON public.matches (public.matches_sfx_mod(kod_iy::bigint, 10000));
CREATE INDEX IF NOT EXISTS idx_matches_sfx_kod_iy_5 ON public.matches (public.matches_sfx_mod(kod_iy::bigint, 100000));

CREATE INDEX IF NOT EXISTS idx_matches_sfx_kod_cs_3 ON public.matches (public.matches_sfx_mod(kod_cs::bigint, 1000));
CREATE INDEX IF NOT EXISTS idx_matches_sfx_kod_cs_4 ON public.matches (public.matches_sfx_mod(kod_cs::bigint, 10000));
CREATE INDEX IF NOT EXISTS idx_matches_sfx_kod_cs_5 ON public.matches (public.matches_sfx_mod(kod_cs::bigint, 100000));

CREATE INDEX IF NOT EXISTS idx_matches_sfx_kod_au_3 ON public.matches (public.matches_sfx_mod(kod_au::bigint, 1000));
CREATE INDEX IF NOT EXISTS idx_matches_sfx_kod_au_4 ON public.matches (public.matches_sfx_mod(kod_au::bigint, 10000));
CREATE INDEX IF NOT EXISTS idx_matches_sfx_kod_au_5 ON public.matches (public.matches_sfx_mod(kod_au::bigint, 100000));
