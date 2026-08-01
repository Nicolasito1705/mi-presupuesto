-- ═══════════════════════════════════════════════════════════════════════════
-- Mi Presupuesto — Supabase schema
--
-- Run this file once, whole, in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run).
-- It is idempotent: re-running it is safe.
--
-- Model
--   categories      payment buckets, each carrying a running `total` that is
--                   maintained automatically by a trigger (never write it by hand)
--   transactions    every movement. `kind` is 'expense' or 'income'.
--                   `closed_month_id` NULL = belongs to the active month.
--   debts           name / total / paid. `paid` is advanced automatically when a
--                   transaction carries a debt_id (an "abono").
--   goals           name / target / saved
--   monthly_closes  immutable snapshot of one closed month
--
-- Every table is scoped to auth.uid() by row-level security.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── tables ─────────────────────────────────────────────────────────────────

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  slug       text not null,
  name       text not null,
  icon       text not null default 'ph-tag',
  color      text not null default 'var(--mp-c1)',
  position   integer not null default 0,
  -- running total of the ACTIVE month's expenses in this category.
  -- Maintained by trg_transactions_apply; reset to 0 by close_month().
  total      numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.debts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  total      numeric(14, 2) not null check (total > 0),
  paid       numeric(14, 2) not null default 0 check (paid >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  target     numeric(14, 2) not null check (target > 0),
  saved      numeric(14, 2) not null default 0 check (saved >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.monthly_closes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  month_label  text not null,                  -- 'Julio 2026'
  period_start date not null,                  -- inclusive
  period_end   date not null,                  -- exclusive (first day of next month)
  income       numeric(14, 2) not null default 0,
  expense      numeric(14, 2) not null default 0,
  balance      numeric(14, 2) not null default 0,
  -- [{ slug, name, icon, color, total }] frozen at close time
  category_totals jsonb not null default '[]'::jsonb,
  closed_at    timestamptz not null default now(),
  unique (user_id, period_start)
);

create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  category_id     uuid references public.categories (id) on delete cascade,
  -- Un movimiento puede financiar una deuda o una meta (nunca las dos).
  debt_id         uuid references public.debts (id) on delete set null,
  goal_id         uuid references public.goals (id) on delete set null,
  closed_month_id uuid references public.monthly_closes (id) on delete cascade,
  kind            text not null default 'expense' check (kind in ('expense', 'income')),
  group_name      text not null default 'General',
  description     text not null,
  amount          numeric(14, 2) not null check (amount > 0),
  occurred_on     date not null default current_date,
  created_at      timestamptz not null default now(),
  -- an expense always lands in a category; income may be uncategorised
  constraint transactions_expense_needs_category
    check (kind = 'income' or category_id is not null),
  constraint transactions_one_target
    check (debt_id is null or goal_id is null)
);

create index if not exists transactions_active_idx
  on public.transactions (user_id, closed_month_id, occurred_on);
create index if not exists transactions_category_idx
  on public.transactions (category_id) where closed_month_id is null;
create index if not exists transactions_goal_idx
  on public.transactions (goal_id) where goal_id is not null;
create index if not exists monthly_closes_user_idx
  on public.monthly_closes (user_id, period_start desc);

-- ── running totals ─────────────────────────────────────────────────────────
-- One trigger keeps two derived numbers honest: categories.total (active month
-- only) and debts.paid (every abono, closed or not — a debt outlives the month).

create or replace function public.apply_transaction_deltas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_counts boolean := false;   -- did OLD contribute to a category total?
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

  -- category totals: back out the old contribution, add the new one
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

  -- debt and goal progress: only when the abono itself actually changed.
  -- Debt payment is clamped at the total (you cannot owe less than nothing);
  -- saving is not clamped at the target — overshooting a goal is good news.
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

drop trigger if exists trg_transactions_apply on public.transactions;
create trigger trg_transactions_apply
  after insert or update or delete on public.transactions
  for each row execute function public.apply_transaction_deltas();

-- Drift repair. Not needed in normal operation; safe to run any time.
create or replace function public.recalc_category_totals()
returns void
language sql
security definer
set search_path = public
as $$
  update public.categories c
     set total = coalesce((
       select sum(t.amount) from public.transactions t
        where t.category_id = c.id
          and t.closed_month_id is null
          and t.kind = 'expense'
     ), 0)
   where c.user_id = auth.uid();
$$;

-- ── the active month ───────────────────────────────────────────────────────
-- Derived, not stored: the active month starts the day the last close ended,
-- or at the top of the current calendar month for a brand-new account.

create or replace function public.active_month_start()
returns date
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select max(period_end) from public.monthly_closes where user_id = auth.uid()),
    date_trunc('month', current_date)::date
  );
$$;

create or replace function public.month_label(d date)
returns text
language sql
immutable
as $$
  select (array['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
         )[extract(month from d)::int] || ' ' || extract(year from d)::text;
$$;

-- ── close month ────────────────────────────────────────────────────────────
-- Snapshot the active month into monthly_closes, stamp its transactions with
-- that snapshot's id (so the movements survive, read-only), and zero the
-- category totals. All in one transaction.

create or replace function public.close_month()
returns public.monthly_closes
language plpgsql
security definer
set search_path = public
as $$
declare
  uid    uuid := auth.uid();
  p_from date;
  p_to   date;
  snap   public.monthly_closes;
  inc    numeric(14,2);
  exp    numeric(14,2);
  cats   jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  p_from := public.active_month_start();
  p_to   := (p_from + interval '1 month')::date;

  select coalesce(sum(amount) filter (where kind = 'income'), 0),
         coalesce(sum(amount) filter (where kind = 'expense'), 0)
    into inc, exp
    from public.transactions
   where user_id = uid and closed_month_id is null;

  select coalesce(jsonb_agg(jsonb_build_object(
           'slug', c.slug, 'name', c.name, 'icon', c.icon,
           'color', c.color, 'total', c.total
         ) order by c.position, c.created_at), '[]'::jsonb)
    into cats
    from public.categories c
   where c.user_id = uid;

  insert into public.monthly_closes
    (user_id, month_label, period_start, period_end, income, expense, balance, category_totals)
  values
    (uid, public.month_label(p_from), p_from, p_to, inc, exp, inc - exp, cats)
  returning * into snap;

  update public.transactions
     set closed_month_id = snap.id
   where user_id = uid and closed_month_id is null;

  update public.categories set total = 0 where user_id = uid;

  return snap;
end;
$$;

-- ── new-account seed ───────────────────────────────────────────────────────
-- The four payment buckets the design ships with. Colors are CSS custom
-- properties so they re-tint correctly in both light and dark themes.

create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, slug, name, icon, color, position) values
    (new.id, 'tarjeta',       'Tarjeta de crédito', 'ph-credit-card',        'var(--mp-c1)', 0),
    (new.id, 'efectivo',      'Efectivo',           'ph-money',              'var(--mp-c2)', 1),
    (new.id, 'transferencia', 'Transferencia',      'ph-arrows-left-right',  'var(--mp-c3)', 2),
    (new.id, 'otros',         'Otros',              'ph-dots-three-circle',  'var(--mp-c4)', 3)
  on conflict (user_id, slug) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_seed_categories on auth.users;
create trigger trg_seed_categories
  after insert on auth.users
  for each row execute function public.seed_default_categories();

-- ── row-level security ─────────────────────────────────────────────────────

alter table public.categories     enable row level security;
alter table public.transactions   enable row level security;
alter table public.debts          enable row level security;
alter table public.goals          enable row level security;
alter table public.monthly_closes enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categories', 'debts', 'goals'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format($f$
      create policy %I on public.%I
        for all to authenticated
        using (user_id = auth.uid())
        with check (user_id = auth.uid())
    $f$, t || '_owner', t);
  end loop;
end $$;

-- Transactions: the owner reads everything, but may only add to, edit, or
-- delete from the ACTIVE month. Once close_month() stamps a row with a
-- closed_month_id it is frozen — the archive is read-only in the database,
-- not just in the UI.
drop policy if exists transactions_read     on public.transactions;
drop policy if exists transactions_insert   on public.transactions;
drop policy if exists transactions_modify   on public.transactions;
drop policy if exists transactions_delete   on public.transactions;

create policy transactions_read on public.transactions
  for select to authenticated
  using (user_id = auth.uid());

create policy transactions_insert on public.transactions
  for insert to authenticated
  with check (user_id = auth.uid() and closed_month_id is null);

create policy transactions_modify on public.transactions
  for update to authenticated
  using (user_id = auth.uid() and closed_month_id is null)
  with check (user_id = auth.uid() and closed_month_id is null);

create policy transactions_delete on public.transactions
  for delete to authenticated
  using (user_id = auth.uid() and closed_month_id is null);

-- monthly_closes is archived and read-only: readable by its owner, written
-- only by close_month() (which runs security definer). No update, no delete.
drop policy if exists monthly_closes_read on public.monthly_closes;
create policy monthly_closes_read on public.monthly_closes
  for select to authenticated
  using (user_id = auth.uid());

-- Postgres grants EXECUTE to PUBLIC on every new function, so the grants below
-- only mean something once that default is revoked. None of the three leak data
-- to an anonymous caller as written (each keys off auth.uid(), and close_month
-- raises when it is null), but a security-definer function should never be
-- callable by a role that has no business calling it.
revoke execute on function public.close_month()            from public, anon;
revoke execute on function public.active_month_start()     from public, anon;
revoke execute on function public.recalc_category_totals() from public, anon;

grant execute on function public.close_month()            to authenticated;
grant execute on function public.active_month_start()     to authenticated;
grant execute on function public.recalc_category_totals() to authenticated;
