-- raw_data JSONB sütunundaki her anahtar için btree expression index oluştur.
--
-- NEDEN btree (GIN/trgm değil)?
--   • Tam değer araması (joker yok): "35628" → raw_data->>'KODAU45' = '35628'
--     btree index bu sorguyu O(log n)'de çözer.
--   • GIN/trgm'e kıyasla hem oluşturma süresi hem disk alanı çok daha az.
--   • Birden fazla sütunda AND koşulu: PostgreSQL bitmap index scan ile
--     her indeksi ayrı ayrı kullanıp sonuçları birleştirir → full scan yok.
--   • Jokerli arama (3* → ILIKE '3%'): btree text_pattern_ops ile de çalışır
--     (aşağıdaki create ifadeleri text_pattern_ops ekler).
--
-- ÇALIŞTIRMA (Supabase SQL editor zaman aşımı verir; psql kullanın):
--
--   ADIM 1 — indeks oluşturma komutlarını görüntüle:
--     psql "$DATABASE_URL" -f sql/add-matches-raw-data-expr-indexes.sql
--
--   ADIM 2 — doğrudan çalıştır (\gexec psql komutu):
--     psql "$DATABASE_URL" -c "
--       SELECT stmt FROM ($(cat sql/add-matches-raw-data-expr-indexes.sql)) s
--     " | psql "$DATABASE_URL"
--
--   Ya da kısaca: ADIM 1 çıktısını kopyalayıp psql'e yapıştırın.
--
-- NOT: CONCURRENTLY tablo kilidini ALMAZ; production'da güvenle çalışır.
--      Her komut ayrı bir transaction'da çalışmalıdır (psql satır satır halleder).

SELECT
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS '
    || 'idx_matches_raw_' || lower(replace(key, '_', '_'))
    || E'\n  ON public.matches ((raw_data->>' || quote_literal(key) || ') text_pattern_ops);'
  AS stmt
FROM (
  SELECT DISTINCT jsonb_object_keys(raw_data) AS key
  FROM public.matches
  LIMIT 500000
) sub
WHERE key ~ '^[A-Za-z0-9_]+$'
ORDER BY key;
