-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 004 — perfil del usuario: apodo y foto abstracta
--
-- Una fila por cuenta, visible solo para su dueño. El avatar se guarda como
-- una clave corta ('aurora', 'brasa', …) y el degradado lo pinta la app: no
-- hay imágenes que alojar, ni Storage, ni archivos que moderar.
--
-- Correr entera en el SQL Editor. Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nickname   text,
  avatar     text not null default 'aurora',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_nickname_length check (nickname is null or char_length(nickname) <= 40)
);

alter table public.profiles enable row level security;

drop policy if exists profiles_owner on public.profiles;
create policy profiles_owner on public.profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- `updated_at` a mano en cada escritura sería una cosa más que recordar.
create or replace function public.touch_profile()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute function public.touch_profile();
