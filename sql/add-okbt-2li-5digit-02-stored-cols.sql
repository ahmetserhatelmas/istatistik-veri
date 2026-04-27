-- obktb_15..25: 2'li kombinasyonlar (15–24) + eksik A+C+D+E (25) için GENERATED STORED sütunlar.
-- ÖNCE: add-okbt-2li-5digit-01-function-update.sql çalıştırılmış olmalı.
-- SONRA: sql/create-matches-suffix-view.sql yeniden çalıştırın (m.* genişlemesi).
-- NOT: ALTER TABLE + STORED 44K satırda birkaç dakika sürebilir — Supabase Editor'da bekleyin.

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_15 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 15))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_16 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 16))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_17 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 17))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_18 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 18))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_19 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 19))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_20 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 20))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_21 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 21))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_22 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 22))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_23 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 23))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_24 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 24))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_25 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 25))::text) STORED;
