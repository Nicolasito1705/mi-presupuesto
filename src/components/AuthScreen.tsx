import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { field, formCard, label, submitBtn, title } from '../ui';

export default function AuthScreen() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmit = /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const { data, error: err } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (err) setError(err.message);
    else if (mode === 'up' && !data.session) {
      setNotice('Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
    }
    setBusy(false);
  }

  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: 16, animation: 'mpFadeUp .25s ease',
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: 'var(--mp-muted)' }}>Mi presupuesto</div>
        <div style={title}>{mode === 'in' ? 'Inicia sesión' : 'Crea tu cuenta'}</div>
      </div>

      <form style={formCard} onSubmit={submit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={label}>Correo</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={field}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={label}>Contraseña</label>
          <input
            type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={field}
          />
        </div>

        {error && <div style={{ fontSize: 12.5, color: '#e07a7a', textWrap: 'pretty' }}>{error}</div>}
        {notice && <div style={{ fontSize: 12.5, color: 'var(--mp-muted)', textWrap: 'pretty' }}>{notice}</div>}

        <button type="submit" disabled={!canSubmit || busy} className="mp-h-accent12" style={submitBtn}>
          {busy ? 'Un momento…' : mode === 'in' ? 'Entrar' : 'Crear cuenta'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(null); setNotice(null); }}
          style={{
            border: 'none', background: 'transparent', color: 'var(--color-accent)', fontSize: 13,
            fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          {mode === 'in' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </form>
    </div>
  );
}
