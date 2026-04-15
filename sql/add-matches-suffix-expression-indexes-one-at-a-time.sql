-- Sadece indeks oluşturma: her satırı Supabase SQL Editor’de TEK TEK seçip Run.
-- Önce add-matches-suffix-expression-indexes.sql içindeki DROP + fonksiyon çalışmış olmalı.
-- tuple concurrently updated aldıysanız bu yöntemi kullanın.

CREATE INDEX IF NOT EXISTS idx_matches_sfx_id_3 ON public.matches (public.matches_sfx_mod(id, 1000));
-- ↓ bir sonraki satıra geçmeden önce Success görün

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
