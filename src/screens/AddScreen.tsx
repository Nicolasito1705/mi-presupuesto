import { useEffect, useState } from 'react';
import { fmt, todayIso } from '../lib/format';
import type { AbonoTarget, Category, Debt, Goal } from '../types';
import {
  amountInput, cancelBtn, chipStyle, confirmBtn, dashedBtn, field, formCard, kicker, label, screen, submitBtn, title,
} from '../ui';

export type AddMode = 'gasto' | 'abono' | 'ingreso';

type Props = {
  categories: Category[];
  debts: Debt[];
  goals: Goal[];
  mode: AddMode;
  onMode: (m: AddMode) => void;
  abonoTarget: AbonoTarget | null;
  onAbonoTarget: (t: AbonoTarget) => void;
  busy: boolean;
  onSubmitExpense: (i: { categoryId: string; amount: number; description: string; date: string }) => Promise<boolean>;
  onSubmitIncome: (i: { amount: number; description: string; date: string }) => Promise<boolean>;
  onSubmitAbono: (i: { target: AbonoTarget; name: string; categoryId: string; amount: number; date: string }) => Promise<boolean>;
  onCreateCategory: (name: string) => Promise<boolean>;
};

const TITLES: Record<AddMode, string> = {
  gasto: 'Agregar gasto',
  abono: 'Abonar',
  ingreso: 'Registrar ingreso',
};

/** A debt and a goal are the same shape to the abono form: a thing you fund. */
type AbonoOption = AbonoTarget & { name: string; hint: string; remaining: number; total: number; current: number };

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, height: 44, borderRadius: 10, ...chipStyle(active), color: 'var(--color-text)',
        fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
      }}
    >
      {children}
    </button>
  );
}

function AmountField({ value, onChange, label: lbl }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={label}>{lbl}</label>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          borderBottom: '1px solid var(--color-divider)', paddingBottom: 8,
        }}
      >
        <span style={{ fontSize: 26, color: 'var(--mp-muted)' }}>$</span>
        <input
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={amountInput}
        />
      </div>
    </div>
  );
}

export default function AddScreen({
  categories, debts, goals, mode, onMode, abonoTarget, onAbonoTarget, busy,
  onSubmitExpense, onSubmitIncome, onSubmitAbono, onCreateCategory,
}: Props) {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(todayIso());
  const [categoryId, setCategoryId] = useState<string>('');
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [abAmount, setAbAmount] = useState('');
  const [abDate, setAbDate] = useState(todayIso());
  const [abMethodId, setAbMethodId] = useState<string>('');

  // Keep the two category pickers pointed at something real as categories load.
  useEffect(() => {
    if (categories.length === 0) return;
    if (!categories.some((c) => c.id === categoryId)) setCategoryId(categories[0].id);
    if (!categories.some((c) => c.id === abMethodId)) {
      const transfer = categories.find((c) => c.slug === 'transferencia');
      setAbMethodId((transfer ?? categories[0]).id);
    }
  }, [categories, categoryId, abMethodId]);

  const amountNum = parseFloat(amount);
  const abAmountNum = parseFloat(abAmount);

  const debtOptions: AbonoOption[] = debts.map((d) => ({
    kind: 'debt', id: d.id, name: d.name, total: d.total, current: d.paid,
    remaining: Math.max(0, d.total - d.paid),
    hint: `restan ${fmt(Math.max(0, d.total - d.paid))}`,
  }));
  const goalOptions: AbonoOption[] = goals.map((g) => ({
    kind: 'goal', id: g.id, name: g.name, total: g.target, current: g.saved,
    remaining: Math.max(0, g.target - g.saved),
    hint: `faltan ${fmt(Math.max(0, g.target - g.saved))}`,
  }));
  const options = [...debtOptions, ...goalOptions];

  const selected =
    options.find((o) => o.kind === abonoTarget?.kind && o.id === abonoTarget?.id) ?? options[0];

  const canSubmitExpense = amountNum > 0 && desc.trim().length > 0 && !!categoryId;
  const canSubmitIncome = amountNum > 0 && desc.trim().length > 0;
  const canAbonar = !!selected && abAmountNum > 0 && !!abMethodId;

  async function submitExpense() {
    if (!canSubmitExpense || busy) return;
    const ok = await onSubmitExpense({ categoryId, amount: amountNum, description: desc, date });
    if (ok) { setAmount(''); setDesc(''); }
  }

  async function submitIncome() {
    if (!canSubmitIncome || busy) return;
    const ok = await onSubmitIncome({ amount: amountNum, description: desc, date });
    if (ok) { setAmount(''); setDesc(''); }
  }

  async function submitAbono() {
    if (!canAbonar || busy || !selected) return;
    const ok = await onSubmitAbono({
      target: { kind: selected.kind, id: selected.id },
      name: selected.name,
      categoryId: abMethodId,
      amount: abAmountNum,
      date: abDate,
    });
    if (ok) setAbAmount('');
  }

  async function saveNewCat() {
    const name = newCatName.trim();
    if (!name || busy) return;
    const ok = await onCreateCategory(name);
    if (ok) { setNewCatOpen(false); setNewCatName(''); }
  }

  return (
    <div data-screen-label="Agregar gasto" style={screen}>
      <div style={{ ...title, paddingTop: 6 }}>{TITLES[mode]}</div>

      <div style={{ display: 'flex', gap: 8 }}>
        <ModeTab active={mode === 'gasto'} onClick={() => onMode('gasto')}>Gasto</ModeTab>
        <ModeTab active={mode === 'abono'} onClick={() => onMode('abono')}>Abono</ModeTab>
        <ModeTab active={mode === 'ingreso'} onClick={() => onMode('ingreso')}>Ingreso</ModeTab>
      </div>

      {mode === 'abono' && (
        <div style={formCard}>
          <AmountField label="Monto del abono" value={abAmount} onChange={setAbAmount} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={label}>¿A qué le abonas?</label>

            {options.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--mp-muted)', textWrap: 'pretty' }}>
                Todavía no tienes deudas ni metas. Créalas en la pestaña Deudas.
              </div>
            )}

            {([['Deudas', debtOptions], ['Metas de ahorro', goalOptions]] as const).map(
              ([heading, group]) =>
                group.length === 0 ? null : (
                  <div key={heading} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ ...kicker, marginTop: 2 }}>{heading}</div>
                    {group.map((o) => (
                      <button
                        key={`${o.kind}-${o.id}`}
                        onClick={() => onAbonoTarget({ kind: o.kind, id: o.id })}
                        style={{
                          minHeight: 48, borderRadius: 10,
                          ...chipStyle(selected?.kind === o.kind && selected?.id === o.id),
                          color: 'var(--color-text)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
                          fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', gap: 8, padding: '0 14px', textAlign: 'left',
                        }}
                      >
                        <span>{o.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--mp-muted)' }}>{o.hint}</span>
                      </button>
                    ))}
                  </div>
                ),
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={label}>Pagado con</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setAbMethodId(c.id)}
                  style={{
                    height: 44, borderRadius: 10, ...chipStyle(abMethodId === c.id),
                    color: 'var(--color-text)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6,
                  }}
                >
                  <i className={`ph ${c.icon}`} style={{ fontSize: 15, color: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={label}>Fecha</label>
            <input type="date" value={abDate} onChange={(e) => setAbDate(e.target.value)} style={field} />
          </div>

          {canAbonar && selected && (
            <div style={{ fontSize: 12.5, color: 'var(--mp-muted)', textWrap: 'pretty' }}>
              {selected.kind === 'debt'
                ? `Después de este abono habrás pagado ${fmt(Math.min(selected.total, selected.current + abAmountNum))} de ${fmt(selected.total)} (${Math.min(100, Math.round(((selected.current + abAmountNum) / selected.total) * 100))}%).`
                : `Después de este abono llevarás ${fmt(selected.current + abAmountNum)} ahorrados de ${fmt(selected.total)} (${Math.round(((selected.current + abAmountNum) / selected.total) * 100)}%). Cuenta como gasto del mes, porque ese dinero ya no está disponible.`}
            </div>
          )}

          <button onClick={submitAbono} disabled={!canAbonar || busy} className="mp-h-accent12" style={submitBtn}>
            {selected?.kind === 'goal' ? 'Registrar ahorro' : 'Registrar abono'}
          </button>
        </div>
      )}

      {mode === 'gasto' && (
        <div style={formCard}>
          <AmountField label="Monto" value={amount} onChange={setAmount} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={label}>Categoría</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  style={{
                    height: 48, borderRadius: 10, ...chipStyle(categoryId === c.id),
                    color: 'var(--color-text)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 7,
                  }}
                >
                  <i className={`ph ${c.icon}`} style={{ fontSize: 16, color: c.color }} />
                  {c.name}
                </button>
              ))}

              {newCatOpen && (
                <div
                  style={{
                    gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 8,
                    animation: 'mpFadeUp .18s ease',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Nombre de la categoría"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    style={field}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setNewCatOpen(false); setNewCatName(''); }}
                      style={cancelBtn}
                    >
                      Cancelar
                    </button>
                    <button onClick={saveNewCat} disabled={!newCatName.trim() || busy} style={confirmBtn}>
                      Crear categoría
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setNewCatOpen(true)}
                className="mp-h-accent8"
                style={{ ...dashedBtn, gridColumn: '1 / -1', height: 44 }}
              >
                <i className="ph ph-plus" />
                Nueva categoría
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={label}>Producto o descripción</label>
            <input
              type="text"
              placeholder="Ej. Mercado, gasolina, cine…"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={field}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={label}>Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={field} />
          </div>

          <button onClick={submitExpense} disabled={!canSubmitExpense || busy} className="mp-h-accent12" style={submitBtn}>
            Guardar gasto
          </button>
        </div>
      )}

      {mode === 'ingreso' && (
        <div style={formCard}>
          <AmountField label="Monto" value={amount} onChange={setAmount} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={label}>Origen</label>
            <input
              type="text"
              placeholder="Ej. Nómina, freelance, venta…"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={field}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={label}>Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={field} />
          </div>

          <button onClick={submitIncome} disabled={!canSubmitIncome || busy} className="mp-h-accent12" style={submitBtn}>
            Registrar ingreso
          </button>
        </div>
      )}
    </div>
  );
}
