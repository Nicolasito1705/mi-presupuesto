import { useState } from 'react';
import { fmt } from '../lib/format';
import type { Debt, Goal } from '../types';
import {
  cancelBtn, card, confirmBtn, dashedBtn, field, kicker, linkBtn, progressTrack,
  screen, smallCancelBtn, smallConfirmBtn, title, trashBtn,
} from '../ui';

type Props = {
  debts: Debt[];
  goals: Goal[];
  busy: boolean;
  onAbonarDebt: (debtId: string) => void;
  onAbonarGoal: (goalId: string) => void;
  onCreateDebt: (i: { name: string; total: number; paid: number }) => Promise<boolean>;
  onDeleteDebt: (id: string) => void;
  onCreateGoal: (i: { name: string; target: number; saved: number }) => Promise<boolean>;
  onDeleteGoal: (id: string) => void;
};

export default function DebtsScreen({
  debts, goals, busy, onAbonarDebt, onAbonarGoal, onCreateDebt, onDeleteDebt, onCreateGoal, onDeleteGoal,
}: Props) {
  const [pendingDebtDel, setPendingDebtDel] = useState<string | null>(null);
  const [pendingGoalDel, setPendingGoalDel] = useState<string | null>(null);

  const [debtOpen, setDebtOpen] = useState(false);
  const [dName, setDName] = useState('');
  const [dTotal, setDTotal] = useState('');
  const [dPaid, setDPaid] = useState('');

  const [goalOpen, setGoalOpen] = useState(false);
  const [gName, setGName] = useState('');
  const [gTarget, setGTarget] = useState('');
  const [gSaved, setGSaved] = useState('');

  const canSaveDebt = dName.trim().length > 0 && parseFloat(dTotal) > 0;
  const canSaveGoal = gName.trim().length > 0 && parseFloat(gTarget) > 0;

  async function saveDebt() {
    if (!canSaveDebt || busy) return;
    const ok = await onCreateDebt({
      name: dName, total: parseFloat(dTotal), paid: parseFloat(dPaid) || 0,
    });
    if (ok) { setDebtOpen(false); setDName(''); setDTotal(''); setDPaid(''); }
  }

  async function saveGoal() {
    if (!canSaveGoal || busy) return;
    const ok = await onCreateGoal({
      name: gName, target: parseFloat(gTarget), saved: parseFloat(gSaved) || 0,
    });
    if (ok) { setGoalOpen(false); setGName(''); setGTarget(''); setGSaved(''); }
  }

  return (
    <div data-screen-label="Deudas y metas" style={screen}>
      <div style={{ ...title, paddingTop: 6 }}>Deudas y metas</div>

      <div style={kicker}>Deudas</div>

      {debts.length === 0 && (
        <div style={{ ...card, padding: 16, fontSize: 13, color: 'var(--mp-muted)', textWrap: 'pretty' }}>
          Aún no registras deudas. Crea una y podrás abonarle desde la pestaña Agregar.
        </div>
      )}

      {debts.map((d) => {
        const pct = Math.min(100, Math.round((d.paid / d.total) * 100));
        return (
          <div key={d.id} style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500, flex: 1, minWidth: 0 }}>{d.name}</span>
              <span style={{ fontSize: 12, color: 'var(--mp-muted)' }}>
                restan {fmt(Math.max(0, d.total - d.paid))}
              </span>
              <button
                onClick={() => setPendingDebtDel(d.id)}
                aria-label="Eliminar deuda"
                className="mp-h-soft7"
                style={{ ...trashBtn, width: 32, height: 32, fontSize: 15 }}
              >
                <i className="ph ph-trash" />
              </button>
            </div>

            <div style={progressTrack}>
              <div
                style={{
                  height: '100%', borderRadius: 3, background: 'var(--color-accent)',
                  width: `${pct}%`, transition: 'width .35s ease',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--mp-muted)' }}>
              <span>Pagado {fmt(d.paid)}</span>
              <span>{pct}% de {fmt(d.total)}</span>
            </div>

            {pendingDebtDel === d.id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'mpFadeUp .18s ease' }}>
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--mp-muted)', textWrap: 'pretty' }}>
                  ¿Eliminar esta deuda?
                </span>
                <button onClick={() => setPendingDebtDel(null)} style={smallCancelBtn}>Cancelar</button>
                <button
                  onClick={() => { setPendingDebtDel(null); onDeleteDebt(d.id); }}
                  disabled={busy}
                  style={smallConfirmBtn}
                >
                  Eliminar
                </button>
              </div>
            )}

            <button onClick={() => onAbonarDebt(d.id)} style={{ ...linkBtn, alignSelf: 'flex-start', padding: '6px 0' }}>
              <i className="ph ph-plus-circle" />
              Abonar
            </button>
          </div>
        );
      })}

      {debtOpen && (
        <div
          style={{
            ...card, padding: 16, display: 'flex', flexDirection: 'column',
            gap: 12, animation: 'mpFadeUp .2s ease',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500 }}>Nueva deuda</div>
          <input
            type="text" placeholder="Nombre (ej. Tarjeta Banorte)"
            value={dName} onChange={(e) => setDName(e.target.value)} style={field}
          />
          <input
            type="number" inputMode="decimal" placeholder="Total que debes"
            value={dTotal} onChange={(e) => setDTotal(e.target.value)} style={field}
          />
          <input
            type="number" inputMode="decimal" placeholder="Ya pagado (opcional)"
            value={dPaid} onChange={(e) => setDPaid(e.target.value)} style={field}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setDebtOpen(false)} style={cancelBtn}>Cancelar</button>
            <button onClick={saveDebt} disabled={!canSaveDebt || busy} style={confirmBtn}>Crear deuda</button>
          </div>
        </div>
      )}

      <button onClick={() => setDebtOpen(true)} className="mp-h-accent8" style={dashedBtn}>
        <i className="ph ph-plus" />
        Nueva deuda
      </button>

      <div style={{ ...kicker, marginTop: 4 }}>Metas de ahorro</div>

      {goals.length === 0 && (
        <div style={{ ...card, padding: 16, fontSize: 13, color: 'var(--mp-muted)', textWrap: 'pretty' }}>
          Aún no tienes metas de ahorro. Crea una para seguir tu progreso mes a mes.
        </div>
      )}

      {goals.map((g) => {
        const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
        return (
          <div key={g.id} style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500, flex: 1, minWidth: 0 }}>{g.name}</span>
              <span style={{ fontSize: 12, color: 'var(--mp-muted)' }}>meta {fmt(g.target)}</span>
              <button
                onClick={() => setPendingGoalDel(g.id)}
                aria-label="Eliminar meta"
                className="mp-h-soft7"
                style={{ ...trashBtn, width: 32, height: 32, fontSize: 15 }}
              >
                <i className="ph ph-trash" />
              </button>
            </div>

            <div style={progressTrack}>
              <div style={{ height: '100%', borderRadius: 3, background: 'var(--mp-c2)', width: `${pct}%` }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--mp-muted)' }}>
              <span>Ahorrado {fmt(g.saved)}</span>
              <span>{pct}%</span>
            </div>

            {pendingGoalDel === g.id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'mpFadeUp .18s ease' }}>
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--mp-muted)', textWrap: 'pretty' }}>
                  ¿Eliminar esta meta?
                </span>
                <button onClick={() => setPendingGoalDel(null)} style={smallCancelBtn}>Cancelar</button>
                <button
                  onClick={() => { setPendingGoalDel(null); onDeleteGoal(g.id); }}
                  disabled={busy}
                  style={smallConfirmBtn}
                >
                  Eliminar
                </button>
              </div>
            )}

            <button onClick={() => onAbonarGoal(g.id)} style={{ ...linkBtn, alignSelf: 'flex-start', padding: '6px 0' }}>
              <i className="ph ph-plus-circle" />
              Abonar
            </button>
          </div>
        );
      })}

      {goalOpen && (
        <div
          style={{
            ...card, padding: 16, display: 'flex', flexDirection: 'column',
            gap: 12, animation: 'mpFadeUp .2s ease',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500 }}>Nueva meta</div>
          <input
            type="text" placeholder="Nombre (ej. Fondo de emergencia)"
            value={gName} onChange={(e) => setGName(e.target.value)} style={field}
          />
          <input
            type="number" inputMode="decimal" placeholder="Monto objetivo"
            value={gTarget} onChange={(e) => setGTarget(e.target.value)} style={field}
          />
          <input
            type="number" inputMode="decimal" placeholder="Ya ahorrado (opcional)"
            value={gSaved} onChange={(e) => setGSaved(e.target.value)} style={field}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setGoalOpen(false)} style={cancelBtn}>Cancelar</button>
            <button onClick={saveGoal} disabled={!canSaveGoal || busy} style={confirmBtn}>Crear meta</button>
          </div>
        </div>
      )}

      <button onClick={() => setGoalOpen(true)} className="mp-h-accent8" style={dashedBtn}>
        <i className="ph ph-plus" />
        Nueva meta
      </button>
    </div>
  );
}
