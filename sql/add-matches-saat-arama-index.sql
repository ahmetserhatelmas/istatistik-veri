-- saat_arama indeksleri — cf_saat / tarama_q için.
--
-- Önce:
--   1) sql/add-matches-saat-arama-column.sql (kolon + trigger)
--   2) sql/backfill-matches-saat-arama-chunk.sql (veri doldurma)
--
-- İki indeks:
--   - pg_trgm GIN: ortada joker içeren ILIKE (%22%, _?:__ vb.) için.
--   - B-tree text_pattern_ops: baştan sabit ILIKE (22%, 01:%) için hızlı arama.
--
-- Bu dosya CONCURRENTLY kullanmaz — Supabase SQL Editor tek transaction'da
-- çalıştırır ve CONCURRENTLY'yi yasaklar (25001). Büyük tabloda kısa süreli yazma
-- kilidi oluşabilir. Alternatif: psql + CREATE INDEX CONCURRENTLY (ayrı dosya).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram: "%22%", "0?:*" → _?:% gibi orta/joker patternler için.
CREATE INDEX IF NOT EXISTS idx_matches_saat_arama_trgm
  ON public.matches USING gin (saat_arama gin_trgm_ops);

-- B-tree (pattern ops): "22%", "01:%" gibi baştan sabit patternler için.
-- text_pattern_ops LIKE/ILIKE olmadan LIKE için optimize; ILIKE için trigram indeks devreye girer,
-- ancak eşitlik (saat_arama = '01:30') ve ORDER BY için de yardımcıdır.
CREATE INDEX IF NOT EXISTS idx_matches_saat_arama_btree
  ON public.matches (saat_arama text_pattern_ops);
