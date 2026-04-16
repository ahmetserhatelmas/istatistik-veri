-- Çok kaynaklı OKBT expression index'leri — Supabase SQL Editor versiyonu.
-- CONCURRENTLY yok: Editor'de her CREATE INDEX tek tek çalıştır (timeout olursa
-- psql ile sql/add-matches-okbt-multi-expression-indexes-psql.sql dosyasını çalıştır).
--
-- Her bloğu ayrı ayrı seçip Run düğmesine basın.
-- Önce en çok kullanılan kodms / kodau / macid ile başlayabilirsiniz.

-- ── macid (id) ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_0
  ON public.matches ( public.okbt_basamak_toplam(id::text, 0) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_1
  ON public.matches ( public.okbt_basamak_toplam(id::text, 1) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_2
  ON public.matches ( public.okbt_basamak_toplam(id::text, 2) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_3
  ON public.matches ( public.okbt_basamak_toplam(id::text, 3) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_4
  ON public.matches ( public.okbt_basamak_toplam(id::text, 4) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_5
  ON public.matches ( public.okbt_basamak_toplam(id::text, 5) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_6
  ON public.matches ( public.okbt_basamak_toplam(id::text, 6) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_7
  ON public.matches ( public.okbt_basamak_toplam(id::text, 7) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_8
  ON public.matches ( public.okbt_basamak_toplam(id::text, 8) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_9
  ON public.matches ( public.okbt_basamak_toplam(id::text, 9) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_10
  ON public.matches ( public.okbt_basamak_toplam(id::text, 10) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_11
  ON public.matches ( public.okbt_basamak_toplam(id::text, 11) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_12
  ON public.matches ( public.okbt_basamak_toplam(id::text, 12) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_13
  ON public.matches ( public.okbt_basamak_toplam(id::text, 13) );

CREATE INDEX IF NOT EXISTS idx_matches_macid_obktb_14
  ON public.matches ( public.okbt_basamak_toplam(id::text, 14) );

-- ── t1i (t1i) ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_0
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 0) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_1
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 1) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_2
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 2) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_3
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 3) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_4
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 4) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_5
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 5) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_6
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 6) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_7
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 7) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_8
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 8) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_9
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 9) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_10
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 10) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_11
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 11) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_12
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 12) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_13
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 13) );

CREATE INDEX IF NOT EXISTS idx_matches_t1i_obktb_14
  ON public.matches ( public.okbt_basamak_toplam(t1i::text, 14) );

-- ── t2i (t2i) ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_0
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 0) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_1
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 1) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_2
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 2) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_3
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 3) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_4
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 4) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_5
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 5) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_6
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 6) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_7
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 7) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_8
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 8) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_9
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 9) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_10
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 10) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_11
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 11) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_12
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 12) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_13
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 13) );

CREATE INDEX IF NOT EXISTS idx_matches_t2i_obktb_14
  ON public.matches ( public.okbt_basamak_toplam(t2i::text, 14) );

-- ── kodms (kod_ms) ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_0
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 0) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_1
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 1) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_2
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 2) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_3
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 3) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_4
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 4) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_5
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 5) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_6
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 6) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_7
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 7) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_8
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 8) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_9
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 9) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_10
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 10) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_11
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 11) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_12
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 12) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_13
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 13) );

CREATE INDEX IF NOT EXISTS idx_matches_kodms_obktb_14
  ON public.matches ( public.okbt_basamak_toplam(kod_ms::text, 14) );

-- ── kodcs (kod_cs) ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_0
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 0) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_1
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 1) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_2
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 2) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_3
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 3) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_4
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 4) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_5
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 5) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_6
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 6) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_7
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 7) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_8
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 8) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_9
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 9) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_10
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 10) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_11
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 11) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_12
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 12) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_13
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 13) );

CREATE INDEX IF NOT EXISTS idx_matches_kodcs_obktb_14
  ON public.matches ( public.okbt_basamak_toplam(kod_cs::text, 14) );

-- ── kodau (kod_au) ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_0
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 0) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_1
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 1) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_2
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 2) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_3
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 3) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_4
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 4) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_5
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 5) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_6
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 6) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_7
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 7) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_8
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 8) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_9
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 9) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_10
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 10) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_11
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 11) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_12
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 12) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_13
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 13) );

CREATE INDEX IF NOT EXISTS idx_matches_kodau_obktb_14
  ON public.matches ( public.okbt_basamak_toplam(kod_au::text, 14) );

