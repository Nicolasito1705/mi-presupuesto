import { fmt } from '../lib/format';
import type { CategoryRow, Totals } from '../lib/derive';
import { card, kicker, linkBtn, screen, title } from '../ui';

type Props = {
  monthName: string;
  totals: Totals;
  rows: CategoryRow[];
  donut: string;
  expandedId: string | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onAskClose: () => void;
  onToggleCategory: (id: string) => void;
  onOpenDetail: (id: string) => void;
};

function StatTile({ tone, label, value }: { tone?: string; label: string; value: string }) {
  return (
    <div style={{ ...card, padding: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--mp-muted)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 2, color: tone }}>
        {value}
      </div>
    </div>
  );
}

export default function Dashboard({
  monthName, totals, rows, donut, expandedId, isDark,
  onToggleTheme, onAskClose, onToggleCategory, onOpenDetail,
}: Props) {
  return (
    <div data-screen-label="Dashboard" style={screen}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--mp-muted)' }}>Mi presupuesto</div>
          <div style={title}>{monthName}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={onToggleTheme}
            aria-label="Cambiar tema"
            style={{
              width: 44, height: 44, borderRadius: 10, border: '1px solid var(--color-divider)',
              background: 'transparent', color: 'var(--mp-muted)', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className={`ph ${isDark ? 'ph-sun' : 'ph-moon'}`} />
          </button>
          <button
            onClick={onAskClose}
            className="mp-h-accent12"
            style={{
              height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--color-accent)',
              background: 'transparent', color: 'var(--color-accent)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Cerrar mes
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <StatTile label="Ingresos" value={fmt(totals.income)} />
        <StatTile label="Gastos" value={fmt(totals.expense)} />
        <StatTile label="Balance" value={fmt(totals.balance)} tone="var(--color-accent)" />
      </div>

      <div style={{ ...card, padding: 16, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            width: 128, height: 128, borderRadius: '50%', background: donut,
            position: 'relative', flex: 'none', overflow: 'visible',
          }}
        >
          <div
            style={{
              position: 'absolute', inset: 16, borderRadius: '50%', background: 'var(--color-surface)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: 10, color: 'var(--mp-muted)' }}>Gastado</div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{fmt(totals.expense)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, minWidth: 0 }}>
          {rows.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color, flex: 'none' }} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.name}
              </span>
              <span style={{ color: 'var(--mp-muted)' }}>{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card, padding: '6px 0' }}>
        <div style={{ ...kicker, padding: '12px 16px 6px' }}>Categorías</div>
        {rows.map((c, i) => {
          const expanded = expandedId === c.id;
          return (
            <div key={c.id}>
              <div
                onClick={() => onToggleCategory(c.id)}
                role="button"
                className="mp-h-soft4"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
                  cursor: 'pointer', minHeight: 44,
                }}
              >
                <span
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `color-mix(in srgb, ${c.color} 18%, transparent)`,
                    color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flex: 'none',
                  }}
                >
                  <i className={`ph ${c.icon}`} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--mp-muted)' }}>{c.countLabel}</span>
                </span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{fmt(c.total)}</span>
                <i
                  className="ph ph-caret-down"
                  style={{
                    color: 'var(--mp-muted)', fontSize: 14,
                    transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s',
                  }}
                />
              </div>

              {expanded && (
                <div
                  style={{
                    padding: '2px 16px 12px 64px', display: 'flex', flexDirection: 'column',
                    gap: 8, animation: 'mpFadeUp .2s ease',
                  }}
                >
                  {c.groups.map((g) => (
                    <div key={g.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--mp-muted)' }}>{g.name}</span>
                      <span>{fmt(g.total)}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => onOpenDetail(c.id)}
                    style={{ ...linkBtn, alignSelf: 'flex-start', marginTop: 2, padding: '8px 0' }}
                  >
                    Ver movimientos <i className="ph ph-arrow-right" />
                  </button>
                </div>
              )}

              {i < rows.length - 1 && (
                <div style={{ height: 1, background: 'var(--color-divider)', margin: '0 16px' }} />
              )}
            </div>
          );
        })}
      </div>

      {totals.expense === 0 && totals.income === 0 && (
        <div style={{ textAlign: 'center', padding: 10, color: 'var(--mp-muted)', fontSize: 13 }}>
          Mes nuevo — registra tu primer gasto en la pestaña Agregar.
        </div>
      )}
    </div>
  );
}
