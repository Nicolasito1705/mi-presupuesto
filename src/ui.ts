import type { CSSProperties } from 'react';

/**
 * The prototype's repeated inline styles, named once. Values are copied
 * verbatim from `Mi Presupuesto.dc.html` — if a number looks arbitrary it is
 * because it is the design's number.
 */

export const screen: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 14, animation: 'mpFadeUp .25s ease',
};

export const card: CSSProperties = {
  background: 'var(--color-surface)', borderRadius: 14, boxShadow: 'var(--shadow-sm)',
};

export const title: CSSProperties = {
  fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 24, letterSpacing: '-0.015em',
};

export const kicker: CSSProperties = {
  fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mp-muted)',
};

export const label: CSSProperties = { fontSize: 12, color: 'var(--mp-muted)' };

export const field: CSSProperties = {
  height: 46, borderRadius: 10, border: '1px solid var(--color-divider)',
  background: 'color-mix(in srgb, var(--color-text) 5%, transparent)',
  color: 'var(--color-text)', padding: '0 14px', fontSize: 15, fontFamily: 'var(--font-body)',
};

export const amountInput: CSSProperties = {
  flex: 1, minWidth: 0, fontSize: 30, fontWeight: 600, background: 'transparent',
  border: 'none', color: 'var(--color-text)', fontFamily: 'var(--font-body)',
  letterSpacing: '-0.01em',
};

export const submitBtn: CSSProperties = {
  height: 50, borderRadius: 10, border: '1px solid var(--color-accent)', background: 'transparent',
  color: 'var(--color-accent)', fontSize: 15, fontWeight: 500, cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};

export const dashedBtn: CSSProperties = {
  height: 46, borderRadius: 10, border: '1px dashed var(--color-divider)', background: 'transparent',
  color: 'var(--color-accent)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: 6,
};

export const formCard: CSSProperties = {
  ...card, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 18,
};

export const cancelBtn: CSSProperties = {
  flex: 1, height: 44, borderRadius: 10, border: '1px solid var(--color-divider)',
  background: 'transparent', color: 'var(--color-text)', fontSize: 13, fontWeight: 500,
  cursor: 'pointer', fontFamily: 'var(--font-body)',
};

export const confirmBtn: CSSProperties = {
  flex: 1, height: 44, borderRadius: 10, border: '1px solid var(--color-accent)',
  background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
  color: 'var(--color-accent)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};

export const smallCancelBtn: CSSProperties = {
  height: 36, padding: '0 12px', borderRadius: 9, border: '1px solid var(--color-divider)',
  background: 'transparent', color: 'var(--color-text)', fontSize: 12.5, fontWeight: 500,
  cursor: 'pointer', fontFamily: 'var(--font-body)',
};

export const smallConfirmBtn: CSSProperties = {
  height: 36, padding: '0 12px', borderRadius: 9, border: '1px solid var(--color-accent)',
  background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
  color: 'var(--color-accent)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};

export const trashBtn: CSSProperties = {
  width: 36, height: 36, flex: 'none', borderRadius: 9, border: 'none', background: 'transparent',
  color: 'var(--mp-muted)', fontSize: 16, cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};

export const backBtn: CSSProperties = {
  width: 44, height: 44, borderRadius: 10, border: '1px solid var(--color-divider)',
  background: 'transparent', color: 'var(--color-text)', fontSize: 17, cursor: 'pointer',
};

export const linkBtn: CSSProperties = {
  border: 'none', background: 'transparent', color: 'var(--color-accent)', fontSize: 13,
  fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex',
  alignItems: 'center', gap: 5,
};

export const progressTrack: CSSProperties = {
  height: 6, borderRadius: 3, background: 'color-mix(in srgb, var(--color-text) 10%, transparent)',
  overflow: 'hidden',
};

/** Selected/unselected chip styling used by every picker in the design. */
export function chipStyle(selected: boolean): CSSProperties {
  return {
    border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-divider)'}`,
    background: selected ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'transparent',
  };
}
