-- ═══════════════════════════════════════════════════════════════════════════
-- get_matches_by_raw_okbt_filter: ham veri OKBT sütunları için hızlı filtre RPC
--
-- Sorun:
--   Ham veri OKBT fonksiyonları (kodig_obktb_5, kodmsau15_obktb_3 vb.)
--   PostgREST WHERE koşulunda çağrıldığında tüm matches tablosunu (400k+ satır)
--   tarar ve Supabase API role statement_timeout'unu aşar.
--
-- Çözüm:
--   SECURITY DEFINER + set_config ile 120s timeout; dynamic SQL ile
--   ilgili OKBT fonksiyonunu çağırır, eşleşen match_id'leri döner.
--   Sonuçlar route.ts'de .in('id', ids) veya join ile uygulanır.
--
-- Kurulum: Supabase SQL Editor'de bir kez çalıştırın.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_matches_by_raw_okbt_filter(
  p_src  text,      -- örn: 'kodmsau15'
  p_idx  smallint,  -- örn: 5  (obktb_5)
  p_values smallint[] -- eşleşecek OKBT değerleri, örn: ARRAY[13] veya ARRAY[10,11,12,13,14,15,16,17,18,19]
)
RETURNS bigint[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120000'
AS $$
DECLARE
  r bigint[];
BEGIN

  -- Güvenlik: kaynak adı yalnızca küçük harf + rakamdan oluşabilir.
  IF p_src !~ '^[a-z][a-z0-9]*$' THEN
    RAISE EXCEPTION 'Geçersiz OKBT kaynak adı: %', p_src;
  END IF;

  IF p_idx < 0 OR p_idx > 25 THEN
    RAISE EXCEPTION 'Geçersiz OKBT idx: %', p_idx;
  END IF;

  -- raw_data JSON anahtarı: src lowercase → uppercase (kodmsau15 → KODMSAU15)
  -- Expression index mevcutsa: idx_m_raw_okbt_{src}_{idx} → anlık index scan
  -- Index yoksa: 400k satır full scan (yine de 120s içinde tamamlanmalı)
  EXECUTE format(
    'SELECT COALESCE(array_agg(DISTINCT m.id), ARRAY[]::bigint[])
     FROM public.matches m
     WHERE public.okbt_basamak_toplam(m.raw_data->>%L, %s) = ANY($1)',
    upper(p_src),
    p_idx::text
  )
  INTO r
  USING p_values;

  RETURN COALESCE(r, ARRAY[]::bigint[]);
END;
$$;

-- İzinler: yalnızca service_role çağırabilir (Next.js API route service key ile)
REVOKE ALL ON FUNCTION public.get_matches_by_raw_okbt_filter(text, smallint, smallint[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_matches_by_raw_okbt_filter(text, smallint, smallint[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_matches_by_raw_okbt_filter(text, smallint, smallint[])
  TO service_role;
