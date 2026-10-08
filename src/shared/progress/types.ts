/**
 * Progress data. This is the ONLY information the app keeps about a student,
 * and it never leaves their device unless they copy their own progress code.
 * No names, no free-text answers, no personal details.
 */

/** Step flags, combined as a bitmask in ActivityProgress.steps. */
export const STEP = {
  learn: 1,
  try: 2,
  check: 4,
  rated: 8,
} as const;

export interface ActivityProgress {
  /** Which steps are complete (STEP bitmask). */
  steps: number;
  /** Check it: questions answered correctly in the latest attempt. */
  correct: number;
  /** Check it: questions in the latest attempt. */
  total: number;
  /** Check it: hints used in the latest attempt. */
  hints: number;
  /** Check it: harder "apply it" questions answered correctly without a hint. */
  applyCorrect: number;
  /** Check it: number of "apply it" questions. */
  applyTotal: number;
  /** Self-rating on the proficiency scale: 0 = not rated, 1 = Beginning 1 ... 8 = Exemplary 2. */
  rating: number;
  /** Day of the last change (days since 1 Jan 2024), used to keep the newer progress. */
  updated: number;
}

export interface Progress {
  activities: Record<string, ActivityProgress>;
}

export function emptyProgress(): Progress {
  return { activities: {} };
}

export function emptyActivity(): ActivityProgress {
  return { steps: 0, correct: 0, total: 0, hints: 0, applyCorrect: 0, applyTotal: 0, rating: 0, updated: today() };
}

const EPOCH = Date.UTC(2024, 0, 1);

/** Today's day number (days since 1 Jan 2024, UTC). */
export function today(now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - EPOCH) / 86400000));
}

export function dayToDate(day: number): Date {
  return new Date(EPOCH + day * 86400000);
}

export type ImportResult =
  | { ok: true; progress: Progress; unknownActivities: number }
  | { ok: false; reason: 'empty' | 'typo' | 'newer-version' };

/**
 * The one interface every activity uses to save and load progress.
 * Version 1 stores progress in the browser (LocalProgressStore).
 * A later version could add a school-approved database by writing another class
 * with these same methods; no activity code would need to change.
 */
export interface ProgressStore {
  load(): Progress;
  save(progress: Progress): void;
  reset(): void;
  exportCode(): string;
  importCode(code: string): ImportResult;
  /** Called whenever progress changes. Returns a function that stops listening. */
  subscribe(listener: (progress: Progress) => void): () => void;
}
