/**
 * The student's written explanations, saved in this browser only (localStorage), one per activity.
 * Writing is never sent anywhere and is not part of the progress code, because a code must stay short.
 * It shows on the My progress page, so printing that page (or saving it as a PDF) includes it.
 */
const PREFIX = 'ib-econ-writing:';
/** Longest explanation kept, so one runaway paste cannot fill the browser's storage. */
export const MAX_WRITING = 4000;

/** Kept in memory when the browser blocks storage. */
const memory = new Map<string, string>();

export function loadWriting(activityId: string): string {
  try {
    const v = localStorage.getItem(PREFIX + activityId);
    if (v !== null) return v;
  } catch {
    /* storage blocked */
  }
  return memory.get(activityId) ?? '';
}

export function saveWriting(activityId: string, text: string): void {
  const t = text.slice(0, MAX_WRITING);
  memory.set(activityId, t);
  try {
    if (t.trim()) localStorage.setItem(PREFIX + activityId, t);
    else localStorage.removeItem(PREFIX + activityId);
  } catch {
    /* storage blocked: memory only */
  }
}

/** Every saved explanation, for the activities given (in that order). Empty ones are left out. */
export function allWriting(activityIds: readonly string[]): { id: string; text: string }[] {
  return activityIds.map((id) => ({ id, text: loadWriting(id) })).filter((w) => w.text.trim() !== '');
}

export function clearWriting(activityIds: readonly string[]): void {
  for (const id of activityIds) {
    saveWriting(id, '');
    saveBuilt(id, { steps: 0, own: '' });
  }
}

/**
 * How far the student got in building an explanation: the number of sentences finished
 * (each has one right answer, so the count is enough) and their own extra sentence.
 */
export interface BuiltExplanation {
  steps: number;
  own: string;
}

const BUILT = 'ib-econ-explain:';
const builtMemory = new Map<string, BuiltExplanation>();

export function loadBuilt(activityId: string): BuiltExplanation | null {
  try {
    const v = localStorage.getItem(BUILT + activityId);
    if (v !== null) {
      const b = JSON.parse(v) as Partial<BuiltExplanation>;
      return { steps: Math.max(0, Math.floor(Number(b.steps) || 0)), own: String(b.own ?? '').slice(0, MAX_WRITING) };
    }
  } catch {
    /* storage blocked or bad data */
  }
  return builtMemory.get(activityId) ?? null;
}

export function saveBuilt(activityId: string, b: BuiltExplanation): void {
  const v = { steps: b.steps, own: b.own.slice(0, MAX_WRITING) };
  builtMemory.set(activityId, v);
  try {
    if (v.steps > 0 || v.own.trim()) localStorage.setItem(BUILT + activityId, JSON.stringify(v));
    else localStorage.removeItem(BUILT + activityId);
  } catch {
    /* storage blocked: memory only */
  }
}
