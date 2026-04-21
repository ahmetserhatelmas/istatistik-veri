-- match_raw_kod_suffix backfill — TEK INSERT tüm tablo için Supabase SQL Editor’da
-- "upstream timeout" verir. Aşağıdaki parça parça yöntemi kullanın.
--
-- Önkoşul: sql/create-get-matches-by-raw-kod-suffix-fn.sql uygulanmış olmalı
-- (backfill_match_raw_kod_suffix_keyset + isteğe bağlı range fonksiyonu).
--
-- ── Yöntem A — SQL Editor (keyset; önerilen) ─────────────────────────────────
-- count(*) << max(id) iken id aralığı taraması on binlerce boş tur yapar; keyset yalnızca gerçek satır alır.
--
-- SELECT public.backfill_match_raw_kod_suffix_keyset(0, 800);   -- ilk tur
-- Sonuç: next_cursor = son batch’teki max(id), rows_inserted = match_raw_kod_suffix’e eklenen satır
-- Sonraki: SELECT public.backfill_match_raw_kod_suffix_keyset(<next_cursor>, 800);
-- next_cursor NULL olana kadar tekrarlayın.
--
-- ── Yöntem A2 — SQL Editor (id aralığı; küçük tablolar veya max(id) ≈ count) ──
-- SELECT min(id), max(id) FROM public.matches;
-- SELECT public.backfill_match_raw_kod_suffix_range(1, 50000);
-- …
--
-- Bittikten sonra bir kez:
-- ANALYZE public.match_raw_kod_suffix;
--
-- ── Yöntem B — Yerel script (önerilen) ───────────────────────────────────────
-- Keyset: npm run backfill:kod-suffix
--   npm run backfill:kod-suffix -- 1200        (batch satır sayısı)
--   npm run backfill:kod-suffix -- 800 true     (cursor sıfırla; eski id-range progress ile karışmasın)
--
-- Eski tek INSERT (yalnızca çok küçük tablolar / psql ile uzun timeout):
/*
INSERT INTO public.match_raw_kod_suffix (match_id, n, suffix)
SELECT DISTINCT
  m.id,
  g.n::smallint,
  (v.val % (power(10::numeric, g.n))::bigint) AS suffix
FROM public.matches m
CROSS JOIN LATERAL public.matches_raw_kod_numeric_values(m.raw_data) AS v
CROSS JOIN generate_series(2, 10) AS g(n)
ON CONFLICT DO NOTHING;

ANALYZE public.match_raw_kod_suffix;
*/
--
-- ── İlerleme / boyut (Editor timeout’undan kaçınmak için) ───────────────────
-- Ağır: COUNT(DISTINCT match_id) tüm suffix satırlarını tarar → "upstream timeout".
--
-- Hızlı — planner tahmini (ANALYZE sonrası daha iyi):
-- SELECT relname, n_live_tup::bigint AS tahmini_canli_satir
-- FROM pg_stat_user_tables
-- WHERE schemaname = 'public' AND relname IN ('matches', 'match_raw_kod_suffix');
--
-- Hızlı — indeks üzerinde uç değerler (PK match_id ile başlıyor):
-- SELECT MAX(id) AS matches_max_id FROM public.matches;
-- SELECT MAX(match_id) AS suffix_max_match_id FROM public.match_raw_kod_suffix;
-- (Backfill cursor’ın ~üzerinde mi diye kabaca bakılır; tam eşleşme değildir.)
--
-- Tam sayım için (mümkünse psql / doğrudan DB, uzun timeout):
-- SET statement_timeout = '10min';
-- SELECT COUNT(*) FILTER (WHERE raw_data IS NOT NULL AND jsonb_typeof(raw_data) = 'object') AS hedef_mac
-- FROM public.matches;
-- SELECT COUNT(DISTINCT match_id) AS indekslenen_mac FROM public.match_raw_kod_suffix;
