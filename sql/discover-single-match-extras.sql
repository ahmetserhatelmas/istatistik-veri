-- İsteğe bağlı teşhis — ayrı Run.
-- Bu dosyadaki "tüm anahtarlar" sorgusu: raw_data’nın yalnızca ÜST düzey anahtarlarıdır
-- (~997 satır = JSON’ta o kadar üst anahtar var); iç içe alanları listelemez.
-- Tüm ağaçta "3" aramak için → sql/discover-single-match-value-3.sql

-- Üst düzende MB / MBS (büyük harf)
SELECT id, raw_data -> 'MB' AS mb, raw_data -> 'MBS' AS mbs
FROM public.matches
WHERE id = 2881413;

-- Tüm üst düzey anahtarlar (yüzlerce satır — sadece yapı görmek için)
SELECT e.key, LEFT(e.value::text, 80), jsonb_typeof(e.value)
FROM public.matches m
CROSS JOIN LATERAL jsonb_each(m.raw_data) e
WHERE m.id = 2881413
ORDER BY e.key;
