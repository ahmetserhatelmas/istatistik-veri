-- Zaten eski add-tarih-arama.sql çalıştıysa: Supabase’te TEK sefer bu dosyayı çalıştırın.
-- tarih_arama içindeki tarih kısmı DD.MM.YYYY olur (hücre gösterimi + cf_tarih ILIKE uyumu).

create or replace function public.matches_set_tarih_arama()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  gun_ay_yil text;
  t text;
begin
  gun_ay_yil := '';
  if new.tarih is not null then
    if pg_typeof(new.tarih)::regtype::text in (
      'date', 'timestamp without time zone', 'timestamp with time zone'
    ) then
      gun_ay_yil := to_char(new.tarih::timestamp, 'DD.MM.YYYY');
    else
      t := trim(new.tarih::text);
      if t ~ '^\d{4}-\d{2}-\d{2}' then
        gun_ay_yil := to_char(left(t, 10)::date, 'DD.MM.YYYY');
      else
        gun_ay_yil := left(t, 10);
      end if;
    end if;
  end if;

  new.tarih_arama := lower(trim(
    coalesce(nullif(trim(new.tarih_tr_gunlu), ''), gun_ay_yil)
  ));
  return new;
end;
$$;

update public.matches
set tarih_arama = lower(trim(
  coalesce(
    nullif(trim(tarih_tr_gunlu), ''),
    (case
      when tarih is null then ''
      when pg_typeof(tarih)::regtype::text in (
        'date', 'timestamp without time zone', 'timestamp with time zone'
      ) then to_char(tarih::timestamp, 'DD.MM.YYYY')
      else
        case
          when trim(tarih::text) ~ '^\d{4}-\d{2}-\d{2}'
            then to_char(left(trim(tarih::text), 10)::date, 'DD.MM.YYYY')
          else left(trim(tarih::text), 10)
        end
    end)
  )
));
