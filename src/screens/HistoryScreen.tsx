import { fmt } from '../lib/format';
import type { MonthlyClose } from '../types';
import { card, screen, title } from '../ui';

type Props = {
  closes: MonthlyClose[];
  email: string;
  onOpen: (id: string) => void;
  onSignOut: () => void;
};

export default function HistoryScreen({ closes, email, onOpen, onSignOut }: Props) {
  return (
    <div data-screen-label="Historial" style={screen}>
      <div style={{ paddingTop: 6 }}>
        <div style={title}>Historial</div>
        <div style={{ fontSize: 12.5, color: 'var(--mp-muted)' }}>Meses cerrados</div>
      </div>

      <div style={{ ...card, padding: '4px 0' }}>
        {closes.map((h, i) => (
          <div
            key={h.id}
            onClick={() => onOpen(h.id)}
            role="button"
            className="mp-h-soft4"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer',
              borderBottom: `1px solid ${i < closes.length - 1 ? 'var(--color-divider)' : 'transparent'}`,
              minHeight: 44,
            }}
          >
            <span
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'color-mix(in srgb, var(--color-text) 7%, transparent)',
                color: 'var(--mp-muted)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 17, flex: 'none',
              }}
            >
              <i className="ph ph-calendar-blank" />
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>{h.month_label}</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--mp-muted)' }}>
                Gastos {fmt(h.expense)}
              </span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)' }}>
              {h.balance >= 0 ? '+' : '−'}{fmt(Math.abs(h.balance))}
            </span>
            <i className="ph ph-caret-right" style={{ color: 'var(--mp-muted)', fontSize: 14 }} />
          </div>
        ))}

        {closes.length === 0 && (
          <div style={{ padding: '18px 16px', fontSize: 13, color: 'var(--mp-muted)', textWrap: 'pretty' }}>
            Todavía no cierras ningún mes. Usa «Cerrar mes» en el inicio para archivar el actual.
          </div>
        )}
      </div>

      {/* The design has no settings surface; sign-out lives here, where the
          list ends, rather than intruding on the dashboard header. */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '4px 2px 8px', fontSize: 12, color: 'var(--mp-muted)',
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {email}
        </span>
        <button
          onClick={onSignOut}
          style={{
            border: 'none', background: 'transparent', color: 'var(--color-accent)', fontSize: 12.5,
            fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '6px 0',
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
