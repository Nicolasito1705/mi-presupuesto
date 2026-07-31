import { useState } from 'react';
import { fmt, toDt } from '../lib/format';
import type { Category, Transaction } from '../types';
import { backBtn, card, screen, smallCancelBtn, smallConfirmBtn, trashBtn } from '../ui';

type Props = {
  category: Category;
  monthName: string;
  transactions: Transaction[];
  busy: boolean;
  onBack: () => void;
  onDelete: (id: string) => void;
};

export default function CategoryDetail({
  category, monthName, transactions, busy, onBack, onDelete,
}: Props) {
  const [pendingDel, setPendingDel] = useState<string | null>(null);

  const rows = transactions.filter((t) => t.category_id === category.id && t.kind === 'expense');
  let run = 0;
  const withRunning = rows.map((t) => {
    run += t.amount;
    return { tx: t, running: run };
  });

  return (
    <div data-screen-label="Detalle de categoría" style={screen}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 2 }}>
        <button onClick={onBack} aria-label="Volver" style={backBtn}>
          <i className="ph ph-caret-left" />
        </button>
        <span
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: `color-mix(in srgb, ${category.color} 18%, transparent)`,
            color: category.color, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 18,
          }}
        >
          <i className={`ph ${category.icon}`} />
        </span>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 19, letterSpacing: '-0.015em' }}>
            {category.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--mp-muted)' }}>
            {monthName} · {rows.length === 1 ? '1 movimiento' : rows.length + ' movimientos'}
          </div>
        </div>
      </div>

      <div style={{ ...card, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, color: 'var(--mp-muted)' }}>Total del mes</span>
        <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>{fmt(category.total)}</span>
      </div>

      <div style={{ ...card, padding: '4px 0' }}>
        {withRunning.map(({ tx, running }, i) => (
          <div
            key={tx.id}
            style={{ borderBottom: `1px solid ${i < withRunning.length - 1 ? 'var(--color-divider)' : 'transparent'}` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px 11px 16px' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>{tx.description}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--mp-muted)' }}>
                  {tx.group_name} · {toDt(tx.occurred_on)}
                </span>
              </span>
              <span style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{fmt(tx.amount)}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--mp-muted)' }}>acum. {fmt(running)}</span>
              </span>
              <button
                onClick={() => setPendingDel(tx.id)}
                aria-label="Eliminar movimiento"
                className="mp-h-soft7"
                style={trashBtn}
              >
                <i className="ph ph-trash" />
              </button>
            </div>

            {pendingDel === tx.id && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0 12px 12px 16px', animation: 'mpFadeUp .18s ease',
                }}
              >
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--mp-muted)', textWrap: 'pretty' }}>
                  ¿Eliminar este movimiento?
                </span>
                <button onClick={() => setPendingDel(null)} style={smallCancelBtn}>Cancelar</button>
                <button
                  onClick={() => { setPendingDel(null); onDelete(tx.id); }}
                  disabled={busy}
                  style={smallConfirmBtn}
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))}

        {withRunning.length === 0 && (
          <div style={{ padding: '18px 16px', fontSize: 13, color: 'var(--mp-muted)', textWrap: 'pretty' }}>
            Sin movimientos en esta categoría este mes.
          </div>
        )}
      </div>
    </div>
  );
}
