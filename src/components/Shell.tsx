import type { ReactNode } from 'react';
import IOSDevice from './IOSDevice';

type Props = {
  theme: 'dark' | 'light';
  narrow: boolean;
  error: string | null;
  onDismissError: () => void;
  /** Tab bar and the close-month dialog, rendered outside the scroll area. */
  footer?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
};

/**
 * The frame every screen sits in: device bezel, themed ground, scrolling
 * content area with the prototype's 64px top inset, then the fixed footer.
 *
 * Declared at module scope on purpose — nesting it inside App would give React
 * a fresh component type each render and remount the whole screen on every
 * keystroke.
 */
export default function Shell({ theme, narrow, error, onDismissError, footer, overlay, children }: Props) {
  return (
    <div className="mp-stage" data-theme={theme}>
      <IOSDevice dark={theme === 'dark'} bare={narrow}>
        <div
          style={{
            height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)',
            color: 'var(--color-text)', fontFamily: 'var(--font-body)', position: 'relative',
          }}
        >
          <div
            style={{
              flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
              padding: narrow ? 'calc(env(safe-area-inset-top) + 16px) 16px 12px' : '64px 16px 12px',
            }}
          >
            {error && (
              <div
                onClick={onDismissError}
                role="alert"
                style={{
                  marginBottom: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  background: 'color-mix(in srgb, #e07a7a 16%, transparent)',
                  color: 'var(--color-text)', fontSize: 12.5, textWrap: 'pretty',
                }}
              >
                {error}
              </div>
            )}
            {children}
          </div>

          {footer}
          {overlay}
        </div>
      </IOSDevice>
    </div>
  );
}
