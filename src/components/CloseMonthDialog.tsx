type Props = {
  monthNameLower: string;
  nextMonthLower: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function CloseMonthDialog({ monthNameLower, nextMonthLower, busy, onCancel, onConfirm }: Props) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, background: 'rgba(10,11,20,0.55)', zIndex: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--color-surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)',
          padding: 20, width: '100%', animation: 'mpFadeUp .2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 18, marginBottom: 6 }}>
          ¿Cerrar {monthNameLower}?
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--mp-muted)', textWrap: 'pretty' }}>
          El mes se archivará en el historial como solo lectura y empezarás {nextMonthLower} en ceros.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, height: 46, borderRadius: 10, border: '1px solid var(--color-divider)',
              background: 'transparent', color: 'var(--color-text)', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              flex: 1, height: 46, borderRadius: 10, border: '1px solid var(--color-accent)',
              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              color: 'var(--color-accent)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {busy ? 'Cerrando…' : 'Cerrar mes'}
          </button>
        </div>
      </div>
    </div>
  );
}
