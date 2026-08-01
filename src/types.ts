export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  position: number;
  /** Running total of the active month, maintained by a database trigger. */
  total: number;
};

export type TransactionKind = 'expense' | 'income';

/** An abono targets a debt or a goal — never both (enforced by a check constraint). */
export type AbonoTarget = { kind: 'debt' | 'goal'; id: string };

export type Transaction = {
  id: string;
  category_id: string | null;
  debt_id: string | null;
  goal_id: string | null;
  closed_month_id: string | null;
  kind: TransactionKind;
  group_name: string;
  description: string;
  amount: number;
  occurred_on: string; // YYYY-MM-DD
};

export type Debt = {
  id: string;
  name: string;
  total: number;
  paid: number;
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
};

/** A category's frozen state inside a monthly_closes snapshot. */
export type ArchivedCategory = {
  slug: string;
  name: string;
  icon: string;
  color: string;
  total: number;
};

export type MonthlyClose = {
  id: string;
  month_label: string;
  period_start: string;
  period_end: string;
  income: number;
  expense: number;
  balance: number;
  category_totals: ArchivedCategory[];
};

export type Profile = {
  nickname: string | null;
  avatar: string;
};

export type Screen =
  | 'home'
  | 'add'
  | 'detail'
  | 'debts'
  | 'ai'
  | 'history'
  | 'archive';
