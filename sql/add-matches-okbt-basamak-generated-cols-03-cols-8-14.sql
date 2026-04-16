-- PARÇA 3/3 — Parça 2’den sonra çalıştırın (obktb_8 … obktb_14).

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_8 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 8))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_9 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 9))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_10 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 10))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_11 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 11))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_12 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 12))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_13 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 13))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_14 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 14))::text) STORED;
