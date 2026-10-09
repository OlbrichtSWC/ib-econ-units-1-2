/**
 * Used Car Lot (2.10, HL): the rules behind the game, kept apart from the screen so they can be tested.
 *
 * Asymmetric information on a used car lot. Each owner knows the quality of their car. Buyers do not.
 * A car type has:
 *   worth  what the car is worth to a buyer (the most a buyer would pay if they could see the quality)
 *   min    the lowest price its owner will accept
 * Buyers who cannot see quality will pay at most the expected value: the average worth of the cars on
 * the lot, weighted by how many of each type there are. Owners whose minimum is above that price drive
 * away. If the best cars leave, the average falls, and the price falls again: adverse selection.
 */

/** Quality grades, best first. */
export type Grade = 'good' | 'fair' | 'lemon';
export const GRADES: Grade[] = ['good', 'fair', 'lemon'];

export interface CarType {
  grade: Grade;
  worth: number;
  min: number;
  count: number;
}

/** A lot: the car types still on it (best first). */
export type Lot = CarType[];

export const totalCars = (lot: Lot) => lot.reduce((s, c) => s + c.count, 0);

/** Expected value for a buyer who cannot see quality: the weighted average worth. */
export function expectedValue(lot: Lot): number {
  const n = totalCars(lot);
  if (n === 0) return 0;
  return lot.reduce((s, c) => s + c.worth * c.count, 0) / n;
}

/** Expected value with two types: share of good cars (0 to 1) times the good worth, plus the rest times the poor worth. */
export function expectedValue2(shareGood: number, goodWorth: number, poorWorth: number): number {
  return shareGood * goodWorth + (1 - shareGood) * poorWorth;
}

/** The smallest share of good cars (0 to 1) that keeps good car owners on the lot, with two types. */
export function minShareToStay(goodWorth: number, poorWorth: number, goodMin: number): number {
  if (goodWorth <= poorWorth) throw new RangeError('Good cars must be worth more than poor cars.');
  return Math.max(0, Math.min(1, (goodMin - poorWorth) / (goodWorth - poorWorth)));
}

/** Does the owner sell at this price? Only if the price is at least their minimum. */
export const accepts = (c: CarType, price: number) => price >= c.min;

/** The car types whose owners drive away at this price. */
export function leaving(lot: Lot, price: number): Grade[] {
  return lot.filter((c) => !accepts(c, price)).map((c) => c.grade);
}

/** The lot after one round: owners who will not accept the buyers' price leave. */
export function nextLot(lot: Lot, price = expectedValue(lot)): Lot {
  return lot.filter((c) => accepts(c, price));
}

/** Share of the cars on the lot that are good (0 to 1). */
export function shareGood(lot: Lot): number {
  const n = totalCars(lot);
  return n === 0 ? 0 : (lot.find((c) => c.grade === 'good')?.count ?? 0) / n;
}

export interface Stage {
  lot: Lot;
  price: number;
  leave: Grade[];
}

/** Play the market round by round until no one else leaves. Each stage: the lot, the buyers' price, who leaves. */
export function spiral(start: Lot): Stage[] {
  const out: Stage[] = [];
  let lot = start;
  for (let guard = 0; guard < 10 && lot.length > 0; guard++) {
    const price = expectedValue(lot);
    const leave = leaving(lot, price);
    out.push({ lot, price, leave });
    if (leave.length === 0) break;
    lot = nextLot(lot, price);
  }
  return out;
}

/** A price option in level 1, with the slip it stands for. */
export type PriceKind = 'expected' | 'previous' | 'best' | 'unweighted' | 'ownerMin';
export interface PriceOption { kind: PriceKind; value: number }

/**
 * The price options for a stage, the right one (expected value) first, then common slips:
 * the old price, the worth of the best car, a plain average that ignores how many cars of each type,
 * and the average of the owners' minimums. Options with the same value as one before are left out.
 */
export function priceOptions(lot: Lot, previous?: number): PriceOption[] {
  const n = totalCars(lot);
  const raw: PriceOption[] = [
    { kind: 'expected', value: expectedValue(lot) },
    ...(previous === undefined ? [] : [{ kind: 'previous' as const, value: previous }]),
    { kind: 'best', value: Math.max(...lot.map((c) => c.worth)) },
    { kind: 'unweighted', value: lot.reduce((s, c) => s + c.worth, 0) / lot.length },
    { kind: 'ownerMin', value: n === 0 ? 0 : lot.reduce((s, c) => s + c.min * c.count, 0) / n },
  ];
  return raw.filter((o, i) => raw.findIndex((p) => Math.abs(p.value - o.value) < 1e-6) === i);
}

/**
 * The "who drives away?" options for a stage. Owners leave from the top, so the options are:
 * no one, the best type, the best two types, and so on up to every owner, plus "only the lemons leave" as a slip.
 * Each option is a list of grades that leave.
 */
export function leaveOptions(lot: Lot): Grade[][] {
  const grades = lot.map((c) => c.grade);
  const out: Grade[][] = [];
  for (let j = 0; j <= grades.length; j++) out.push(grades.slice(0, j));
  const worst = grades[grades.length - 1];
  if (grades.length > 1 && worst === 'lemon') out.push(['lemon']);
  return out;
}

export const sameGrades = (a: Grade[], b: Grade[]) => a.length === b.length && a.every((g) => b.includes(g));

/** Level 2: who acts to fix the information gap, and how. */
export type Response = 'signalling' | 'screening' | 'legislation' | 'information';
export const RESPONSES: Response[] = ['signalling', 'screening', 'legislation', 'information'];
export type Actor = 'informed' | 'uninformed' | 'government';

/**
 * The IB responses to asymmetric information.
 * Private: the side that knows more shows it (signalling); the side that knows less finds out (screening).
 * Government: makes laws and rules (legislation and regulation), or gives people the facts (provision of information).
 */
export function responseFor(actor: Actor, act: 'rule' | 'facts' = 'rule'): Response {
  if (actor === 'informed') return 'signalling';
  if (actor === 'uninformed') return 'screening';
  return act === 'facts' ? 'information' : 'legislation';
}

export const isPrivate = (r: Response) => r === 'signalling' || r === 'screening';

/** Level 3: when is the information hidden? */
export type Problem = 'adverse' | 'moral';
export const PROBLEMS: Problem[] = ['adverse', 'moral'];

/** Hidden information about quality or risk BEFORE the deal is adverse selection. Hidden actions AFTER the deal is moral hazard. */
export function problemFor(hidden: 'before' | 'after'): Problem {
  return hidden === 'before' ? 'adverse' : 'moral';
}

/** Level 1: questions right first time. */
export const BID_GOAL = 12;
/** Level 2: cases right first time. */
export const SIGNAL_GOAL = 8;
/** Level 3: first-try points (problem and response in each case). */
export const HAZARD_GOAL = 13;
export const POINTS_PER_HAZARD_CASE = 2;

export const bidWon = (firstRight: number, goal = BID_GOAL) => firstRight >= goal;
export const signalWon = (firstRight: number, goal = SIGNAL_GOAL) => firstRight >= goal;
export const hazardWon = (points: number, goal = HAZARD_GOAL) => points >= goal;

/** Level 1 questions: per stage a price question and a "who leaves" question, then one "why" question per lot. */
export function questionsPerLot(start: Lot): number {
  return spiral(start).length * 2 + 1;
}

/** Trust on the lot in level 2 (0 to 1): each case solved brings a good car back. */
export const trust = (solved: number, total: number) => (total <= 0 ? 0 : Math.max(0, Math.min(1, solved / total)));

/** Money as shown on screen: $7,600. */
export function money(v: number): string {
  return `$${Math.round(v).toLocaleString('en-US')}`;
}
