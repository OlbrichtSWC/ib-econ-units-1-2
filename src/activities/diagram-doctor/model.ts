/**
 * Diagram Doctor (exam skills): the rules behind the game, kept apart from the screen so they can be tested.
 */

/** Level 1: patients cured right first time (out of 10). */
export const CHECKUP_GOAL = 8;
/** Level 2: first-try points, one for each of the 12 problems. */
export const WARD_GOAL = 10;
/** Level 3: diagnoses right first time (out of 9). */
export const TRIAGE_GOAL = 7;

export type ProblemId = 'axes' | 'curves' | 'slope' | 'shift' | 'marks' | 'area';
export const PROBLEMS: ProblemId[] = ['axes', 'curves', 'slope', 'shift', 'marks', 'area'];

/**
 * A problem earns its point only when the student went straight to it (no healthy tag tapped
 * while hunting for it) and chose the right cure first time.
 */
export function mistakePoint(wrongTaps: number, wrongCures: number): number {
  return wrongTaps === 0 && wrongCures === 0 ? 1 : 0;
}

/** A diagnosis is right only when it names exactly the problems the diagram has. An empty list means healthy. */
export function sameDiagnosis(chosen: readonly string[], answer: readonly string[]): boolean {
  const a = new Set(chosen), b = new Set(answer);
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/** Toggle a problem in the diagnosis. "Healthy" is the empty list, so it clears every problem. */
export function toggleProblem(chosen: readonly string[], id: string): string[] {
  return chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id];
}

/** How healthy the patient looks, from 0 to 1, as problems are cured. */
export function health(cured: number, total: number): number {
  return total === 0 ? 1 : Math.min(1, cured / total);
}

export const checkupWon = (firstTry: number) => firstTry >= CHECKUP_GOAL;
export const wardWon = (points: number) => points >= WARD_GOAL;
export const triageWon = (firstTry: number) => firstTry >= TRIAGE_GOAL;
