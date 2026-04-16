-- OKBT generated sütunları — her satır ayrı çalıştırılabilir.
-- Ön koşul: add-matches-okbt-basamak-generated-cols-01-function.sql
--
-- "upstream timeout" / Editor sürekli düşüyorsa: STORED generated kolon eklemek büyük tabloda
-- tüm satırları tek seferde hesaplar; Supabase SQL Editor’ın HTTP süresi yetmez.
-- Çözüm: Project Settings → Database → Connection string → URI ile DOĞRUDAN Postgres (port 5432,
-- session mode). Transaction pooler ile DDL kullanmayın.
--
-- psql örneği (tek kolon, şifreyi kendi URI’nizle değiştirin):
--   psql "postgresql://postgres:ŞİFRE@db.PROJE_REF.supabase.co:5432/postgres" \
--     -v ON_ERROR_STOP=1 \
--     -c "SET statement_timeout = 0; ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS obktb_13 text GENERATED ALWAYS AS ((public.okbt_basamak_toplam(kod_iy::text, 13))::text) STORED;"
--
-- Aşağıda tüm obktb_* için ALTER’lar var.
-- • SQL Editor: Her ALTER’ı TEK TEK seçip Run edin (tüm dosyayı birden çalıştırmayın).
-- • psql: Oturumda bir kez "SET statement_timeout = 0;" sonra bu dosyayı -f ile veya ALTER’ları tek tek.
-- Kaynak uyarısı (compute dolu) varsa gece / sakin saatte veya compute yükseltmesiyle deneyin.
--
-- İlerleme kontrolü:
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='matches' and column_name like 'obktb_%'
--   order by column_name;

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
