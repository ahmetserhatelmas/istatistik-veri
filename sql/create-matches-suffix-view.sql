-- Üst bar "Kod / son N / rakam" kutusu: tüm tabloda son N haneye göre arama (PostgREST .eq ile).
-- Çalıştır: Supabase SQL Editor veya psql
-- İndeksler: sql/add-matches-suffix-expression-indexes.sql
-- matches’a yeni sütun eklendiyse (örn. sql/add-matches-code-arama-columns.sql, sql/add-matches-okbt-basamak-generated-cols.sql, sql/add-matches-mkt-display-from-id.sql, sql/add-matches-msmkt-display-from-kod-ms.sql + backfill): bu dosyayı yeniden çalıştırın ki m.* güncellensin.

CREATE OR REPLACE FUNCTION public.matches_sfx_mod(v bigint, modulus bigint)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT mod(abs(v), modulus);
$$;

COMMENT ON FUNCTION public.matches_sfx_mod(bigint, bigint) IS
  'Son ondalık N hane: mod(abs(v), 10^N). sfx_* görünümü + ifade indeksleri aynı fonksiyonu kullanır.';

-- matches’a yeni kolon eklenince m.* sırası değişir; CREATE OR REPLACE VIEW tek başına 42P16 verebilir
-- ("cannot change name of view column …"). Güvenli yenileme: düşür + oluştur.
DROP VIEW IF EXISTS public.matches_with_suffix_cols CASCADE;

CREATE VIEW public.matches_with_suffix_cols AS
SELECT
  m.*,
  public.matches_sfx_mod(m.id, 1000) AS sfx_id_3,
  public.matches_sfx_mod(m.id, 10000) AS sfx_id_4,
  public.matches_sfx_mod(m.id, 100000) AS sfx_id_5,
  public.matches_sfx_mod(m.kod_ms::bigint, 1000) AS sfx_kod_ms_3,
  public.matches_sfx_mod(m.kod_ms::bigint, 10000) AS sfx_kod_ms_4,
  public.matches_sfx_mod(m.kod_ms::bigint, 100000) AS sfx_kod_ms_5,
  public.matches_sfx_mod(m.kod_iy::bigint, 1000) AS sfx_kod_iy_3,
  public.matches_sfx_mod(m.kod_iy::bigint, 10000) AS sfx_kod_iy_4,
  public.matches_sfx_mod(m.kod_iy::bigint, 100000) AS sfx_kod_iy_5,
  public.matches_sfx_mod(m.kod_cs::bigint, 1000) AS sfx_kod_cs_3,
  public.matches_sfx_mod(m.kod_cs::bigint, 10000) AS sfx_kod_cs_4,
  public.matches_sfx_mod(m.kod_cs::bigint, 100000) AS sfx_kod_cs_5,
  public.matches_sfx_mod(m.kod_au::bigint, 1000) AS sfx_kod_au_3,
  public.matches_sfx_mod(m.kod_au::bigint, 10000) AS sfx_kod_au_4,
  public.matches_sfx_mod(m.kod_au::bigint, 100000) AS sfx_kod_au_5
FROM public.matches m;

COMMENT ON VIEW public.matches_with_suffix_cols IS
  'matches + sfx_{ref}_{n}; matches_sfx_mod ile — indekslerle aynı ifade (planlayıcı).';
