import type { Category, Transaction } from '../types';

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  /** The running total the database keeps on the category row. */
  total: number;
  pct: number;
  count: number;
  countLabel: string;
  /** Sub-totals by group_name, the breakdown the dashboard reveals on expand. */
  groups: { name: string; total: number }[];
};

export type Totals = { income: number; expense: number; balance: number };

export function totals(transactions: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.kind === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export function categoryRows(categories: Category[], transactions: Transaction[]): CategoryRow[] {
  const spent = transactions.reduce((a, t) => (t.kind === 'expense' ? a + t.amount : a), 0);

  return categories.map((c) => {
    const mine = transactions.filter((t) => t.kind === 'expense' && t.category_id === c.id);
    const byGroup = new Map<string, number>();
    for (const t of mine) byGroup.set(t.group_name, (byGroup.get(t.group_name) ?? 0) + t.amount);

    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      color: c.color,
      total: c.total,
      pct: spent > 0 ? Math.round((c.total / spent) * 100) : 0,
      count: mine.length,
      countLabel: mine.length === 1 ? '1 movimiento' : mine.length + ' movimientos',
      groups: [...byGroup].map(([name, total]) => ({ name, total })),
    };
  });
}

/**
 * The donut is a conic-gradient with one hard-edged stop per category — the
 * same technique the prototype used, now fed by the maintained totals.
 */
export function donutGradient(rows: CategoryRow[]): string {
  const spent = rows.reduce((a, r) => a + r.total, 0);
  if (spent <= 0) {
    return 'conic-gradient(color-mix(in srgb, var(--color-text) 10%, transparent) 0 100%)';
  }
  let acc = 0;
  const stops = rows.map((r) => {
    const from = (acc / spent) * 100;
    acc += r.total;
    return `${r.color} ${from.toFixed(2)}% ${((acc / spent) * 100).toFixed(2)}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}
