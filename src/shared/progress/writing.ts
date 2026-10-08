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
  for (const id of activityIds) saveWriting(id, '');
}
