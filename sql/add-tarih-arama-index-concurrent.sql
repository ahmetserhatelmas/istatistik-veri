-- Bu dosyayı TEK BAŞINA çalıştırın (Supabase SQL Editor'da yalnızca bu pencere).
-- CONCURRENTLY transaction içinde çalışmaz; çoklu statement ile aynı "Run"a koymayın.
--
-- Avantaj: tabloyu uzun süre kilitlemez; arka planda indeks inşa eder, yine uzun sürebilir
-- ama uygulama genelde okunabilir kalır.
--
-- Önce add-tarih-arama.sql bittiyse ve tarih_arama doluysa çalıştırın.

create index concurrently if not exists idx_matches_tarih_arama_pattern
  on public.matches (tarih_arama text_pattern_ops);
