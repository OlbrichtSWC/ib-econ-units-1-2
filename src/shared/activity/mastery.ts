/**
 * Suggests a proficiency level from Check it evidence. Formative only: the student
 * chooses their own rating, and the teacher decides any real grade.
 *
 * Honest thresholds:
 *  - Fewer than 3 questions answered: no suggestion (not enough evidence).
 *  - Proficient needs at least 80% correct.
 *  - Exemplary needs every "apply it" question right on the first try with at most one hint (at least 2 of them)
 *    and at least 90% overall. Easy "core" questions alone can never reach Exemplary.
 *  - Exemplary 2 also needs a perfect score with no hints at all.
 *
 * Levels: 1 Beginning 1, 2 Beginning 2, 3 Developing 1, 4 Developing 2,
 *         5 Proficient 1, 6 Proficient 2, 7 Exemplary 1, 8 Exemplary 2.
 */
export interface Evidence {
  correct: number;
  total: number;
  hints: number;
  applyCorrect: number;
  applyTotal: number;
}

export function suggestLevel(e: Evidence): number | null {
  if (e.total < 3) return null;
  const acc = e.correct / e.total;
  if (acc < 0.3) return 1;
  if (acc < 0.5) return 2;
  if (acc < 0.65) return 3;
  if (acc < 0.8) return 4;
  const applyAll = e.applyTotal >= 2 && e.applyCorrect === e.applyTotal;
  if (acc >= 0.9 && applyAll) {
    return acc === 1 && e.hints === 0 ? 8 : 7;
  }
  // Proficient 2: strong score, few hints, and at least half the apply questions on the first try with at most one hint.
  const applyHalf = e.applyTotal === 0 || e.applyCorrect / e.applyTotal >= 0.5;
  if (acc >= 0.9 && e.hints <= Math.floor(e.total / 4) && applyHalf) return 6;
  return 5;
}

export const DEFAULT_LEVELS = [
  { name: 'Beginning 1', group: 'Beginning' },
  { name: 'Beginning 2', group: 'Beginning' },
  { name: 'Developing 1', group: 'Developing' },
  { name: 'Developing 2', group: 'Developing' },
  { name: 'Proficient 1', group: 'Proficient' },
  { name: 'Proficient 2', group: 'Proficient' },
  { name: 'Exemplary 1', group: 'Exemplary' },
  { name: 'Exemplary 2', group: 'Exemplary' },
];
