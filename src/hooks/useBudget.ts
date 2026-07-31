import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { slugify } from '../lib/format';
import type { Category, Debt, Goal, MonthlyClose, Transaction } from '../types';

/** Palette the prototype hands to categories created after the seeded four. */
const EXTRA_COLORS = ['#796cbf', '#d2cefd', '#595d6c', '#e7e5fe', '#423a6a', '#b2b6ca'];

const num = (v: unknown): number => (typeof v === 'number' ? v : parseFloat(String(v ?? 0)) || 0);

export type Budget = ReturnType<typeof useBudget>;

/**
 * Every read and write against Supabase lives here.
 *
 * Totals are never computed client-side and cached: `categories.total` comes
 * straight from the column the database trigger maintains, so what the
 * dashboard shows is what the database holds. After any mutation we reload,
 * which is cheap at this data size and keeps the two in lockstep.
 */
export function useBudget(userId: string | null) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [closes, setCloses] = useState<MonthlyClose[]>([]);
  const [activeMonthStart, setActiveMonthStart] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadOnce = useCallback(async () => {
    const [cats, txs, dbt, gls, cls, ams] = await Promise.all([
      supabase.from('categories').select('*').order('position').order('created_at'),
      supabase
        .from('transactions')
        .select('*')
        .is('closed_month_id', null)
        .order('occurred_on')
        .order('created_at'),
      supabase.from('debts').select('*').order('created_at'),
      supabase.from('goals').select('*').order('created_at'),
      supabase.from('monthly_closes').select('*').order('period_start', { ascending: false }),
      supabase.rpc('active_month_start'),
    ]);

    const firstError =
      cats.error || txs.error || dbt.error || gls.error || cls.error || ams.error;
    if (firstError) return firstError;
    if (!alive.current) return null;

    setCategories(
      (cats.data ?? []).map((c) => ({
        id: c.id, slug: c.slug, name: c.name, icon: c.icon,
        color: c.color, position: c.position, total: num(c.total),
      })),
    );
    setTransactions(
      (txs.data ?? []).map((t) => ({
        id: t.id, category_id: t.category_id, debt_id: t.debt_id,
        closed_month_id: t.closed_month_id, kind: t.kind, group_name: t.group_name,
        description: t.description, amount: num(t.amount), occurred_on: t.occurred_on,
      })),
    );
    setDebts((dbt.data ?? []).map((d) => ({ id: d.id, name: d.name, total: num(d.total), paid: num(d.paid) })));
    setGoals((gls.data ?? []).map((g) => ({ id: g.id, name: g.name, target: num(g.target), saved: num(g.saved) })));
    setCloses(
      (cls.data ?? []).map((m) => ({
        id: m.id, month_label: m.month_label, period_start: m.period_start, period_end: m.period_end,
        income: num(m.income), expense: num(m.expense), balance: num(m.balance),
        category_totals: (m.category_totals ?? []).map((c: Record<string, unknown>) => ({
          slug: String(c.slug), name: String(c.name), icon: String(c.icon),
          color: String(c.color), total: num(c.total),
        })),
      })),
    );
    setActiveMonthStart(String(ams.data ?? ''));
    return null;
  }, []);

  /**
   * The first read after sign-in can lose a race with the freshly minted JWT:
   * PostgREST validates `iat` against its own clock and rejects a token issued
   * a fraction of a second "in the future" ("JWT issued at future"). It clears
   * on its own within a second, so one delayed retry turns a dead-looking
   * dashboard into a blink.
   */
  const refresh = useCallback(async () => {
    if (!userId) return;
    let err = await loadOnce();
    if (err) {
      await new Promise((r) => setTimeout(r, 1200));
      if (!alive.current) return;
      err = await loadOnce();
    }
    if (!alive.current) return;
    setError(err ? err.message : null);
  }, [userId, loadOnce]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh().finally(() => {
      if (alive.current) setLoading(false);
    });
  }, [userId, refresh]);

  /**
   * Runs a write, surfaces its error, and reloads on success.
   * PromiseLike, not Promise: postgrest-js builders are thenables.
   */
  const mutate = useCallback(
    async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
      if (!userId) return false;
      setBusy(true);
      try {
        const { error: err } = await fn();
        if (err) {
          setError(err.message);
          return false;
        }
        await refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        if (alive.current) setBusy(false);
      }
    },
    [userId, refresh],
  );

  // ── writes ───────────────────────────────────────────────────────────────

  /** Inserting the row is all it takes — the trigger moves the category total. */
  const addExpense = useCallback(
    (input: { categoryId: string; amount: number; description: string; date: string; group?: string }) =>
      mutate(() =>
        supabase.from('transactions').insert({
          user_id: userId,
          category_id: input.categoryId,
          kind: 'expense',
          group_name: input.group?.trim() || input.description.trim(),
          description: input.description.trim(),
          amount: input.amount,
          occurred_on: input.date,
        }),
      ),
    [mutate, userId],
  );

  const addIncome = useCallback(
    (input: { amount: number; description: string; date: string }) =>
      mutate(() =>
        supabase.from('transactions').insert({
          user_id: userId,
          category_id: null,
          kind: 'income',
          group_name: 'Ingreso',
          description: input.description.trim(),
          amount: input.amount,
          occurred_on: input.date,
        }),
      ),
    [mutate, userId],
  );

  /** An abono is an expense that also carries debt_id — the trigger advances `paid`. */
  const addDebtPayment = useCallback(
    (input: { debtId: string; debtName: string; categoryId: string; amount: number; date: string }) =>
      mutate(() =>
        supabase.from('transactions').insert({
          user_id: userId,
          category_id: input.categoryId,
          debt_id: input.debtId,
          kind: 'expense',
          group_name: 'Pago de deuda',
          description: 'Abono a ' + input.debtName,
          amount: input.amount,
          occurred_on: input.date,
        }),
      ),
    [mutate, userId],
  );

  const deleteTransaction = useCallback(
    (id: string) => mutate(() => supabase.from('transactions').delete().eq('id', id)),
    [mutate],
  );

  const createCategory = useCallback(
    (name: string) =>
      mutate(() =>
        supabase.from('categories').insert({
          user_id: userId,
          slug: slugify(name),
          name: name.trim(),
          icon: 'ph-tag',
          color: EXTRA_COLORS[Math.max(0, categories.length - 4) % EXTRA_COLORS.length],
          position: categories.length,
        }),
      ),
    [mutate, userId, categories.length],
  );

  const createDebt = useCallback(
    (input: { name: string; total: number; paid: number }) =>
      mutate(() =>
        supabase.from('debts').insert({
          user_id: userId, name: input.name.trim(), total: input.total, paid: input.paid,
        }),
      ),
    [mutate, userId],
  );

  const deleteDebt = useCallback(
    (id: string) => mutate(() => supabase.from('debts').delete().eq('id', id)),
    [mutate],
  );

  const createGoal = useCallback(
    (input: { name: string; target: number; saved: number }) =>
      mutate(() =>
        supabase.from('goals').insert({
          user_id: userId, name: input.name.trim(), target: input.target, saved: input.saved,
        }),
      ),
    [mutate, userId],
  );

  const deleteGoal = useCallback(
    (id: string) => mutate(() => supabase.from('goals').delete().eq('id', id)),
    [mutate],
  );

  /**
   * One RPC: snapshots the month into monthly_closes, stamps its transactions
   * with the snapshot id (so the movements survive, frozen) and zeroes every
   * category total. Atomic — a half-closed month is not reachable.
   */
  const closeMonth = useCallback(
    () => mutate(async () => await supabase.rpc('close_month')),
    [mutate],
  );

  return {
    categories, transactions, debts, goals, closes, activeMonthStart,
    loading, busy, error, setError, refresh,
    addExpense, addIncome, addDebtPayment, deleteTransaction,
    createCategory, createDebt, deleteDebt, createGoal, deleteGoal, closeMonth,
  };
}
