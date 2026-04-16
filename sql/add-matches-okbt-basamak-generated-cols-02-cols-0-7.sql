-- PARÇA 2/3 — Parça 1’den sonra çalıştırın (obktb_0 … obktb_7).

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_0 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 0))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_1 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 1))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_2 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 2))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_3 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 3))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_4 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 4))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_5 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 5))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_6 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 6))::text) STORED;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_7 text
  GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 7))::text) STORED;
