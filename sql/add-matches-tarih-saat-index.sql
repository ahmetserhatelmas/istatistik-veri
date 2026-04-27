-- matches tablosunda ORDER BY tarih DESC, saat hızlandırma indeksi.
-- Sayfalama sorgularında her istekte 44K satır sıralanmasını önler.
-- CONCURRENTLY: tabloyu kilitlemez, arka planda oluşturur (uzun sürebilir).
-- Supabase SQL Editor'da TEK BAŞINA (tek "Run") çalıştırın.

create index concurrently if not exists idx_matches_tarih_saat
  on public.matches (tarih desc, saat asc nulls last);
