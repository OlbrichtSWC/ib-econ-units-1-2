/**
 * Saves progress in the student's own browser (localStorage). Nothing is sent anywhere.
 * If the browser blocks storage (some private windows), progress lasts until the tab closes.
 */
import { decodeProgress, encodeProgress } from './code';
import { ActivityProgress, emptyProgress, ImportResult, Progress, ProgressStore } from './types';

export class LocalProgressStore implements ProgressStore {
  private memory: Progress | null = null;
  private listeners = new Set<(p: Progress) => void>();

  constructor(
    private key: string,
    private idTable: readonly string[],
  ) {}

  load(): Progress {
    if (this.memory) return this.memory;
    let p = emptyProgress();
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) p = sanitize(JSON.parse(raw));
    } catch {
      /* storage blocked or damaged: start fresh */
    }
    this.memory = p;
    return p;
  }

  save(progress: Progress): void {
    this.memory = progress;
    try {
      localStorage.setItem(this.key, JSON.stringify(progress));
    } catch {
      /* storage blocked: keep in memory only */
    }
    this.listeners.forEach((l) => l(progress));
  }

  reset(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* ignore */
    }
    this.save(emptyProgress());
  }

  exportCode(): string {
    return encodeProgress(this.load(), this.idTable);
  }

  importCode(code: string): ImportResult {
    return decodeProgress(code, this.idTable);
  }

  subscribe(listener: (p: Progress) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

const FIELDS: (keyof ActivityProgress)[] = ['steps', 'correct', 'total', 'hints', 'applyCorrect', 'applyTotal', 'rating', 'updated'];

/** Keeps only well-formed numeric progress fields, so damaged storage cannot break the app. */
function sanitize(raw: unknown): Progress {
  const out = emptyProgress();
  const acts = (raw as Progress | null)?.activities;
  if (!acts || typeof acts !== 'object') return out;
  for (const [id, a] of Object.entries(acts)) {
    if (!a || typeof a !== 'object') continue;
    const clean = {} as ActivityProgress;
    for (const f of FIELDS) {
      const v = (a as unknown as Record<string, unknown>)[f];
      clean[f] = typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
    }
    clean.rating = Math.min(8, clean.rating);
    out.activities[id] = clean;
  }
  return out;
}
