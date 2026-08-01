import { useEffect, useState } from 'react';
import { AVATAR_KEYS, avatarBackground, displayName } from '../lib/avatars';
import type { Profile } from '../types';
import { cancelBtn, card, confirmBtn, field, label } from '../ui';

type Props = {
  profile: Profile;
  email: string;
  busy: boolean;
  onSave: (i: { nickname: string; avatar: string }) => Promise<boolean>;
  onSignOut: () => void;
};

/**
 * Foto y apodo del usuario, con la rueda que abre la configuración.
 *
 * El correo vive detrás de la rueda a propósito: identifica la cuenta cuando
 * hace falta, pero no está expuesto en la pantalla cada vez que se abre el
 * historial.
 */
export default function ProfileCard({ profile, email, busy, onSave, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState(profile.nickname ?? '');
  const [avatar, setAvatar] = useState(profile.avatar);

  // Reflejar lo que llegue de la base — el perfil carga después del primer render.
  useEffect(() => {
    setNickname(profile.nickname ?? '');
    setAvatar(profile.avatar);
  }, [profile.nickname, profile.avatar]);

  const dirty = nickname.trim() !== (profile.nickname ?? '').trim() || avatar !== profile.avatar;

  async function save() {
    if (busy) return;
    const ok = await onSave({ nickname, avatar });
    if (ok) setOpen(false);
  }

  function cancel() {
    setNickname(profile.nickname ?? '');
    setAvatar(profile.avatar);
    setOpen(false);
  }

  return (
    <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          aria-hidden="true"
          style={{
            width: 48, height: 48, borderRadius: '50%', flex: 'none',
            background: avatarBackground(profile.avatar),
            boxShadow: '0 0 0 1px color-mix(in srgb, var(--color-text) 10%, transparent)',
          }}
        />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'block', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {displayName(profile.nickname, email)}
          </span>
          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--mp-muted)' }}>
            {profile.nickname ? 'Tu perfil' : 'Ponte un apodo'}
          </span>
        </span>
        <button
          onClick={() => (open ? cancel() : setOpen(true))}
          aria-label={open ? 'Cerrar ajustes' : 'Ajustes de perfil'}
          aria-expanded={open}
          className="mp-h-soft7"
          style={{
            width: 40, height: 40, flex: 'none', borderRadius: 10, border: 'none',
            background: 'transparent', color: 'var(--mp-muted)', fontSize: 19,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: open ? 'rotate(60deg)' : 'none', transition: 'transform .25s ease',
          }}
        >
          <i className="ph ph-gear-six" />
        </button>
      </div>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'mpFadeUp .2s ease' }}>
          <div style={{ height: 1, background: 'var(--color-divider)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={label}>Tu correo</span>
            <span style={{ fontSize: 13.5, wordBreak: 'break-all' }}>{email}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={label} htmlFor="mp-nickname">Apodo</label>
            <input
              id="mp-nickname"
              type="text"
              maxLength={40}
              placeholder="Cómo quieres que te llame"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={field}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={label}>Foto</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {AVATAR_KEYS.map((key) => {
                const picked = avatar === key;
                return (
                  <button
                    key={key}
                    onClick={() => setAvatar(key)}
                    aria-label={`Foto ${key}`}
                    aria-pressed={picked}
                    style={{
                      aspectRatio: '1', borderRadius: '50%', cursor: 'pointer', padding: 0,
                      background: avatarBackground(key),
                      border: picked ? '2px solid var(--color-accent)' : '2px solid transparent',
                      boxShadow: picked
                        ? '0 0 0 2px var(--color-surface) inset'
                        : '0 0 0 1px color-mix(in srgb, var(--color-text) 10%, transparent)',
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={cancel} style={cancelBtn}>Cancelar</button>
            <button onClick={save} disabled={!dirty || busy} style={confirmBtn}>Guardar</button>
          </div>

          <button
            onClick={onSignOut}
            style={{
              border: 'none', background: 'transparent', color: 'var(--color-accent)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
              padding: '6px 0', alignSelf: 'flex-start',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
