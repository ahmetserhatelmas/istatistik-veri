-- MKT (UI "MKT", col id `mbs`): maç kodu `id` rakamlarının toplamı 00–99, iki hane.
-- cf_mbs + tablo üstündeki doğru toplam sayımı için gerekli (PostgREST mkt_display üzerinde süzer).
--
-- Neden GENERATED STORED yok: büyük `matches` tablosunda tek ALTER tüm satırı yeniden
-- yazar; Supabase SQL Editor sık sık "upstream timeout" verir.
-- Bu dosya: anında kolon + INSERT/UPDATE tetikleyici. Eski satırlar için:
--   sql/backfill-matches-mkt-display-chunk.sql (aynı sorguyu birkaç kez çalıştırın).
-- İndeks (isteğe bağlı, backfill sonrası): sql/add-matches-mkt-display-index.sql
--
-- MsMKT (suffix3) için benzer kurulum: sql/add-matches-msmkt-display-from-kod-ms.sql
-- Son: sql/create-matches-suffix-view.sql (m.* güncellemesi).

CREATE OR REPLACE FUNCTION public.match_id_mkt_display(p_id bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lpad(
    least(
      99,
      greatest(
        0,
        coalesce(
          (
            SELECT sum((ascii(ch) - 48)::int)
            FROM regexp_split_to_table(
              regexp_replace(abs(p_id)::text, '[^0-9]', '', 'g'),
              ''
            ) AS t(ch)
          ),
          0
        )
      )
    )::text,
    2,
    '0'
  );
$$;

COMMENT ON FUNCTION public.match_id_mkt_display(bigint) IS
  'MKT: abs(id) rakamları toplamı 00–99; UI ile aynı.';

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS mkt_display text;

COMMENT ON COLUMN public.matches.mkt_display IS
  'MKT (mbs): id rakam toplamı; cf_mbs / tablo. INSERT ve id güncellemelerinde tetikleyici doldurur; eski satırlar için backfill.';

CREATE OR REPLACE FUNCTION public.matches_set_mkt_display()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.mkt_display := public.match_id_mkt_display(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matches_set_mkt_display ON public.matches;
CREATE TRIGGER trg_matches_set_mkt_display
BEFORE INSERT OR UPDATE OF id ON public.matches
FOR EACH ROW
EXECUTE PROCEDURE public.matches_set_mkt_display();

COMMENT ON FUNCTION public.matches_set_mkt_display() IS
  'matches.mkt_display = match_id_mkt_display(id)';
