-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 002 — abonos a metas de ahorro
--
-- Arregla un hueco de la versión inicial: se podían crear metas pero no había
-- forma de alimentarlas. Ahora un movimiento puede apuntar a una meta igual
-- que ya apuntaba a una deuda, y el mismo trigger mantiene `goals.saved`.
--
-- Correr entera en el SQL Editor de Supabase. Es idempotente: repetirla no
-- hace daño. No borra ni modifica ningún dato existente.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.transactions
  add column if not exists goal_id uuid references public.goals (id) on delete set null;

-- Un movimiento financia una deuda o una meta, nunca las dos.
alter table public.transactions
  drop constraint if exists transactions_one_target;
alter table public.transactions
  add constraint transactions_one_target
  check (debt_id is null or goal_id is null);

create index if not exists transactions_goal_idx
  on public.transactions (goal_id) where goal_id is not null;

-- El trigger de siempre, ahora con el bloque de metas. A diferencia de las
-- deudas, el ahorro NO se limita al objetivo: pasarse de la meta es una
-- buena noticia, no un error que haya que recortar.
create or replace function public.apply_transaction_deltas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_counts boolean := false;
  new_counts boolean := false;
  target_changed boolean := false;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    old_counts := old.closed_month_id is null
              and old.kind = 'expense'
              and old.category_id is not null;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    new_counts := new.closed_month_id is null
              and new.kind = 'expense'
              and new.category_id is not null;
  end if;
  if tg_op = 'UPDATE' then
    target_changed := old.debt_id is distinct from new.debt_id
                   or old.goal_id is distinct from new.goal_id
                   or old.amount <> new.amount;
  end if;

  -- totales de categoría
  if old_counts then
    update public.categories
       set total = greatest(0, total - old.amount)
     where id = old.category_id;
  end if;
  if new_counts then
    update public.categories
       set total = total + new.amount
     where id = new.category_id;
  end if;

  -- deudas y metas: solo cuando el abono en sí cambió
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and target_changed) then
    if old.debt_id is not null then
      update public.debts
         set paid = greatest(0, paid - old.amount)
       where id = old.debt_id;
    end if;
    if old.goal_id is not null then
      update public.goals
         set saved = greatest(0, saved - old.amount)
       where id = old.goal_id;
    end if;
  end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and target_changed) then
    if new.debt_id is not null then
      update public.debts
         set paid = least(total, paid + new.amount)
       where id = new.debt_id;
    end if;
    if new.goal_id is not null then
      update public.goals
         set saved = saved + new.amount
       where id = new.goal_id;
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Nota: aquí NO va una función de recálculo como la de categorías.
-- `goals.saved` y `debts.paid` admiten un saldo inicial al crearlos ("ya
-- ahorrado", "ya pagado") que no tiene ningún movimiento detrás. Recalcularlos
-- desde la tabla de transacciones borraría ese saldo.
