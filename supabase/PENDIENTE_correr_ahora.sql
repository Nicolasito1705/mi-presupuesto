-- ═══════════════════════════════════════════════════════════════════════════
-- CÓRRAME ANTES DE SUBIR LA NUEVA VERSIÓN DE LA APP
--
-- Junta las dos migraciones que le faltan a su base:
--
--   003 — el mes deja de saltar a las 7 de la tarde (hora UTC del servidor) y
--         se cierra de verdad el día 5, no solo cambia de etiqueta.
--   004 — la tabla del perfil: apodo y foto.
--
-- La 002 (abonos a metas) ya está aplicada; no aparece aquí.
--
-- CÓMO: Supabase → SQL Editor → New query → pegar todo → Run.
-- Es idempotente y no borra ni modifica ningún dato suyo.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 003 ───────────────────────────────────────────────────────────────
-- La zona horaria de la app. Si algún día tiene usuarios en otro país, esto es
-- lo que habría que mover a una preferencia por usuario.
create or replace function public.app_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Bogota')::date;
$$;

-- El mes activo, en orden de preferencia:
--
--   1. donde terminó el último cierre;
--   2. el mes del movimiento abierto más antiguo — este es el que importa:
--      ancla el mes activo a los DATOS, no al calendario, así que un julio sin
--      cerrar sigue siendo julio aunque el calendario ya diga agosto, y
--      sync_active_month() puede encontrarlo y cerrarlo cuando toque;
--   3. sin cierres y sin movimientos, el mes calendario a secas. Aquí no
--      aplica gracia: no hay nada atrasado que alcanzar, y una cuenta nueva
--      abierta el día 2 no debería arrancar en el mes pasado.
create or replace function public.active_month_start()
returns date
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select max(period_end) from public.monthly_closes where user_id = auth.uid()),
    (select date_trunc('month', min(occurred_on))::date
       from public.transactions
      where user_id = auth.uid() and closed_month_id is null),
    date_trunc('month', public.app_today())::date
  );
$$;

-- ── el cierre automático ───────────────────────────────────────────────────
-- Se llama al abrir la app. Si el mes activo ya pasó su periodo de gracia, lo
-- cierra de verdad (snapshot + congelar movimientos + totales a cero) antes de
-- que nadie lea nada. Así el mes nuevo siempre empieza limpio.
--
-- Cierra en bucle por si la app estuvo meses sin abrirse. El tope de 36 vueltas
-- es un seguro contra un bucle infinito, no un límite esperado.

create or replace function public.sync_active_month()
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  uid       uuid := auth.uid();
  guard     integer := 0;
  p_from    date;
  deadline  date;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  loop
    guard := guard + 1;
    exit when guard > 36;

    p_from := public.active_month_start();
    -- El mes vence el día 5 del mes siguiente.
    deadline := (p_from + interval '1 month' + interval '4 days')::date;

    exit when public.app_today() < deadline;

    perform public.close_month();
  end loop;

  return public.active_month_start();
end;
$$;

revoke execute on function public.sync_active_month() from public, anon;
revoke execute on function public.app_today()          from public, anon;
grant execute on function public.sync_active_month() to authenticated;
grant execute on function public.app_today()         to authenticated;


-- ─── 004 ───────────────────────────────────────────────────────────────
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
