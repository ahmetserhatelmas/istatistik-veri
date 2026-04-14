-- ILIKE '%temel%' için hız: pg_trgm GIN (büyük tabloda 7–10s → çoğu zaman <1s).
--
-- ZORUNLU SIRA:
-- 1) sql/enable-pg-trgm.sql dosyasını ÖNCE çalıştır (veya Dashboard → Extensions → pg_trgm).
--    Aksi halde: operator class "gin_trgm_ops" does not exist
-- 2) Sonra BU dosyayı TEK BAŞINA Run et (CONCURRENTLY transaction içinde çalışmaz).

create index concurrently if not exists idx_matches_tarih_arama_trgm
  on public.matches using gin (tarih_arama gin_trgm_ops);
