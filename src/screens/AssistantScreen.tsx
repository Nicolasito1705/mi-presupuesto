import { useState } from 'react';
import { buildInsights, reply, SUGGESTIONS, type AssistantInput } from '../lib/assistant';
import { card, screen, title } from '../ui';

type Msg = { me: boolean; text: string };

export default function AssistantScreen({ data }: { data: AssistantInput }) {
  const [chat, setChat] = useState<Msg[]>([
    {
      me: false,
      text:
        'Hola. Respondo con tus propios datos — no soy un modelo de lenguaje, así que entiendo ' +
        'ciertos temas y no todos. Toca una sugerencia o escríbeme.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);

  const insights = buildInsights(data);

  function ask(question: string) {
    if (typing) return;
    setChat((c) => [...c, { me: true, text: question }]);
    setDraft('');
    setTyping(true);
    window.setTimeout(() => {
      setChat((c) => [...c, { me: false, text: reply(question, data) }]);
      setTyping(false);
    }, 450);
  }

  function send() {
    const q = draft.trim();
    if (!q) return;
    ask(q);
  }

  return (
    <div data-screen-label="AI Insights" style={{ ...screen, flex: 1 }}>
      <div style={{ paddingTop: 6 }}>
        <div style={title}>Asistente</div>
        <div style={{ fontSize: 12.5, color: 'var(--mp-muted)' }}>
          Consejos generados con tus datos de {data.monthName.toLowerCase()}
        </div>
      </div>

      {insights.map((n) => (
        <div key={n.key} style={{ ...card, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: `color-mix(in srgb, ${n.color} 18%, transparent)`,
              color: n.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flex: 'none', marginTop: 2,
            }}
          >
            <i className={`ph ${n.icon}`} />
          </span>
          <span>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{n.title}</span>
            <span style={{ display: 'block', fontSize: 13, color: 'var(--mp-muted)', marginTop: 2, textWrap: 'pretty' }}>
              {n.body}
            </span>
          </span>
        </div>
      ))}

      <div style={{ flex: 1 }} />

      {chat.map((m, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: m.me ? 'flex-end' : 'flex-start' }}>
          <div
            style={{
              maxWidth: '78%', padding: '10px 13px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.45,
              background: m.me ? 'color-mix(in srgb, var(--color-accent) 20%, transparent)' : 'var(--color-surface)',
              color: 'var(--color-text)', textWrap: 'pretty',
            }}
          >
            {m.text}
          </div>
        </div>
      ))}

      {typing && <div style={{ fontSize: 12, color: 'var(--mp-muted)', paddingLeft: 4 }}>Escribiendo…</div>}

      {/* A rule-based assistant is only as good as the user's guess about what
          it understands — the chips remove the guessing. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="mp-h-accent8"
            style={{
              padding: '7px 11px', borderRadius: 999, border: '1px solid var(--color-divider)',
              background: 'transparent', color: 'var(--mp-muted)', fontSize: 12,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, position: 'sticky', bottom: 0, background: 'var(--color-bg)', paddingTop: 4 }}>
        <input
          type="text"
          placeholder="¿Cómo puedo ahorrar más este mes?"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          style={{
            flex: 1, minWidth: 0, height: 46, borderRadius: 12, border: '1px solid var(--color-divider)',
            background: 'var(--color-surface)', color: 'var(--color-text)', padding: '0 14px',
            fontSize: 14, fontFamily: 'var(--font-body)',
          }}
        />
        <button
          onClick={send}
          aria-label="Enviar"
          className="mp-h-accent12"
          style={{
            width: 46, height: 46, borderRadius: 12, border: '1px solid var(--color-accent)',
            background: 'transparent', color: 'var(--color-accent)', fontSize: 18, cursor: 'pointer',
          }}
        >
          <i className="ph ph-paper-plane-tilt" />
        </button>
      </div>
    </div>
  );
}
