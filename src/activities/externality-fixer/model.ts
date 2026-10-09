/**
 * Smoke and Sunshine (2.8): the rules behind the game, kept apart from the screen so they can be tested.
 *
 * Every market is drawn with straight lines through two points (no equations on screen):
 *   mpb    the demand curve, marginal private benefit
 *   mpc    the supply curve, marginal private cost
 *   social the curve that the externality pulls away from the private one:
 *          MSC for a production externality, MSB for a consumption externality.
 */
import { intersect, priceAt, quantityAt, shiftLine, triangleArea } from '../../econ/calc';
import type { Line, Pt } from '../../econ/calc';

/** The four kinds of externality in the IB guide. */
export type Ext = 'neg-prod' | 'neg-cons' | 'pos-prod' | 'pos-cons';
export const EXTS: Ext[] = ['neg-prod', 'neg-cons', 'pos-prod', 'pos-cons'];

/** Where the social curve sits compared with the private one. */
export type Gap = 'msc-above' | 'msc-below' | 'msb-below' | 'msb-above';
export const GAPS: Gap[] = ['msc-above', 'msc-below', 'msb-below', 'msb-above'];

/** The diagram gap that goes with each externality. */
export function gapFor(ext: Ext): Gap {
  return ({ 'neg-prod': 'msc-above', 'pos-prod': 'msc-below', 'neg-cons': 'msb-below', 'pos-cons': 'msb-above' } as const)[ext];
}

export const isProduction = (ext: Ext) => ext === 'neg-prod' || ext === 'pos-prod';
export const isNegative = (ext: Ext) => ext === 'neg-prod' || ext === 'neg-cons';

/** The policies a student can choose in level 2. */
export type Tool = 'tax' | 'subsidy' | 'regulation' | 'permits' | 'awareness' | 'provision';
export const TOOLS: Tool[] = ['tax', 'subsidy', 'regulation', 'permits', 'awareness', 'provision'];

/** The places in the town picture. Each one shows one market. */
export type Spot = 'factory' | 'bees' | 'party' | 'clinic' | 'kiosk' | 'school';
export const SPOTS: Spot[] = ['factory', 'bees', 'party', 'clinic', 'kiosk', 'school'];

export interface Market {
  ext: Ext;
  mpb: Line;
  mpc: Line;
  social: Line;
}

/** Marginal social benefit: the demand curve itself for a production externality. */
export const msbLine = (m: Market): Line => (isProduction(m.ext) ? m.mpb : m.social);
/** Marginal social cost: the supply curve itself for a consumption externality. */
export const mscLine = (m: Market): Line => (isProduction(m.ext) ? m.social : m.mpc);
/** The private curve that the social curve is compared with. */
export const privateLine = (m: Market): Line => (isProduction(m.ext) ? m.mpc : m.mpb);

function cross(a: Line, b: Line): Pt {
  const e = intersect(a, b);
  if (!e) throw new RangeError('The curves are parallel.');
  return e;
}

/** The free market outcome: MPB = MPC. */
export function marketPoint(m: Market): Pt {
  return cross(m.mpb, m.mpc);
}

/** The social optimum: MSB = MSC. */
export function optimum(m: Market): Pt {
  return cross(msbLine(m), mscLine(m));
}

/** The external cost or benefit of one more unit at quantity q (the vertical gap). */
export function gapAt(m: Market, q: number): number {
  return Math.abs(priceAt(m.social, q) - priceAt(privateLine(m), q));
}

/**
 * The welfare loss when the market trades q units instead of Q*: the triangle between
 * MSB and MSC from q to Q*. Works for too much and too little output.
 */
export function lossTriangle(m: Market, q: number): Pt[] {
  const o = optimum(m);
  return [o, { q, p: priceAt(msbLine(m), q) }, { q, p: priceAt(mscLine(m), q) }];
}

/** Welfare loss at quantity q: 1/2 x base x height, base = |q - Q*|, height = MSB - MSC gap at q. */
export function lossAt(m: Market, q: number): number {
  const o = optimum(m);
  const height = Math.abs(priceAt(msbLine(m), q) - priceAt(mscLine(m), q));
  return triangleArea(Math.abs(q - o.q), height);
}

/** Welfare loss of the free market (HL calculation). */
export function welfareLoss(m: Market): number {
  return lossAt(m, marketPoint(m).q);
}

/** Common slips in the welfare loss calculation, used for feedback. */
export function lossMistakes(m: Market): { kind: 'noHalf' | 'gapAtOptimum' | 'usedQm' | 'priceBase'; value: number }[] {
  const e = marketPoint(m), o = optimum(m);
  const base = Math.abs(e.q - o.q);
  const height = gapAt(m, e.q);
  const out = [
    { kind: 'noHalf' as const, value: base * height },
    { kind: 'gapAtOptimum' as const, value: triangleArea(base, gapAt(m, o.q)) },
    { kind: 'usedQm' as const, value: triangleArea(e.q, height) },
    { kind: 'priceBase' as const, value: triangleArea(base, Math.abs(o.p - e.p)) },
  ];
  const right = welfareLoss(m);
  // Leave out a slip that gives the right answer by chance, and keep only the first of equal values.
  return out.filter((x, i) => Math.abs(x.value - right) > 1e-6 && out.findIndex((y) => Math.abs(y.value - x.value) < 1e-6) === i);
}

/** Does the tool work in the right direction for this externality? Taxes and caps cut output; the others raise it. */
export function toolFits(ext: Ext, tool: Tool): boolean {
  const cuts = tool === 'tax' || tool === 'regulation' || tool === 'permits';
  const raises = tool === 'subsidy' || tool === 'provision';
  if (tool === 'awareness') return true; // a campaign can warn people (demerit) or tell them of benefits (merit)
  return isNegative(ext) ? cuts : raises;
}

/**
 * The policy size that moves output to Q*.
 * Tax, subsidy and campaign: the gap between MPB and MPC at Q* (the external cost or benefit at the optimum).
 * Regulation and permits: a limit of Q* units.
 * Provision: how far supply must shift right so that it meets MPB at Q*.
 */
export function rightSize(m: Market, tool: Tool): number {
  const o = optimum(m);
  switch (tool) {
    case 'tax':
    case 'subsidy':
    case 'awareness':
      return Math.abs(priceAt(m.mpb, o.q) - priceAt(m.mpc, o.q));
    case 'regulation':
    case 'permits':
      return o.q;
    case 'provision':
      return o.q - quantityAt(m.mpc, priceAt(m.mpb, o.q));
  }
}

/** The curve the policy moves, after the policy. Null for a quantity limit. */
export function shiftedCurve(m: Market, tool: Tool, size: number): { which: 'mpb' | 'mpc'; line: Line } | null {
  switch (tool) {
    case 'tax':
      return { which: 'mpc', line: shiftLine(m.mpc, 0, size) };
    case 'subsidy':
      return { which: 'mpc', line: shiftLine(m.mpc, 0, -size) };
    case 'provision':
      return { which: 'mpc', line: shiftLine(m.mpc, size, 0) };
    case 'awareness':
      return { which: 'mpb', line: shiftLine(m.mpb, 0, isNegative(m.ext) ? -size : size) };
    default:
      return null;
  }
}

/** Output after the policy. */
export function outcome(m: Market, tool: Tool, size: number): Pt {
  const e = marketPoint(m);
  if (tool === 'regulation' || tool === 'permits') {
    const q = Math.max(0, Math.min(e.q, size));
    return { q, p: priceAt(m.mpb, q) };
  }
  const s = shiftedCurve(m, tool, size)!;
  const pt = s.which === 'mpc' ? cross(m.mpb, s.line) : cross(s.line, m.mpc);
  return pt.q < 0 ? { q: 0, p: priceAt(s.which === 'mpb' ? s.line : m.mpb, 0) } : pt;
}

/** How close output is to Q*: 0 at the free market quantity (or further away), 1 at Q*. Drives the town picture. */
export function closeness(m: Market, q: number): number {
  const e = marketPoint(m), o = optimum(m);
  const span = Math.abs(e.q - o.q);
  if (span < 1e-9) return 1;
  return Math.max(0, Math.min(1, 1 - Math.abs(q - o.q) / span));
}

/** Is the chosen size right? It must match to within half a slider step. */
export function sizeRight(m: Market, tool: Tool, size: number, step: number): boolean {
  return Math.abs(size - rightSize(m, tool)) < step / 2 + 1e-9;
}

/** Too little or too much policy, judged by where output ends up. */
export function sizeVerdict(m: Market, tool: Tool, size: number, step: number): 'right' | 'small' | 'big' {
  if (sizeRight(m, tool, size, step)) return 'right';
  return size < rightSize(m, tool) ? 'small' : 'big';
}

/** Check a typed number, allowing a small rounding slip. */
export function numberRight(typed: number, answer: number, tol = 0.01): boolean {
  return Number.isFinite(typed) && Math.abs(typed - answer) <= tol + 1e-9;
}

/** Read a typed number: accepts "45", "$45", "45.0" and "1,200". NaN if it is not a number. */
export function parseNumber(text: string): number {
  const t = text.replace(/[$,\s]/g, '');
  if (!/^-?\d*\.?\d+$/.test(t)) return NaN;
  return Number(t);
}

/** The share of the town that is fixed, for the sun. */
export function sunshine(fix: Partial<Record<Spot, number>>): number {
  return SPOTS.reduce((s, k) => s + (fix[k] ?? 0), 0) / SPOTS.length;
}

/** Level 1: scenarios with both steps right first time. */
export const SPOT_GOAL = 8;
/** Level 2: markets fixed with the right policy and size first time. */
export const FIX_GOAL = 5;
/** Level 3: first-try points (calculation, strength, limitation in each round). */
export const JUDGE_GOAL = 15;
export const POINTS_PER_JUDGE_ROUND = 3;

export const spotWon = (firstRight: number, goal = SPOT_GOAL) => firstRight >= goal;
export const fixWon = (firstRight: number) => firstRight >= FIX_GOAL;
export const judgeWon = (points: number) => points >= JUDGE_GOAL;
