-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 003 — el mes ya no salta solo a medianoche UTC
--
-- Dos fallos, uno encima del otro:
--
-- 1. `active_month_start()` usaba `current_date`, que en el servidor es UTC.
--    Colombia va cinco horas atrás, así que el mes cambiaba a las 7 de la
--    tarde del último día, no a medianoche.
--
-- 2. El mes avanzaba SIN cerrar el anterior. Los movimientos viejos seguían
--    con `closed_month_id is null`, así que se sumaban al mes nuevo aunque el
--    rótulo ya dijera otra cosa. El total del mes entrante nacía contaminado.
--
-- Ahora: hora de Bogotá, cuatro días de gracia (el mes rota el día 5, no el
-- 1), y cuando la gracia vence el cierre se ejecuta de verdad en lugar de
-- limitarse a cambiar la etiqueta.
--
-- Correr entera en el SQL Editor. Idempotente, no toca ningún dato.
-- ═══════════════════════════════════════════════════════════════════════════

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
