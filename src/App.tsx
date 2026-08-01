import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { isConfigured, supabase } from './lib/supabase';
import { useBudget } from './hooks/useBudget';
import { categoryRows, donutGradient, totals as sumTotals } from './lib/derive';
import { monthLabel, nextMonthLower } from './lib/format';
import type { AbonoTarget, Screen, Transaction } from './types';

import Shell from './components/Shell';
import TabBar from './components/TabBar';
import CloseMonthDialog from './components/CloseMonthDialog';
import AuthScreen from './components/AuthScreen';
import Dashboard from './screens/Dashboard';
import AddScreen, { type AddMode } from './screens/AddScreen';
import CategoryDetail from './screens/CategoryDetail';
import DebtsScreen from './screens/DebtsScreen';
import AssistantScreen from './screens/AssistantScreen';
import HistoryScreen from './screens/HistoryScreen';
import ArchiveScreen from './screens/ArchiveScreen';

const THEME_KEY = 'mp.theme';

/**
 * True on the phone itself, where the drawn bezel is dropped. Kept identical to
 * the `.mp-stage` media query in app.css — if one changes, change both.
 */
const PHONE = '(max-width: 480px)';

function useNarrowViewport() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(PHONE).matches);
  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    // Re-read on mount: the viewport can change between the first render and
    // this effect (rotating during load), and that change fires no event we'd
    // still be around to hear.
    setNarrow(mq.matches);
    const on = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem(THEME_KEY) as 'dark' | 'light' | null) ?? 'light',
  );
  const isDark = theme === 'dark';
  const narrow = useNarrowViewport();

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;
  const budget = useBudget(userId);
  const { setError } = budget;

  const [screen, setScreen] = useState<Screen>('home');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [detailCatId, setDetailCatId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddMode>('gasto');
  const [abonoTarget, setAbonoTarget] = useState<AbonoTarget | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const [archMovements, setArchMovements] = useState<Transaction[]>([]);
  const [archLoading, setArchLoading] = useState(false);

  // Archived movements are fetched only when a snapshot is actually opened.
  useEffect(() => {
    if (screen !== 'archive' || !archiveId) return;
    let cancelled = false;
    setArchLoading(true);
    void supabase
      .from('transactions')
      .select('*')
      .eq('closed_month_id', archiveId)
      .order('occurred_on')
      .order('created_at')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        setArchMovements(
          (data ?? []).map((t) => ({
            id: t.id, category_id: t.category_id, debt_id: t.debt_id, goal_id: t.goal_id,
            closed_month_id: t.closed_month_id, kind: t.kind, group_name: t.group_name,
            description: t.description, amount: Number(t.amount), occurred_on: t.occurred_on,
          })),
        );
        setArchLoading(false);
      });
    return () => { cancelled = true; };
  }, [screen, archiveId, setError]);

  const rows = useMemo(
    () => categoryRows(budget.categories, budget.transactions),
    [budget.categories, budget.transactions],
  );
  const totals = useMemo(() => sumTotals(budget.transactions), [budget.transactions]);
  const donut = useMemo(() => donutGradient(rows), [rows]);
  const monthName = budget.activeMonthStart ? monthLabel(budget.activeMonthStart) : '';

  const goTab = useCallback((s: Screen) => {
    setScreen(s);
    if (s === 'add') setAddMode('gasto');
  }, []);

  const dismissError = useCallback(() => setError(null), [setError]);

  async function doCloseMonth() {
    const ok = await budget.closeMonth();
    if (ok) {
      setConfirmClose(false);
      setExpandedCat(null);
      setScreen('home');
    }
  }

  const detailCat = budget.categories.find((c) => c.id === detailCatId) ?? null;
  const snapshot = budget.closes.find((c) => c.id === archiveId) ?? null;

  const shellProps = { theme, narrow, error: budget.error, onDismissError: dismissError };

  // ── gates ────────────────────────────────────────────────────────────────

  if (!isConfigured) {
    return (
      <Shell {...shellProps}>
        <div style={{ margin: 'auto', fontSize: 13.5, color: 'var(--mp-muted)', textWrap: 'pretty', lineHeight: 1.6 }}>
          Falta la configuración de Supabase. Copia <code>.env.example</code> a <code>.env</code>, completa{' '}
          <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>, y reinicia el servidor.
        </div>
      </Shell>
    );
  }

  if (!authReady) {
    return <Shell {...shellProps}><div style={{ margin: 'auto' }} /></Shell>;
  }

  if (!session) {
    return <Shell {...shellProps}><AuthScreen /></Shell>;
  }

  if (budget.loading) {
    return (
      <Shell {...shellProps}>
        <div style={{ margin: 'auto', fontSize: 13, color: 'var(--mp-muted)' }}>Cargando tu presupuesto…</div>
      </Shell>
    );
  }

  // ── screens ──────────────────────────────────────────────────────────────

  return (
    <Shell
      {...shellProps}
      footer={<TabBar screen={screen} onGo={goTab} />}
      overlay={
        confirmClose ? (
          <CloseMonthDialog
            monthNameLower={monthName.toLowerCase()}
            nextMonthLower={nextMonthLower(budget.activeMonthStart)}
            busy={budget.busy}
            onCancel={() => setConfirmClose(false)}
            onConfirm={doCloseMonth}
          />
        ) : null
      }
    >
      {screen === 'home' && (
        <Dashboard
          monthName={monthName}
          totals={totals}
          rows={rows}
          donut={donut}
          expandedId={expandedCat}
          isDark={isDark}
          onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
          onAskClose={() => setConfirmClose(true)}
          onToggleCategory={(id) => setExpandedCat(expandedCat === id ? null : id)}
          onOpenDetail={(id) => { setDetailCatId(id); setScreen('detail'); }}
        />
      )}

      {screen === 'add' && (
        <AddScreen
          categories={budget.categories}
          debts={budget.debts}
          goals={budget.goals}
          mode={addMode}
          onMode={setAddMode}
          abonoTarget={abonoTarget}
          onAbonoTarget={setAbonoTarget}
          busy={budget.busy}
          onSubmitExpense={async (i) => {
            const ok = await budget.addExpense(i);
            if (ok) { setExpandedCat(i.categoryId); setScreen('home'); }
            return ok;
          }}
          onSubmitIncome={async (i) => {
            const ok = await budget.addIncome(i);
            if (ok) setScreen('home');
            return ok;
          }}
          onSubmitAbono={async (i) => {
            const ok =
              i.target.kind === 'debt'
                ? await budget.addDebtPayment({
                    debtId: i.target.id, debtName: i.name, categoryId: i.categoryId,
                    amount: i.amount, date: i.date,
                  })
                : await budget.addGoalContribution({
                    goalId: i.target.id, goalName: i.name, categoryId: i.categoryId,
                    amount: i.amount, date: i.date,
                  });
            if (ok) setScreen('debts');
            return ok;
          }}
          onCreateCategory={budget.createCategory}
        />
      )}

      {screen === 'detail' && detailCat && (
        <CategoryDetail
          category={detailCat}
          monthName={monthName}
          transactions={budget.transactions}
          busy={budget.busy}
          onBack={() => setScreen('home')}
          onDelete={budget.deleteTransaction}
        />
      )}

      {screen === 'debts' && (
        <DebtsScreen
          debts={budget.debts}
          goals={budget.goals}
          busy={budget.busy}
          onAbonarDebt={(id) => { setAbonoTarget({ kind: 'debt', id }); setAddMode('abono'); setScreen('add'); }}
          onAbonarGoal={(id) => { setAbonoTarget({ kind: 'goal', id }); setAddMode('abono'); setScreen('add'); }}
          onCreateDebt={budget.createDebt}
          onDeleteDebt={budget.deleteDebt}
          onCreateGoal={budget.createGoal}
          onDeleteGoal={budget.deleteGoal}
        />
      )}

      {screen === 'ai' && (
        <AssistantScreen
          data={{
            totals, rows, transactions: budget.transactions, debts: budget.debts,
            goals: budget.goals, closes: budget.closes, monthName,
            activeMonthStart: budget.activeMonthStart,
          }}
        />
      )}

      {screen === 'history' && (
        <HistoryScreen
          closes={budget.closes}
          email={session.user.email ?? ''}
          onOpen={(id) => { setArchiveId(id); setScreen('archive'); }}
          onSignOut={() => void supabase.auth.signOut()}
        />
      )}

      {screen === 'archive' && snapshot && (
        <ArchiveScreen
          snapshot={snapshot}
          movements={archMovements}
          loadingMovements={archLoading}
          onBack={() => setScreen('history')}
        />
      )}
    </Shell>
  );
}
