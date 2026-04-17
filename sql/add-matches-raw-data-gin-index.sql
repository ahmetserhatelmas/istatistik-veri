-- raw_data JSONB sütununa tek GIN index — tüm anahtarları kapsar.
--
-- NEDEN GIN?
--   • Tek index, raw_data içindeki her anahtar için @> (containment) sorgusunu hızlandırır.
--   • "KODAU15=35628 VE KODAU45=30932" gibi çok kolonlu filtreler: PostgreSQL her koşul için
--     ayrı bitmap taraması yapar ve bunları bitmap AND ile birleştirir → full scan yok.
--   • 997 anahtar için 997 ayrı index yerine sadece 1 index yeterli.
--
-- ÇALIŞMA MANTIĞI (kod tarafı):
--   • Joker yok ("35628") → raw_data @> '{"KODAU15":"35628"}' OR raw_data @> '{"KODAU15":35628}'
--     (string ve numeric JSONB tipleri için her ikisi de denenir)
--   • Joker var ("3*")   → raw_data->>'KODAU15' ILIKE '3%' (GIN yardımcı olmaz, fallback)
--
-- SUPABASE SQL EDITOR'DEN ÇALIŞTIRMA:
--   CONCURRENTLY kilitlemez; tablo yazılabilir kalır.
--   NOT: SQL Editor CONCURRENTLY'ı transaction içinde redder.
--   Aşağıdaki satırı SQL editörde TEK BAŞINA çalıştırın (başka SQL olmadan):

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_raw_data_gin
  ON public.matches USING gin (raw_data);

-- Oluşturma süresi: tablonun büyüklüğüne göre 5-30 dakika.
-- Bu süre boyunca tablo kilitlenmez (okuma/yazma devam eder).
--
-- Kontrol:
--   SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'matches' AND indexname LIKE '%gin%';
