-- MsMKT (UI "MsMKT", col id `suffix3`): MS kodu `kod_ms` rakamlarının toplamı (metin; UI digitSum).
-- cf_suffix3 + doğru toplam için gerekli (PostgREST msmkt_display üzerinde süzer).
--
-- Büyük tabloda GENERATED STORED kullanılmıyor; kolon + tetikleyici + parçalı backfill.
-- Eski satırlar: sql/backfill-matches-msmkt-display-chunk.sql
-- İndeks (isteğe bağlı): sql/add-matches-msmkt-display-index.sql
-- Son: sql/create-matches-suffix-view.sql

CREATE OR REPLACE FUNCTION public.kod_ms_digit_sum_display(p_kod_ms bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    (
      SELECT sum((ascii(ch) - 48)::int)::text
      FROM regexp_split_to_table(
        regexp_replace(coalesce(p_kod_ms::text, ''), '[^0-9]', '', 'g'),
        ''
      ) AS t(ch)
    ),
    ''
  );
$$;

COMMENT ON FUNCTION public.kod_ms_digit_sum_display(bigint) IS
  'MsMKT: kod_ms rakamları toplamı (metin); MatchTable digitSum(kod_ms) ile aynı.';

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS msmkt_display text;

COMMENT ON COLUMN public.matches.msmkt_display IS
  'MsMKT (suffix3): kod_ms rakam toplamı; cf_suffix3. INSERT/kod_ms güncellemesinde tetikleyici.';

CREATE OR REPLACE FUNCTION public.matches_set_msmkt_display()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.msmkt_display := public.kod_ms_digit_sum_display(NEW.kod_ms);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matches_set_msmkt_display ON public.matches;
CREATE TRIGGER trg_matches_set_msmkt_display
BEFORE INSERT OR UPDATE OF kod_ms ON public.matches
FOR EACH ROW
EXECUTE PROCEDURE public.matches_set_msmkt_display();

COMMENT ON FUNCTION public.matches_set_msmkt_display() IS
  'matches.msmkt_display = kod_ms_digit_sum_display(kod_ms)';
