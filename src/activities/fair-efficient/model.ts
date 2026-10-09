/**
 * Fair or Efficient? (2.12, HL): the rules behind the game, kept apart from the screen so they can be tested.
 */

/** Level 1: is a case about equity (fairness) or equality (everyone the same)? */
export type Fairness = 'equity' | 'equality';
export const FAIRNESS: Fairness[] = ['equity', 'equality'];

/** Level 2: the four verdicts on a market outcome. */
export type Verdict = 'efficient' | 'equitable' | 'both' | 'neither';
export const VERDICTS: Verdict[] = ['efficient', 'equitable', 'both', 'neither'];

/** Level 1: sort 12 cases. Goal: 10 right first time. */
export const SORT_GOAL = 10;
/** Level 2: 8 outcomes, each with a verdict and a reason. Goal: 6 rounds with no wrong try. */
export const JUDGE_GOAL = 6;
/** Level 3: causes + calculations + responses, one point each on the first try. */
export const FLOW_GOAL = 11;

export const sortWon = (firstRight: number, goal = SORT_GOAL) => firstRight >= goal;
export const judgeWon = (firstRight: number) => firstRight >= JUDGE_GOAL;
export const flowWon = (points: number) => points >= FLOW_GOAL;

/** Does the verdict say the outcome is efficient? Is it equitable? */
export function isEfficient(v: Verdict): boolean {
  return v === 'efficient' || v === 'both';
}
export function isEquitable(v: Verdict): boolean {
  return v === 'equitable' || v === 'both';
}

/** The verdict from its two parts. */
export function verdictOf(efficient: boolean, equitable: boolean): Verdict {
  if (efficient && equitable) return 'both';
  if (efficient) return 'efficient';
  if (equitable) return 'equitable';
  return 'neither';
}

/**
 * Tilt of the balance scale in degrees. Positive tips the right pan down.
 * Each unit of difference tips it a little, up to a limit so it never flips over.
 */
export function tilt(left: number, right: number, step = 6, max = 18): number {
  const d = (right - left) * step;
  return Math.max(-max, Math.min(max, d));
}

/** Tilt for one verdict, with Efficiency on the left pan and Equity on the right. */
export function verdictTilt(v: Verdict): number {
  return tilt(isEfficient(v) ? 1 : 0, isEquitable(v) ? 1 : 0, 14);
}

/** Total income of a group of households. */
export function total(incomes: number[]): number {
  return incomes.reduce((s, x) => s + x, 0);
}

/** Share of total income (%) received by the households at the given positions. */
export function incomeShare(incomes: number[], group: number[]): number {
  const all = total(incomes);
  if (all <= 0) return 0;
  return (total(group.map((i) => incomes[i])) / all) * 100;
}

/** Round to 2 decimal places for checking typed answers. */
export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Is a typed answer close enough? */
export function numberRight(typed: number, answer: number, tolerance = 0.1): boolean {
  return Number.isFinite(typed) && Math.abs(typed - answer) <= tolerance;
}

/** Read a typed number. Allows "45", "45%", "$90". Anything else is NaN. */
export function parseNumber(text: string): number {
  const t = text.replace(/[$%,\s]/g, '');
  if (!/^-?\d*\.?\d+$/.test(t)) return NaN;
  return Number(t);
}

/** Points available in level 3. */
export function flowMax(causes: number, calcs: number, responses: number): number {
  return causes + calcs + responses;
}

/** Width of a money flow in the circular flow picture: wider for bigger incomes. */
export function flowWidth(income: number, biggest: number, min = 2, max = 16): number {
  if (biggest <= 0) return min;
  return min + (max - min) * Math.max(0, Math.min(1, income / biggest));
}
