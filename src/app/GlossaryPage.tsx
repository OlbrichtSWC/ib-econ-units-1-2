import { useState } from 'preact/hooks';
import { useGlossary } from '../shared/content/Glossary';
import { HlBadge } from '../shared/design/components';

export function GlossaryPage() {
  const map = useGlossary();
  const [q, setQ] = useState('');
  const entries = [...new Set(map.values())]
    .filter((e) => !q || (e.term + ' ' + (e.aliases ?? []).join(' ') + ' ' + e.meaning).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.term.localeCompare(b.term));
  return (
    <div class="stack">
      <h1>Glossary</h1>
      <p>Key terms in plain language. In activities, tap any underlined word to see its meaning.</p>
      <div>
        <label for="g-search">Search</label>
        <br />
        <input id="g-search" type="text" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} style={{ width: 'min(100%, 360px)' }} />
      </div>
      <dl class="glossary-list">
        {entries.map((e) => (
          <div key={e.term} class="card">
            <dt>
              <strong>{e.term}</strong> {e.code && <span class="badge badge-code">{e.code}</span>} {e.hl && <HlBadge />}
              {e.aliases?.length ? <span class="small muted"> (also: {e.aliases.join(', ')})</span> : null}
            </dt>
            <dd style={{ margin: '6px 0 0' }}>
              {e.meaning}
              {e.example && <div class="small muted" style={{ marginTop: 4 }}>Example: {e.example}</div>}
            </dd>
          </div>
        ))}
      </dl>
      {!entries.length && <p>No terms match.</p>}
    </div>
  );
}
