-- Supabase SQL Editor'da bir kez çalıştırın (indeks HARİÇ — aşağıdaki not).
-- GENERATED kolon date→text çevirisinde "not immutable" (42P17) verdiği için
-- normal TEXT kolon + BEFORE TRIGGER kullanılıyor.
--
-- NOT: CREATE INDEX büyük tabloda çok uzun sürer ve editor "Running..."da kalır.
-- İndeks için ayrı dosyayı kullanın: sql/add-tarih-arama-index-concurrent.sql

alter table public.matches drop column if exists tarih_arama;

alter table public.matches
  add column if not exists tarih_arama text;

create or replace function public.matches_set_tarih_arama()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.tarih_arama := lower(trim(
    coalesce(new.tarih::text, '')
    || ' '
    || coalesce(new.tarih_tr_gunlu, '')
  ));
  return new;
end;
$$;

drop trigger if exists trg_matches_tarih_arama on public.matches;

create trigger trg_matches_tarih_arama
  before insert or update on public.matches
  for each row
  execute function public.matches_set_tarih_arama();

-- Mevcut satırlar (büyük tabloda bu da uzun sürebilir; normal.)
update public.matches
set tarih_arama = lower(trim(
  coalesce(tarih::text, '')
  || ' '
  || coalesce(tarih_tr_gunlu, '')
));

comment on column public.matches.tarih_arama is
  'tarih + tarih_tr_gunlu birleşik lower metin; cf_tarih ILIKE ile eşleşir.';
