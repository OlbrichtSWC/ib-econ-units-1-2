/**
 * The bike rental market behind "Same Slope, Different PED" (invented numbers).
 * One straight-line demand curve: at $20 a day nobody rents, and every $1 cut in the
 * daily price adds 10 rentals, up to 200 rentals at a price of $0.
 * The slope never changes, but PED does, because P / Q changes along the line.
 */
import { classifyPed, Line, ped, pedAtPoint, percentChange, Pt, quantityAt, round, totalRevenue } from '../../econ/calc';

export const DEMAND: Line = { a: { q: 0, p: 20 }, b: { q: 200, p: 0 } };
export const P_MIN = 1;
export const P_MAX = 19;
export const P_STEP = 0.5;
/** Price and quantity at the midpoint of the line, where |PED| = 1 and TR is greatest. */
export const MID: Pt = { q: 100, p: 10 };

export type Zone = 'elastic' | 'unitary' | 'inelastic';

/** Keeps a price on the playable part of the line and snaps it to the nearest $0.50. */
export function snapPrice(p: number): number {
  const s = Math.round(p / P_STEP) * P_STEP;
  return Math.min(P_MAX, Math.max(P_MIN, s));
}

/**
 * Turns a dragged point into a price on the demand line: the nearest point on the line,
 * measured in the diagram's own scale (quantity 0 to 200 across, price 0 to 20 up).
 */
export function priceFromDrag(pt: Pt, line: Line = DEMAND): number {
  const pInt = line.a.p; // price where Q = 0
  const qInt = line.b.q; // quantity where P = 0
  const u = pt.q / qInt;
  const v = pt.p / pInt;
  const t = (u - v + 1) / 2; // share of the way down the line
  return snapPrice(pInt * (1 - t));
}

/** Which part of the straight-line demand curve a price is on. */
export function zoneAt(p: number, line: Line = DEMAND): Zone {
  const t = classifyPed(pedAtPoint(line, p));
  if (t === 'unitary') return 'unitary';
  return t === 'inelastic' || t === 'perfectly inelastic' ? 'inelastic' : 'elastic';
}

/** Points of the total revenue curve (q across, TR up), for drawing under the demand diagram. */
export function trCurve(line: Line = DEMAND, n = 40): Pt[] {
  const qMax = quantityAt(line, 0);
  return Array.from({ length: n + 1 }, (_, i) => {
    const q = (qMax * i) / n;
    const p = line.a.p + ((line.b.p - line.a.p) * (q - line.a.q)) / (line.b.q - line.a.q);
    return { q, p: totalRevenue(p, q) };
  });
}

/**
 * "Check with the IB formula": PED for a $1 price change that starts at price p.
 * A $1 cut is used, unless the price is below $2 (then a $1 rise is used).
 */
export function ibCheck(p: number, line: Line = DEMAND) {
  const p2 = p >= 2 ? p - 1 : p + 1;
  const q1 = quantityAt(line, p);
  const q2 = quantityAt(line, p2);
  return {
    p1: p,
    q1,
    p2,
    q2,
    pctP: percentChange(p, p2),
    pctQ: percentChange(q1, q2),
    ped: ped(p, q1, p2, q2),
  };
}

/** Points on a unitary PED demand curve (a rectangular hyperbola): P x Q = spending at every point. */
export function unitaryCurve(spending: number, qMin: number, qMax: number, n = 30): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const q = qMin + ((qMax - qMin) * i) / n;
    return { q, p: spending / q };
  });
}

/** Demand schedule rows every $2 from $18 down to $2: price, quantity, total revenue. */
export function schedule(line: Line = DEMAND): { p: number; q: number; tr: number }[] {
  const rows = [];
  for (let p = 18; p >= 2; p -= 2) {
    const q = round(quantityAt(line, p), 2);
    rows.push({ p, q, tr: round(totalRevenue(p, q), 2) });
  }
  return rows;
}

export type ChallengeId = 'unitary' | 'cut-raises' | 'cut-lowers' | 'tr-max';

/**
 * Which challenges a move from price `from` to price `to` completes.
 * `seenAbove` / `seenBelow`: the student has already been at a price above / below the midpoint.
 */
export function challengesForMove(from: number, to: number, seenAbove: boolean, seenBelow: boolean, line: Line = DEMAND): ChallengeId[] {
  const out: ChallengeId[] = [];
  const tr1 = totalRevenue(from, quantityAt(line, from));
  const tr2 = totalRevenue(to, quantityAt(line, to));
  if (to < from && tr2 > tr1 + 1e-9) out.push('cut-raises');
  if (to < from && tr2 < tr1 - 1e-9) out.push('cut-lowers');
  if (zoneAt(to, line) === 'unitary') {
    out.push('unitary');
    if (seenAbove && seenBelow) out.push('tr-max');
  }
  return out;
}

// ---------- Mystery mode: find the hidden point ----------

export type MysteryRule =
  | { type: 'ped'; value: number }
  | { type: 'tr'; value: number; zone: 'elastic' | 'inelastic' }
  | { type: 'trmax' };

/** The demand curve a mystery level is played on, and the prices the point can move between. */
export interface MysteryCurve {
  line: Line;
  pMin: number;
  pMax: number;
}

export const MAIN_CURVE: MysteryCurve = { line: DEMAND, pMin: P_MIN, pMax: P_MAX };
/**
 * Level 3: Snowline Skates (invented). Nobody rents at $16 a day, and every $1 cut adds 15 rentals,
 * up to 240 rentals at $0.
 */
export const SKATE_CURVE: MysteryCurve = { line: { a: { q: 0, p: 16 }, b: { q: 240, p: 0 } }, pMin: 1, pMax: 15 };

/** Snaps a price to $0.50 and keeps it on the curve's playable part. */
export function snapOn(curve: MysteryCurve, p: number): number {
  const s = Math.round(p / P_STEP) * P_STEP;
  return Math.min(curve.pMax, Math.max(curve.pMin, s));
}

/** Every playable price ($0.50 steps) where the rule is true. A good clue has exactly one. */
export function mysteryAnswers(rule: MysteryRule, curve: MysteryCurve = MAIN_CURVE): number[] {
  const out: number[] = [];
  for (let p = curve.pMin; p <= curve.pMax + 1e-9; p += P_STEP) {
    if (mysteryHolds(rule, p, curve.line)) out.push(round(p, 2));
  }
  return out;
}

export function mysteryHolds(rule: MysteryRule, p: number, line: Line = DEMAND): boolean {
  const q = quantityAt(line, p);
  if (rule.type === 'ped') return Math.abs(ibCheck(p, line).ped - rule.value) < 1e-6;
  if (rule.type === 'tr') return Math.abs(totalRevenue(p, q) - rule.value) < 1e-6 && zoneAt(p, line) === rule.zone;
  return zoneAt(p, line) === 'unitary';
}

/** Which way to move after a wrong guess: towards a higher or a lower price. */
export function mysteryDirection(rule: MysteryRule, guess: number, curve: MysteryCurve = MAIN_CURVE): 'higher' | 'lower' | null {
  const answers = mysteryAnswers(rule, curve);
  if (!answers.length || answers.includes(round(guess, 2))) return null;
  return answers[0] > guess ? 'higher' : 'lower';
}

/** What the student must work out at a wrong guess before they get a direction: PED clues ask for PED, the others for TR. */
export function mysteryAsk(rule: MysteryRule): 'ped' | 'tr' {
  return rule.type === 'ped' ? 'ped' : 'tr';
}

/** The true value of what mysteryAsk asks for, at price p. */
export function mysteryValue(rule: MysteryRule, p: number, line: Line = DEMAND): number {
  return mysteryAsk(rule) === 'ped' ? ibCheck(p, line).ped : totalRevenue(p, quantityAt(line, p));
}

/**
 * Checks the value the student worked out. PED: either sign, within 0.02 (two decimal places).
 * TR: within 50 cents.
 */
export function mysteryTypedRight(rule: MysteryRule, p: number, typed: number, line: Line = DEMAND): boolean {
  if (!Number.isFinite(typed)) return false;
  const v = mysteryValue(rule, p, line);
  return mysteryAsk(rule) === 'ped' ? Math.abs(Math.abs(typed) - Math.abs(v)) <= 0.02 + 1e-9 : Math.abs(typed - v) <= 0.5 + 1e-9;
}
