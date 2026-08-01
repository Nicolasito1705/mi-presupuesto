import type { Screen } from '../types';

const TABS: { id: Screen; label: string; icon: string }[] = [
  { id: 'home', label: 'Inicio', icon: 'ph-house' },
  { id: 'add', label: 'Agregar', icon: 'ph-plus-circle' },
  { id: 'debts', label: 'Deudas', icon: 'ph-hand-coins' },
  { id: 'ai', label: 'Asistente', icon: 'ph-sparkle' },
  { id: 'history', label: 'Historial', icon: 'ph-clock-counter-clockwise' },
];

/** Detail screens keep their parent tab lit, as in the prototype. */
const PARENT: Partial<Record<Screen, Screen>> = { detail: 'home', archive: 'history' };

export default function TabBar({ screen, onGo }: { screen: Screen; onGo: (s: Screen) => void }) {
  const active = PARENT[screen] ?? screen;
  return (
    <div
      style={{
        display: 'flex', borderTop: '1px solid var(--color-divider)',
        background: 'var(--color-surface)', flex: 'none',
        // The design's 26px was measured against the prototype's drawn frame.
        // On a real iPhone the home indicator claims 34px, so the labels ended
        // up underneath it — take whichever is larger.
        padding: '6px 8px',
        paddingBottom: 'max(26px, env(safe-area-inset-bottom))',
      }}
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onGo(t.id)}
          style={{
            flex: 1, height: 50, border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, color: active === t.id ? 'var(--color-accent)' : 'var(--mp-muted)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <i className={`ph ${t.icon}`} style={{ fontSize: 21 }} />
          <span style={{ fontSize: 10, fontWeight: active === t.id ? 600 : 400 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
