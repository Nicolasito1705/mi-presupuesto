const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const MONTHS_LONG = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** '$1,240' — the prototype's exact money format. */
export function fmt(n: number): string {
  return '$' + Math.round(n || 0).toLocaleString('es-MX');
}

/** '2026-07-03' → '3 jul' */
export function toDt(iso: string): string {
  const p = String(iso).split('-');
  if (p.length !== 3) return String(iso);
  return parseInt(p[2], 10) + ' ' + MONTHS_SHORT[parseInt(p[1], 10) - 1];
}

/** '2026-07-01' → 'Julio 2026' */
export function monthLabel(iso: string): string {
  const p = String(iso).split('-');
  if (p.length !== 3) return String(iso);
  return MONTHS_LONG[parseInt(p[1], 10) - 1] + ' ' + p[0];
}

/** The month after `iso`, lowercased: 'agosto'. Used in the close dialog copy. */
export function nextMonthLower(iso: string): string {
  const p = String(iso).split('-');
  if (p.length !== 3) return 'el siguiente mes';
  const m = parseInt(p[1], 10) % 12; // 0-based index of the *next* month
  return MONTHS_LONG[m].toLowerCase();
}

/** Local (not UTC) YYYY-MM-DD for today — what a date input expects. */
export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function slugify(s: string): string {
  return (
    s.toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 6)
  );
}

export function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}
