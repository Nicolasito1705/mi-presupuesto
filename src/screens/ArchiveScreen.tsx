import { fmt, toDt } from '../lib/format';
import type { MonthlyClose, Transaction } from '../types';
import { backBtn, card, kicker, screen } from '../ui';

type Props = {
  snapshot: MonthlyClose;
  /** Movements frozen into this snapshot, loaded on demand. */
  movements: Transaction[];
  loadingMovements: boolean;
  onBack: () => void;
};

export default function ArchiveScreen({ snapshot, movements, loadingMovements, onBack }: Props) {
  const max = Math.max(1, ...snapshot.category_totals.map((c) => c.total));

  return (
    <div data-screen-label="Mes archivado" style={screen}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 2 }}>
        <button onClick={onBack} aria-label="Volver" style={backBtn}>
          <i className="ph ph-caret-left" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 19, letterSpacing: '-0.015em' }}>
            {snapshot.month_label}
          </div>
        </div>
        <span
          style={{
            fontSize: 11, padding: '5px 9px', borderRadius: 6,
            background: 'color-mix(in srgb, var(--color-text) 8%, transparent)',
            color: 'var(--mp-muted)', display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <i className="ph ph-lock-simple" />
          Solo lectura
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div style={{ ...card, padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--mp-muted)' }}>Ingresos</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{fmt(snapshot.income)}</div>
        </div>
        <div style={{ ...card, padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--mp-muted)' }}>Gastos</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{fmt(snapshot.expense)}</div>
        </div>
        <div style={{ ...card, padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--mp-muted)' }}>Balance</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2, color: 'var(--color-accent)' }}>
            {fmt(snapshot.balance)}
          </div>
        </div>
      </div>

      <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={kicker}>Gasto por categoría</div>
        {snapshot.category_totals.map((c) => (
          <div key={c.slug} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color }} />
                {c.name}
              </span>
              <span style={{ fontWeight: 500 }}>{fmt(c.total)}</span>
            </div>
            <div
              style={{
                height: 5, borderRadius: 3,
                background: 'color-mix(in srgb, var(--color-text) 8%, transparent)', overflow: 'hidden',
              }}
            >
              <div style={{ height: '100%', borderRadius: 3, background: c.color, width: `${Math.round((c.total / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding: '4px 0' }}>
        <div style={{ ...kicker, padding: '12px 16px 6px' }}>Movimientos</div>
        {loadingMovements && (
          <div style={{ padding: '10px 16px 16px', fontSize: 13, color: 'var(--mp-muted)' }}>Cargando…</div>
        )}
        {!loadingMovements && movements.length === 0 && (
          <div style={{ padding: '10px 16px 16px', fontSize: 13, color: 'var(--mp-muted)' }}>
            Este mes se cerró sin movimientos.
          </div>
        )}
        {movements.map((t, i) => (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
              borderBottom: `1px solid ${i < movements.length - 1 ? 'var(--color-divider)' : 'transparent'}`,
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>{t.description}</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--mp-muted)' }}>
                {t.group_name} · {toDt(t.occurred_on)}
              </span>
            </span>
            <span
              style={{
                fontSize: 14, fontWeight: 600,
                color: t.kind === 'income' ? 'var(--color-accent)' : undefined,
              }}
            >
              {t.kind === 'income' ? '+' : ''}{fmt(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
