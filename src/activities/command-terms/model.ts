/**
 * Command terms (exam skills): the rules behind the control tower, kept apart from the screen so they can be tested.
 */

export type Ao = 'AO1' | 'AO2' | 'AO3' | 'AO4';
export const AOS: Ao[] = ['AO1', 'AO2', 'AO3', 'AO4'];

export interface Term { term: string; ao: Ao; meaning: string }

/** Level 1: planes landed on the right runway first time (out of 14). */
export const RUNWAY_GOAL = 11;
/** Level 2: flight plans chosen right first time (out of 8). */
export const PLAN_GOAL = 6;
/** Level 3: first-try points (one per verdict, one per fix). */
export const BOX_GOAL = 11;

/** The assessment objective of a command term, as listed in the IB guide. */
export function aoOf(terms: readonly Term[], term: string): Ao | undefined {
  return terms.find((t) => t.term.toLowerCase() === term.toLowerCase())?.ao;
}

/** The command term is shown in bold at the start of the question, so students can find it. */
export function termInQuestion(question: string, term: string): boolean {
  return question.toLowerCase().includes(`**${term.toLowerCase()}**`);
}

/** Level 3 points: every answer has a verdict; answers with a problem also have a fix. */
export function boxMax(boxes: readonly { verdict: string }[]): number {
  return boxes.length + boxes.filter((b) => b.verdict !== 'ok').length;
}

export const runwayWon = (firstTry: number) => firstTry >= RUNWAY_GOAL;
export const planWon = (firstTry: number) => firstTry >= PLAN_GOAL;
export const boxWon = (points: number) => points >= BOX_GOAL;

/** How many scenarios one round draws from the bigger pool. The goals above are out of these. */
export const RUNWAY_DRAW = 14;
