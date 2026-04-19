-- saat_arama indeksleri backfill'i yavaşlatıyor.
--
-- Postgres, indekslenmiş bir kolon güncellenince HOT (Heap-Only Tuple) optimizasyonunu
-- kullanamaz ve her satır için tüm satır ve indeksler yeniden yazılır. 389K satır
-- güncellenirken bu ~9 saat alır.
--
-- Bu dosyayı Supabase SQL Editor'de ÇALIŞTIR, sonra backfill'i yeniden başlat.
-- Backfill bitince sql/add-matches-saat-arama-index.sql'i tekrar çalıştırarak
-- indeksleri geri oluştur.

DROP INDEX IF EXISTS public.idx_matches_saat_arama_trgm;
DROP INDEX IF EXISTS public.idx_matches_saat_arama_btree;

-- Doğrulama: saat_arama üzerinde indeks kalmamalı
SELECT indexname
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND tablename = 'matches'
   AND indexdef LIKE '%saat_arama%';
