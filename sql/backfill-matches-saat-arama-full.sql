-- saat_arama TEK SEFERDE TAM BACKFILL — Supabase SQL Editor için.
--
-- Önce add-matches-saat-arama-column.sql çalışmış olmalı.
-- Format: to_char(saat, 'HH24:MI') → 5 karakter "HH:MM".
--
-- Supabase SQL Editor varsayılan statement_timeout'u (genelde 2 dk) yeterli değilse
-- aşağıdaki SET satırını çalıştırın; transaction boyunca 10 dakika izin verir.
-- Supabase planında izin verilen maksimum sınıra (çoğu planda 15 dakika) kadar
-- artırabilirsiniz. Transaction sonunda değer otomatik reset olur.
--
-- Bu komut SADECE ihtiyacı olan satırları günceller (saat dolu + saat_arama
-- yanlış veya boş). Tekrar çalıştırılması güvenlidir; değişen satır kalmaz.

SET LOCAL statement_timeout = '10min';

UPDATE public.matches
   SET saat_arama = to_char(saat, 'HH24:MI')
 WHERE saat IS NOT NULL
   AND (saat_arama IS NULL OR saat_arama IS DISTINCT FROM to_char(saat, 'HH24:MI'));

-- İsteğe bağlı: saat NULL ama saat_arama dolu satırları temizle.
UPDATE public.matches
   SET saat_arama = NULL
 WHERE saat IS NULL AND saat_arama IS NOT NULL;

-- Doğrulama:
SELECT
  COUNT(*) AS toplam,
  COUNT(saat)                                             AS saat_dolu,
  COUNT(saat_arama)                                       AS saat_arama_dolu,
  COUNT(*) FILTER (WHERE saat IS NOT NULL AND saat_arama IS NULL) AS backfill_bekleyen,
  COUNT(*) FILTER (WHERE saat_arama ~ '^\d{2}:\d{2}$')    AS format_dogru_hhmm
FROM public.matches;
