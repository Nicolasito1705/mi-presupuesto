# Mi Presupuesto

A React + TypeScript implementation of the `Mi Presupuesto` design, backed by Supabase.

The design lives in `project/` — a Claude Design handoff bundle (`Mi Presupuesto.dc.html`,
the Nocturne design system, the iOS device frame). It is the visual source of truth and is
not part of the build; every color, radius and font size in `src/` is copied from it.

## Setup

**1. Create the database.** Open your Supabase project → SQL Editor → New query, paste all
of [`supabase/schema.sql`](supabase/schema.sql), and Run. It creates the five tables, the
row-level-security policies, the running-total trigger and the `close_month()` function.
Re-running it is safe.

**2. Point the app at your project.**

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Project Settings → API.
`.env` is gitignored. Only the **anon** key belongs there — never the service_role key.

**3. Run it.**

```bash
npm install && npm run dev
```

Sign up with an email and password. The four default categories (Tarjeta de crédito,
Efectivo, Transferencia, Otros) are seeded automatically for every new account.

## How the money math works

Nothing important is computed in the browser and cached.

- **`categories.total`** is a real column. A trigger on `transactions` moves it on every
  insert, update and delete, so the dashboard shows what the database holds. The donut
  chart is drawn from those totals.
- **An abono** is just a transaction carrying a `debt_id` or a `goal_id` (never both —
  a check constraint enforces it). The same trigger advances `debts.paid`, clamped at
  the debt's total, or `goals.saved`, deliberately *not* clamped: overshooting a savings
  goal is good news. Funding a goal counts as an expense, because that money has left
  the month's available pool.
- **`close_month()`** runs as one transaction: it snapshots the month into
  `monthly_closes` (income, expense, balance, and a frozen per-category breakdown),
  stamps every active transaction with that snapshot's id, and zeroes the category
  totals. The active month is *derived* — it starts where the last close ended — so no
  "current month" pointer can drift out of sync.
- **The archive is read-only in the database, not just the UI.** RLS allows inserting,
  updating and deleting transactions only while `closed_month_id is null`, and
  `monthly_closes` has a select policy and nothing else.

If the totals ever look wrong, `select recalc_category_totals();` recomputes them from
the transaction rows.

## Layout

```
src/
  App.tsx              routing between screens, session, theme
  hooks/useBudget.ts   every read and write against Supabase
  lib/derive.ts        category rows, totals, donut gradient
  lib/assistant.ts     the Asistente screen's insights and replies
  lib/format.ts        money, dates, month names
  ui.ts                the design's repeated inline styles, named once
  components/          Shell, IOSDevice, TabBar, dialogs, auth
  screens/             Dashboard, Add, CategoryDetail, Debts, Assistant, History, Archive
supabase/schema.sql    the whole database
project/               the original Claude Design bundle (not built)
```

## Notes on the implementation

Three things exist in the app that the prototype did not have, because the data model
needs them:

- **An "Ingreso" tab** in Agregar. Income is stored as transactions (`kind = 'income'`),
  so there has to be a way to enter it; the prototype read income from a fixed prop.
- **Savings goals you can actually fund** — a "Nueva meta" form and an "Abonar" action,
  both mirroring the debt equivalents. The prototype rendered goals as static bars with
  no way to create or feed one.
- **Sign-out**, at the bottom of Historial. The design has no settings surface.

Below 480px the iPhone bezel is dropped and the app goes full-bleed — on a real phone a
drawn phone around the app would be redundant.

The Asistente screen is rule-based, computed from your own rows. It is not a language
model; swapping it for one means replacing the two functions in `lib/assistant.ts`.

---

<details>
<summary>Original Claude Design handoff note</summary>

This started as a handoff bundle from Claude Design (claude.ai/design): the user mocked up
designs in HTML/CSS/JS, then exported the bundle so a coding agent could implement them.
The design files in `project/` are prototypes, not production code — the job was to
recreate them faithfully in a stack that fits the target, which is what `src/` is.

</details>
