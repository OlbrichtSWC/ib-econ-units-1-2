/**
 * Glossary: tap or click any underlined term to see its meaning in plain language.
 * Terms come from content/glossary.json.
 */
import { ComponentChildren, createContext } from 'preact';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { loadJson } from './loader';

export interface GlossaryEntry {
  term: string;
  /** Other spellings that point to this term, for example "PED". */
  aliases?: string[];
  /** Plain-language meaning, 1 or 2 short sentences. */
  meaning: string;
  /** Optional everyday example. */
  example?: string;
  /** Syllabus code, for example "2.5". */
  code?: string;
  hl?: boolean;
}

export interface GlossaryFile {
  terms: GlossaryEntry[];
}

const GlossaryCtx = createContext<Map<string, GlossaryEntry>>(new Map());

export function indexGlossary(file: GlossaryFile): Map<string, GlossaryEntry> {
  const m = new Map<string, GlossaryEntry>();
  for (const t of file.terms) {
    m.set(t.term.toLowerCase(), t);
    t.aliases?.forEach((a) => m.set(a.toLowerCase(), t));
  }
  return m;
}

export function GlossaryProvider({ path, children }: { path: string; children: ComponentChildren }) {
  const [map, setMap] = useState<Map<string, GlossaryEntry>>(new Map());
  useEffect(() => {
    loadJson<GlossaryFile>(path).then((f) => setMap(indexGlossary(f))).catch(() => setMap(new Map()));
  }, [path]);
  return <GlossaryCtx.Provider value={map}>{children}</GlossaryCtx.Provider>;
}

export function useGlossary() {
  return useContext(GlossaryCtx);
}

export function GlossaryTerm({ term, shown }: { term: string; shown?: string }) {
  const map = useGlossary();
  const entry = map.get(term.toLowerCase());
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!entry) return <>{shown ?? term}</>;
  return (
    <span ref={wrap} style={{ position: 'relative', display: 'inline' }}>
      <button type="button" class="term" aria-expanded={open} onClick={() => setOpen(!open)}>
        {shown ?? term}
      </button>
      {open && (
        <span role="note" class="term-pop">
          <strong>{entry.term}</strong>
          {entry.hl && <span class="badge badge-hl" style={{ marginLeft: 6 }}>HL</span>}
          <span style={{ display: 'block', marginTop: 4 }}>{entry.meaning}</span>
          {entry.example && (
            <span class="muted" style={{ display: 'block', marginTop: 4 }}>
              Example: {entry.example}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
