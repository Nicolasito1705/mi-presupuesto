import { fmt, pct, toDt } from './format';
import type { CategoryRow, Totals } from './derive';
import type { Debt, Goal, MonthlyClose, Transaction } from '../types';

/**
 * The Asistente, without a language model.
 *
 * This is an intent matcher over the user's own rows: it normalises the
 * question, finds the first intent whose triggers appear in it, and answers
 * from the data. Every number below is read off the database — nothing is
 * invented and nothing leaves the browser.
 *
 * Its honest limit: it only understands questions someone anticipated. When
 * nothing matches it says so and lists what it *can* answer, which is far more
 * useful than a confident-sounding generic reply.
 */

export type Insight = { key: string; icon: string; color: string; title: string; body: string };

export type AssistantInput = {
  totals: Totals;
  rows: CategoryRow[];
  transactions: Transaction[];
  debts: Debt[];
  goals: Goal[];
  closes: MonthlyClose[];
  monthName: string;
  activeMonthStart: string;
};

// ── text handling ──────────────────────────────────────────────────────────

const MARKS = /[\u0300-\u036f]/g;

/** 'CUÁNTO gasté?' → 'cuanto gaste' — so accents and case never decide a match. */
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(MARKS, '').replace(/\s+/g, ' ').trim();
}

/**
 * Triggers match at a word boundary, so a needle can be a prefix ('gast' finds
 * "gasté" and "gastos") without matching mid-word. Plain `includes` made
 * "restaurantes" match the trigger 'antes' and answer the wrong question.
 */
function has(q: string, ...needles: string[]): boolean {
  return needles.some((n) => new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(q));
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : `${n} ${many}`;
}

function list(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
}

// ── derived facts, computed once per question ──────────────────────────────

type Facts = {
  expenses: Transaction[];
  income: Transaction[];
  daysElapsed: number;
  daysInMonth: number;
  dailyAverage: number;
  projection: number;
  biggest: Transaction | null;
  recurring: { description: string; times: number; total: number }[];
  byGroup: { name: string; total: number }[];
};

function daysInMonthOf(iso: string): number {
  const [y, m] = iso.split('-').map((n) => parseInt(n, 10));
  return new Date(y, m, 0).getDate();
}

function computeFacts(d: AssistantInput): Facts {
  const expenses = d.transactions.filter((t) => t.kind === 'expense');
  const income = d.transactions.filter((t) => t.kind === 'income');

  const daysInMonth = d.activeMonthStart ? daysInMonthOf(d.activeMonthStart) : 30;
  // How far into the month we are — bounded, so a stale clock can't distort it.
  const today = new Date().getDate();
  const daysElapsed = Math.min(daysInMonth, Math.max(1, today));

  const dailyAverage = d.totals.expense / daysElapsed;

  const byDescription = new Map<string, { description: string; times: number; total: number }>();
  for (const t of expenses) {
    const key = normalize(t.description);
    const prev = byDescription.get(key);
    if (prev) {
      prev.times += 1;
      prev.total += t.amount;
    } else {
      byDescription.set(key, { description: t.description, times: 1, total: t.amount });
    }
  }

  const byGroupMap = new Map<string, number>();
  for (const t of expenses) byGroupMap.set(t.group_name, (byGroupMap.get(t.group_name) ?? 0) + t.amount);

  return {
    expenses,
    income,
    daysElapsed,
    daysInMonth,
    dailyAverage,
    projection: dailyAverage * daysInMonth,
    biggest: expenses.reduce<Transaction | null>((best, t) => (!best || t.amount > best.amount ? t : best), null),
    recurring: [...byDescription.values()].filter((r) => r.times >= 2).sort((a, b) => b.total - a.total),
    byGroup: [...byGroupMap].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
  };
}

function sorted(rows: CategoryRow[]): CategoryRow[] {
  return rows.filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
}

// ── intents ────────────────────────────────────────────────────────────────

type Intent = {
  id: string;
  match: (q: string, d: AssistantInput) => boolean;
  answer: (d: AssistantInput, f: Facts, q: string) => string;
};

/** Does the question name one of the user's categories? */
function namedCategory(q: string, d: AssistantInput): CategoryRow | null {
  for (const c of d.rows) {
    const name = normalize(c.name);
    if (q.includes(name)) return c;
    // Also match the first significant word: 'tarjeta' finds 'Tarjeta de crédito'.
    const first = name.split(' ')[0];
    if (first.length >= 5 && q.includes(first)) return c;
  }
  return null;
}

const NO_DATA = 'Todavía no hay movimientos registrados en este mes, así que no tengo con qué responderte. Registra tu primer gasto en la pestaña Agregar.';

const INTENTS: Intent[] = [
  {
    id: 'help',
    match: (q) => has(q, 'que puedes', 'que sabes', 'ayuda', 'que te puedo preguntar', 'como funciona', 'opciones'),
    answer: () =>
      'Puedo responderte sobre tus propios datos: en qué gastas más, cuánto llevas y cuánto te queda, ' +
      'tu gasto promedio diario y la proyección a fin de mes, tus deudas y en cuánto las liquidarías, ' +
      'tus metas de ahorro, tus cargos repetidos, cómo vas contra los meses cerrados, y el detalle de ' +
      'cualquier categoría por su nombre.',
  },

  {
    id: 'projection',
    match: (q) => has(q, 'proyec', 'promedio', 'al dia', 'diario', 'fin de mes', 'voy a terminar', 'voy a gastar', 'ritmo'),
    answer: (d, f) => {
      if (d.totals.expense === 0) return NO_DATA;
      const base =
        `Llevas ${fmt(d.totals.expense)} en ${f.daysElapsed} ${f.daysElapsed === 1 ? 'día' : 'días'}, ` +
        `un promedio de ${fmt(f.dailyAverage)} diarios. A ese ritmo cerrarías ${d.monthName.toLowerCase()} en ${fmt(f.projection)}.`;
      if (d.totals.income <= 0) return base;
      return f.projection > d.totals.income
        ? `${base} Eso supera tus ${fmt(d.totals.income)} de ingresos por ${fmt(f.projection - d.totals.income)}.`
        : `${base} Te quedarían ${fmt(d.totals.income - f.projection)} sobre tus ingresos.`;
    },
  },

  {
    id: 'biggest-single',
    match: (q) =>
      has(q, 'mas car', 'mas costos', 'mas grande', 'mayor compra', 'mayor movimiento', 'compra mas'),
    answer: (d, f) => {
      if (!f.biggest) return NO_DATA;
      const cat = d.rows.find((c) => c.id === f.biggest!.category_id);
      return (
        `Tu movimiento más grande del mes es ${f.biggest.description} por ${fmt(f.biggest.amount)} ` +
        `(${toDt(f.biggest.occurred_on)}${cat ? ', en ' + cat.name : ''}). ` +
        `Representa ${pct(f.biggest.amount, d.totals.expense)}% de todo lo que llevas gastado.`
      );
    },
  },

  {
    id: 'recurring',
    match: (q) => has(q, 'suscrip', 'recurrente', 'repit', 'repet', 'fijo', 'mensualidad', 'cada mes'),
    answer: (d, f) => {
      if (f.recurring.length === 0) {
        return 'No veo cargos repetidos este mes: cada movimiento tiene una descripción distinta. Cuando registres el mismo concepto dos veces o más, aparecerá aquí.';
      }
      const top = f.recurring.slice(0, 4);
      const total = f.recurring.reduce((a, r) => a + r.total, 0);
      return (
        `Estos conceptos se repiten este mes: ` +
        list(top.map((r) => `${r.description} (${r.times} veces, ${fmt(r.total)})`)) +
        `. Entre todos los repetidos suman ${fmt(total)}, un ${pct(total, d.totals.expense)}% de tu gasto — ` +
        `son el primer lugar donde mirar si quieres recortar.`
      );
    },
  },

  {
    id: 'comparison',
    match: (q) => has(q, 'compar', 'mes pasado', 'mes anterior', 'antes', 'historial', 'meses cerrados', 'que el otro mes'),
    answer: (d, f) => {
      if (d.closes.length === 0) {
        return 'Todavía no has cerrado ningún mes, así que no tengo con qué comparar. Cuando cierres este mes desde el inicio, podré contrastarlo.';
      }
      const last = d.closes[0];
      const delta = d.totals.expense - last.expense;
      const avgClosed = d.closes.reduce((a, c) => a + c.expense, 0) / d.closes.length;
      const trend =
        delta > 0
          ? `Llevas ${fmt(delta)} más que todo ${last.month_label} (${fmt(last.expense)})`
          : delta < 0
            ? `Llevas ${fmt(-delta)} menos que todo ${last.month_label} (${fmt(last.expense)})`
            : `Vas exactamente igual que ${last.month_label} (${fmt(last.expense)})`;
      const pace = `Tu proyección a fin de mes es ${fmt(f.projection)}, contra un promedio de ${fmt(avgClosed)} en ${plural(d.closes.length, 'el único mes cerrado', 'meses cerrados')}.`;
      return `${trend}. ${pace}`;
    },
  },

  {
    id: 'debts',
    match: (q) => has(q, 'deuda', 'debo', 'abono', 'liquid', 'prestamo', 'credito', 'pagar'),
    answer: (d) => {
      if (d.debts.length === 0) return 'No tienes deudas registradas. Puedes crear una en la pestaña Deudas.';
      const lines = d.debts.map((x) => {
        const remaining = Math.max(0, x.total - x.paid);
        if (remaining === 0) return `${x.name} está liquidada.`;
        const paidThisMonth = d.transactions.reduce((a, t) => (t.debt_id === x.id ? a + t.amount : a), 0);
        const eta =
          paidThisMonth > 0
            ? ` A tu ritmo de este mes (${fmt(paidThisMonth)}) la liquidarías en ${Math.ceil(remaining / paidThisMonth)} meses.`
            : ' Aún no le abonas este mes.';
        return `${x.name}: te restan ${fmt(remaining)} de ${fmt(x.total)} (${pct(x.paid, x.total)}% pagado).${eta}`;
      });
      return lines.join(' ');
    },
  },

  {
    id: 'goals',
    match: (q) => has(q, 'meta', 'fondo', 'objetivo', 'ahorrado'),
    answer: (d) => {
      if (d.goals.length === 0) {
        return 'Aún no tienes metas de ahorro. Créalas en la pestaña Deudas para seguir su progreso mes a mes.';
      }
      return d.goals
        .map((g) => {
          const missing = Math.max(0, g.target - g.saved);
          if (missing === 0) return `${g.name} está completa (${fmt(g.target)}).`;
          return (
            `${g.name}: llevas ${fmt(g.saved)} de ${fmt(g.target)} (${pct(g.saved, g.target)}%), ` +
            `te faltan ${fmt(missing)}. Apartando ${fmt(Math.max(1, Math.round(missing / 6)))} al mes la completas en medio año.`
          );
        })
        .join(' ');
    },
  },

  {
    id: 'saving-advice',
    match: (q) => has(q, 'como ahorr', 'puedo ahorr', 'consejo', 'recort', 'reducir', 'gastar menos', 'recomienda', 'sugerencia'),
    answer: (d, f) => {
      if (d.totals.expense === 0) return NO_DATA;
      const top = sorted(d.rows)[0];
      const parts: string[] = [];
      if (top) {
        parts.push(
          `Tu mayor concentración está en ${top.name}: ${fmt(top.total)}, el ${top.pct}% de tu gasto. Recortar un 10% ahí te ahorra ${fmt(top.total * 0.1)} al mes.`,
        );
      }
      if (f.recurring.length > 0) {
        const r = f.recurring[0];
        parts.push(`${r.description} aparece ${r.times} veces y suma ${fmt(r.total)}; si es prescindible, ese es el recorte más fácil.`);
      }
      if (d.totals.income > 0) {
        parts.push(
          `Tu balance va en ${fmt(d.totals.balance)}. Apartar el 20% de tus ingresos serían ${fmt(d.totals.income * 0.2)} al mes.`,
        );
      }
      return parts.join(' ');
    },
  },

  {
    id: 'balance',
    match: (q) => has(q, 'balance', 'me queda', 'me alcanza', 'sobra', 'disponible', 'estoy bien'),
    answer: (d, f) => {
      if (d.totals.income === 0) {
        return `Todavía no registras ingresos este mes, así que tu balance es negativo por definición: ${fmt(d.totals.balance)}. Registra tu nómina en Agregar → Ingreso para que el balance tenga sentido.`;
      }
      const verdict =
        d.totals.balance < 0
          ? `Vas ${fmt(-d.totals.balance)} por encima de tus ingresos.`
          : `Te quedan ${fmt(d.totals.balance)} disponibles.`;
      return `Ingresos ${fmt(d.totals.income)}, gastos ${fmt(d.totals.expense)}. ${verdict} A tu ritmo actual cerrarías el mes gastando ${fmt(f.projection)}.`;
    },
  },

  {
    id: 'income',
    match: (q) => has(q, 'ingres', 'nomina', 'gane', 'gano', 'sueldo', 'salario', 'entrada'),
    answer: (d, f) => {
      if (d.totals.income === 0) {
        return 'No has registrado ingresos este mes. Puedes agregarlos en la pestaña Agregar → Ingreso.';
      }
      const sources = f.income.map((t) => `${t.description} (${fmt(t.amount)})`);
      return `Llevas ${fmt(d.totals.income)} de ingresos este mes: ${list(sources)}. Contra ${fmt(d.totals.expense)} de gasto, tu balance es ${fmt(d.totals.balance)}.`;
    },
  },

  {
    id: 'recent',
    match: (q) => has(q, 'ultimo', 'reciente', 'que compre', 'que he comprado', 'movimiento', 'en que gaste hoy'),
    answer: (_d, f) => {
      if (f.expenses.length === 0) return NO_DATA;
      // Sort by date rather than trusting insertion order — "últimos" must mean latest.
      const recent = [...f.expenses].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)).slice(0, 5);
      return (
        `Tus últimos movimientos: ` +
        list(recent.map((t) => `${t.description} ${fmt(t.amount)} (${toDt(t.occurred_on)})`)) +
        '.'
      );
    },
  },

  {
    id: 'total-spent',
    match: (q) => has(q, 'cuanto llevo', 'cuanto he gastado', 'cuanto gaste', 'total gastado', 'cuanto va', 'gasto total'),
    answer: (d, f) => {
      if (d.totals.expense === 0) return NO_DATA;
      const top = sorted(d.rows)[0];
      return (
        `Llevas ${fmt(d.totals.expense)} gastados en ${f.expenses.length} ${f.expenses.length === 1 ? 'movimiento' : 'movimientos'} de ${d.monthName.toLowerCase()}` +
        (top ? `, con ${top.name} a la cabeza (${fmt(top.total)}, ${top.pct}%).` : '.')
      );
    },
  },

  {
    id: 'categories',
    match: (q) => has(q, 'gast', 'categor', 'en que se me va', 'donde se va', 'mas plata', 'mas dinero'),
    answer: (d, f) => {
      const top = sorted(d.rows);
      if (top.length === 0) return NO_DATA;
      const ranked = top.slice(0, 3).map((c) => `${c.name} ${fmt(c.total)} (${c.pct}%)`);
      const group = f.byGroup[0];
      return (
        `Tu gasto se reparte así: ${list(ranked)}` +
        (group ? `. El rubro más grande es ${group.name} con ${fmt(group.total)}.` : '.')
      );
    },
  },
];

/** Answers questions that name a category — checked before the generic intents. */
function categoryAnswer(c: CategoryRow): string {
  if (c.total === 0) {
    return `No has registrado nada en ${c.name} este mes.`;
  }
  const groups = [...c.groups].sort((a, b) => b.total - a.total).slice(0, 3);
  return (
    `En ${c.name} llevas ${fmt(c.total)} este mes, en ${c.count} ${c.count === 1 ? 'movimiento' : 'movimientos'} ` +
    `(${c.pct}% de tu gasto total)` +
    (groups.length > 0 ? `. Lo más grande: ${list(groups.map((g) => `${g.name} ${fmt(g.total)}`))}.` : '.')
  );
}

const FALLBACK =
  'No entendí esa pregunta — respondo con reglas fijas, no soy un modelo de lenguaje, así que solo cubro ' +
  'ciertos temas. Prueba con: «¿en qué gasto más?», «¿cuánto me queda?», «¿voy a fin de mes?», ' +
  '«¿cómo van mis deudas?» o el nombre de una categoría.';

/** Questions worth surfacing as chips — all of them hit a real intent. */
export const SUGGESTIONS = [
  '¿En qué gasto más?',
  '¿Cuánto me queda?',
  '¿Cómo voy a fin de mes?',
  '¿Cómo van mis deudas?',
  '¿Qué cargos se me repiten?',
  '¿Cómo puedo ahorrar?',
];

export function reply(question: string, d: AssistantInput): string {
  const q = normalize(question);
  const facts = computeFacts(d);

  // A named category wins over the generic intents, unless the question is
  // clearly about something else that happens to mention it.
  const offTopic = has(q, 'deuda', 'meta', 'compar', 'proyec', 'ahorr', 'repit', 'repet');

  const cat = namedCategory(q, d);
  if (cat && !offTopic) return categoryAnswer(cat);

  // A group ("Restaurantes", "Renta") is finer-grained than a category, so a
  // question that names one is asking about it — not about the month total.
  const group = offTopic ? undefined : facts.byGroup.find((g) => q.includes(normalize(g.name)));
  if (group) {
    const times = facts.expenses.filter((t) => t.group_name === group.name).length;
    return (
      `En ${group.name} llevas ${fmt(group.total)} este mes, en ${plural(times, '1 movimiento', 'movimientos')} ` +
      `(${pct(group.total, d.totals.expense)}% de tu gasto).`
    );
  }

  for (const intent of INTENTS) {
    if (intent.match(q, d)) return intent.answer(d, facts, q);
  }

  return FALLBACK;
}

// ── dashboard insights ─────────────────────────────────────────────────────

export function buildInsights(d: AssistantInput): Insight[] {
  const out: Insight[] = [];
  const f = computeFacts(d);
  const top = sorted(d.rows)[0];

  if (top) {
    out.push({
      key: 'top-category',
      icon: 'ph-warning-circle',
      color: 'var(--mp-c1)',
      title: `${top.name} concentra tu gasto`,
      body:
        `${top.name} es ${top.pct}% de los ${fmt(d.totals.expense)} que llevas este mes` +
        (f.byGroup[0] ? `; el rubro más grande es ${f.byGroup[0].name} con ${fmt(f.byGroup[0].total)}.` : '.'),
    });
  }

  if (d.totals.expense > 0) {
    out.push({
      key: 'projection',
      icon: 'ph-trend-up',
      color: 'var(--mp-c4)',
      title: `Proyección: ${fmt(f.projection)}`,
      body:
        `Gastas ${fmt(f.dailyAverage)} diarios en promedio. A ese ritmo cerrarías ${d.monthName.toLowerCase()} en ${fmt(f.projection)}` +
        (d.totals.income > 0
          ? f.projection > d.totals.income
            ? `, ${fmt(f.projection - d.totals.income)} por encima de tus ingresos.`
            : `, dejándote ${fmt(d.totals.income - f.projection)} de margen.`
          : '.'),
    });
  }

  if (f.recurring.length > 0) {
    const total = f.recurring.reduce((a, r) => a + r.total, 0);
    out.push({
      key: 'recurring',
      icon: 'ph-repeat',
      color: 'var(--mp-c2)',
      title: 'Cargos que se repiten',
      body: `${list(f.recurring.slice(0, 3).map((r) => `${r.description} (${r.times}×)`))} suman ${fmt(total)} este mes. Es el recorte más fácil si necesitas bajar el gasto.`,
    });
  }

  const debt = [...d.debts].sort((a, b) => b.total - b.paid - (a.total - a.paid))[0];
  if (debt) {
    const remaining = Math.max(0, debt.total - debt.paid);
    const rate = d.transactions.reduce((a, t) => (t.debt_id === debt.id ? a + t.amount : a), 0);
    out.push({
      key: 'debt',
      icon: 'ph-trend-down',
      color: 'var(--mp-c3)',
      title: 'Proyección de deuda',
      body:
        remaining === 0
          ? `${debt.name} está liquidada. Ese flujo queda libre para tus metas de ahorro.`
          : rate > 0
            ? `A tu ritmo de este mes (${fmt(rate)}), liquidarías ${debt.name} en ${Math.ceil(remaining / rate)} meses. Te restan ${fmt(remaining)}.`
            : `Aún no abonas a ${debt.name} este mes. Te restan ${fmt(remaining)} de ${fmt(debt.total)}.`,
    });
  }

  const goal = [...d.goals].sort((a, b) => b.saved / b.target - a.saved / a.target)[0];
  if (goal) {
    const missing = Math.max(0, goal.target - goal.saved);
    out.push({
      key: 'goal',
      icon: 'ph-piggy-bank',
      color: 'var(--mp-c2)',
      title: `Vas al ${pct(goal.saved, goal.target)}% de ${goal.name}`,
      body:
        missing === 0
          ? '¡Meta completa! Considera fijar la siguiente.'
          : `Te faltan ${fmt(missing)}. Apartando ${fmt(Math.max(1, Math.round(missing / 6)))} al mes la completas en medio año.`,
    });
  }

  if (d.closes.length > 0) {
    const last = d.closes[0];
    const delta = d.totals.expense - last.expense;
    out.push({
      key: 'trend',
      icon: 'ph-chart-line',
      color: 'var(--mp-c4)',
      title: `Comparado con ${last.month_label}`,
      body:
        delta === 0
          ? `Vas exactamente al mismo gasto que en ${last.month_label} (${fmt(last.expense)}).`
          : delta > 0
            ? `Llevas ${fmt(delta)} más que todo ${last.month_label} (${fmt(last.expense)}).`
            : `Llevas ${fmt(-delta)} menos que todo ${last.month_label} (${fmt(last.expense)}).`,
    });
  }

  if (out.length === 0) {
    out.push({
      key: 'empty',
      icon: 'ph-sparkle',
      color: 'var(--mp-c1)',
      title: 'Aún no hay datos de este mes',
      body: 'Registra tus primeros movimientos y aquí aparecerán observaciones sobre tu gasto, tus deudas y tus metas.',
    });
  }

  return out.slice(0, 4);
}
