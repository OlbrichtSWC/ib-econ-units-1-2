/**
 * HINTS Market (2.5): the rules behind the game, kept apart from the screen so they can be tested.
 */

/** The HINTS determinants of PED, as Nate teaches them. */
export type Det = 'H' | 'I' | 'N' | 'T' | 'S';
export const DETS: Det[] = ['H', 'I', 'N', 'T', 'S'];

export type PedKind = 'elastic' | 'inelastic';
export const PED_KINDS: PedKind[] = ['elastic', 'inelastic'];

export type YedKind = 'necessity' | 'luxury' | 'inferior';
export const YED_KINDS: YedKind[] = ['necessity', 'luxury', 'inferior'];

/** Level 1: sort 10 goods at the stall. Both parts right first time counts. */
export const STALL_GOAL = 8;
/** Level 2: classify 6 goods from their Engel curves. */
export const LAB_GOAL = 5;
/** Level 3: 6 calculations, each with its classification. */
export const CALC_GOAL = 5;

/** Percentage change from the original value: (new − original) ÷ original × 100. */
export function pctChange(original: number, next: number): number {
  return ((next - original) / original) * 100;
}

/** Round to 2 decimal places, the way IB answers are usually given. */
export function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

/** PED = % change in quantity demanded ÷ % change in price. Negative for a normal demand curve. */
export function ped(p0: number, p1: number, q0: number, q1: number): number {
  return pctChange(q0, q1) / pctChange(p0, p1);
}

/** YED = % change in quantity demanded ÷ % change in income. */
export function yed(y0: number, y1: number, q0: number, q1: number): number {
  return pctChange(q0, q1) / pctChange(y0, y1);
}

/** Price elastic when the size of PED is above 1, price inelastic below 1. Exactly 1 is unitary. */
export function pedKind(value: number): PedKind | 'unitary' {
  const size = Math.abs(value);
  if (Math.abs(size - 1) < 1e-9) return 'unitary';
  return size > 1 ? 'elastic' : 'inelastic';
}

/** Inferior below 0, necessity between 0 and 1, luxury above 1. */
export function yedKind(value: number): YedKind | 'unit' {
  if (value < 0) return 'inferior';
  if (Math.abs(value - 1) < 1e-9) return 'unit';
  return value > 1 ? 'luxury' : 'necessity';
}

/** % change in quantity demanded from an elasticity and the % change in price or income. */
export function qtyChange(elasticity: number, pctOther: number): number {
  return elasticity * pctOther;
}

/**
 * The usual slips when working out an elasticity from two points, so feedback can name the mistake.
 * flipped: % change in price (or income) ÷ % change in quantity.
 * newBase: the new values used as the base of each percentage change.
 * sign: the right size with the wrong sign.
 */
export function slips(x0: number, x1: number, q0: number, q1: number): { flipped: number; newBase: number; sign: number } {
  const right = pctChange(q0, q1) / pctChange(x0, x1);
  return {
    flipped: round2(pctChange(x0, x1) / pctChange(q0, q1)),
    newBase: round2(((q1 - q0) / q1) / ((x1 - x0) / x1)),
    sign: round2(-right),
  };
}

/** A typed answer is right when it is within the tolerance (default: half of the last decimal place shown, plus a little). */
export function closeEnough(typed: number, answer: number, tolerance = 0.011): boolean {
  return Math.abs(typed - answer) <= tolerance;
}

/** Points on an Engel curve: income on the vertical axis, quantity on the horizontal axis (as in IB diagrams). */
export function engelPoints(incomes: number[], qty: number[], upTo: number): { q: number; p: number }[] {
  return incomes.slice(0, upTo + 1).map((y, i) => ({ q: qty[i], p: y }));
}

/** YED for every step along an income schedule. */
export function stepYeds(incomes: number[], qty: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < incomes.length; i++) out.push(yed(incomes[i - 1], incomes[i], qty[i - 1], qty[i]));
  return out;
}

/** The YED class a whole schedule shows, or null when the steps disagree (the content must avoid that). */
export function scheduleKind(incomes: number[], qty: number[]): YedKind | null {
  const kinds = stepYeds(incomes, qty).map(yedKind);
  const first = kinds[0];
  if (first === 'unit') return null;
  return kinds.every((k) => k === first) ? first : null;
}

export const stallWon = (firstRight: number, goal = STALL_GOAL) => firstRight >= goal;
export const labWon = (firstRight: number) => firstRight >= LAB_GOAL;
export const calcWon = (firstRight: number) => firstRight >= CALC_GOAL;

/** A round in the calculator corner (Level 3). */
export interface Calc {
  id: string;
  kind: 'ped' | 'yed' | 'qty';
  hl?: boolean;
  title: string;
  story: string;
  x0?: number; x1?: number; q0?: number; q1?: number;
  xName?: string; qName?: string; money?: boolean;
  /** For 'qty' rounds: the YED and the % change in income. */
  elasticity?: number; pct?: number;
  /** The answer as the content states it (tests check it against the model). */
  answer: number;
  reason?: { prompt: string; options: { text: string; correct?: boolean; feedback: string }[] };
}

export type Cls = PedKind | 'unitary' | YedKind;

/** The answer to a calculator round, worked out from its data (2 decimal places). */
export function calcAnswer(c: Calc): number {
  if (c.kind === 'qty') return round2(qtyChange(c.elasticity!, c.pct!));
  return round2(c.kind === 'ped' ? ped(c.x0!, c.x1!, c.q0!, c.q1!) : yed(c.x0!, c.x1!, c.q0!, c.q1!));
}

/** What the answer means: elastic or inelastic for PED; necessity, luxury or inferior for YED. */
export function calcClass(c: Calc): Cls {
  if (c.kind === 'ped') return pedKind(calcAnswer(c));
  if (c.kind === 'yed') return yedKind(calcAnswer(c)) as Cls;
  return yedKind(c.elasticity!) as Cls;
}
