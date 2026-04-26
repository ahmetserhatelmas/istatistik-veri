-- Tek aktif oturum: her yeni girişte rev artar; diğer cihazlar periyodik kontrolde çıkış yapar.
-- Supabase SQL Editor'de bir kez çalıştırın.

create table if not exists public.auth_session_rev (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rev bigint not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists auth_session_rev_updated_at_idx on public.auth_session_rev (updated_at desc);

alter table public.auth_session_rev enable row level security;

-- Oturumdaki kullanıcı yalnızca kendi satırını okuyabilir (isteğe bağlı istemci okuması için).
drop policy if exists "auth_session_rev_select_own" on public.auth_session_rev;
create policy "auth_session_rev_select_own"
  on public.auth_session_rev
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Yazma yalnızca service_role (API route) ile; authenticated için INSERT/UPDATE politikası yok.

comment on table public.auth_session_rev is 'Giriş revizyonu: POST bump ile artırılır; başka cihazda girişte eski oturumlar çıkarılır.';

-- Atomik artırım (yarış güvenli). Yalnızca service_role çağırmalı (API).
create or replace function public.bump_auth_session_rev(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare r bigint;
begin
  insert into public.auth_session_rev (user_id, rev)
  values (p_user_id, 1)
  on conflict (user_id) do update
    set rev = public.auth_session_rev.rev + 1,
        updated_at = now()
  returning rev into r;
  return r;
end;
$$;

revoke all on function public.bump_auth_session_rev(uuid) from public;
grant execute on function public.bump_auth_session_rev(uuid) to service_role;
