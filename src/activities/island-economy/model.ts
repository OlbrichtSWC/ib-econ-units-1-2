/**
 * Castaway Council (1.1): the rules behind the game, kept apart from the screen so they can be tested.
 *
 * Level 1: sort what washes ashore into the factors of production (or a free good), then rank
 * village projects and name the opportunity cost of the choice.
 * Level 2: answer what, how and for whom the way each economic system does.
 * Level 3: read clues and name the economic system.
 */

export type Factor = 'land' | 'labour' | 'capital' | 'enterprise' | 'free';
export const FACTORS: Factor[] = ['land', 'labour', 'capital', 'enterprise', 'free'];

export type System = 'market' | 'planned' | 'mixed';
export const SYSTEMS: System[] = ['market', 'planned', 'mixed'];

export type Question = 'what' | 'how' | 'forWhom';
export const QUESTIONS: Question[] = ['what', 'how', 'forWhom'];

/** Level 1: how many items must be sorted right on the first try, out of all of them. */
export const BEACH_GOAL = 10;
/** Level 2: right first time, out of 9 (3 villages x 3 questions). */
export const VILLAGE_GOAL = 8;
/** Level 3: cases solved with the first guess. */
export const DETECTIVE_GOAL = 5;

/**
 * The opportunity cost of a choice is the next best alternative given up.
 * `ranking` lists the projects from most to least wanted; the village can afford the first `affordable`.
 * Returns null when every project is affordable (nothing is given up).
 */
export function opportunityCost(ranking: string[], affordable: number): string | null {
  if (affordable < 0) throw new Error('affordable must be 0 or more');
  return affordable < ranking.length ? ranking[affordable] : null;
}

/** Level 1 is won when enough items were sorted right first time AND the opportunity cost was named right. */
export function beachWon(firstTryRight: number, costRight: boolean, goal = BEACH_GOAL): boolean {
  return firstTryRight >= goal && costRight;
}

export function villageWon(firstTryRight: number, goal = VILLAGE_GOAL): boolean {
  return firstTryRight >= goal;
}

export function detectiveWon(firstGuessRight: number, goal = DETECTIVE_GOAL): boolean {
  return firstGuessRight >= goal;
}

/** Fisher-Yates shuffle with a seed, so a level replays in a new order but tests stay repeatable. */
export function shuffled<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = (seed * 9301 + 49297) % 233280 || 1;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
