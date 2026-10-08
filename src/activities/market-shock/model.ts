/**
 * The market behind Market Shock Simulator (invented numbers).
 * Riverton's market for bags of roasted coffee beans. Every card starts from the same
 * market (ceteris paribus): demand and supply cross at $5 and 50 bags.
 *
 * This file decides which curve and direction is right for a card, checks the student's
 * prediction and drag, and works out the new equilibrium and the gap at the old price.
 */
import { equilibrium, Line, Pt, priceAt, quantityAt, shiftLine } from '../../econ/calc';

export type Side = 'demand' | 'supply';
export type Dir = 'left' | 'right';
export type Shift = 'D-left' | 'D-right' | 'S-left' | 'S-right';
/** 'none' = no shift: a movement along a curve. */
export type Answer = Shift | 'none';
export type Change = 'rises' | 'falls' | 'no change';
export type Mechanism = 'signalling' | 'incentive' | 'rationing';

export const X_MAX = 120;
export const Y_MAX = 10;
/** Demand: $9 at 10 bags down to $1 at 90 bags. */
export const BASE_D: Line = { a: { q: 10, p: 9 }, b: { q: 90, p: 1 } };
/** Supply: $1 at 10 bags up to $9 at 90 bags. */
export const BASE_S: Line = { a: { q: 10, p: 1 }, b: { q: 90, p: 9 } };
/** Every correct shift is shown as a move of this many bags at every price. */
export const SHIFT_SIZE = 20;
/** Level 2 shift sizes (bags at every price), so the new equilibrium changes from card to card. */
export const LEVEL2_SIZES = [12, 20, 28];
export function shiftSizeFor(n: number): number {
  return LEVEL2_SIZES[((n % LEVEL2_SIZES.length) + LEVEL2_SIZES.length) % LEVEL2_SIZES.length];
}
/** A drag smaller than this (in bags) does not count as a shift yet. */
export const MIN_DRAG = 6;
/** Largest drag allowed either way. */
export const MAX_DRAG = 30;
/** The price where the ring handle sits on each curve. */
export const HANDLE_P = 8;

export function parseShift(s: Shift): { side: Side; dir: Dir } {
  return { side: s[0] === 'D' ? 'demand' : 'supply', dir: s.endsWith('left') ? 'left' : 'right' };
}

export function toShift(side: Side, dir: Dir): Shift {
  return `${side === 'demand' ? 'D' : 'S'}-${dir}` as Shift;
}

export type PredictionResult =
  | 'right'
  /** Right curve, wrong direction. */
  | 'wrong-direction'
  /** The other curve shifts. */
  | 'wrong-curve'
  /** Said "no shift", but a curve does shift. */
  | 'missed-shift'
  /** Said a curve shifts, but it is only a movement along a curve. */
  | 'movement-not-shift';

/** Compares the student's prediction with the card's answer. */
export function checkPrediction(pred: Answer, correct: Answer): PredictionResult {
  if (pred === correct) return 'right';
  if (correct === 'none') return 'movement-not-shift';
  if (pred === 'none') return 'missed-shift';
  return parseShift(pred).side === parseShift(correct).side ? 'wrong-direction' : 'wrong-curve';
}

/** The direction of a drag of dq bags, or null if it is too small to count. */
export function dragDirection(dq: number, min = MIN_DRAG): Dir | null {
  if (Math.abs(dq) < min) return null;
  return dq > 0 ? 'right' : 'left';
}

/** Keeps a dragged amount on a 2-bag grid and inside the allowed range. */
export function snapDrag(dq: number): number {
  const c = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dq));
  return Math.round(c / 2) * 2 || 0;
}

/** The demand and supply curves after one curve moves dq bags (right is positive). */
export function shiftedMarket(side: Side, dq: number, demand = BASE_D, supply = BASE_S): { demand: Line; supply: Line } {
  return side === 'demand' ? { demand: shiftLine(demand, dq, 0), supply } : { demand, supply: shiftLine(supply, dq, 0) };
}

function change(a: number, b: number): Change {
  if (Math.abs(b - a) < 1e-9) return 'no change';
  return b > a ? 'rises' : 'falls';
}

export interface Outcome {
  e1: Pt;
  e2: Pt;
  price: Change;
  quantity: Change;
}

/** Old and new equilibrium, and which way price and quantity move. */
export function marketOutcome(d1: Line, s1: Line, d2: Line, s2: Line): Outcome {
  const e1 = equilibrium(d1, s1);
  const e2 = equilibrium(d2, s2);
  return { e1, e2, price: change(e1.p, e2.p), quantity: change(e1.q, e2.q) };
}

/** What theory predicts for one shift, with normal sloping curves. */
export function expectedOutcome(s: Shift): { price: Change; quantity: Change } {
  const { side, dir } = parseShift(s);
  const qty: Change = dir === 'right' ? 'rises' : 'falls';
  if (side === 'demand') return { price: qty, quantity: qty };
  return { price: dir === 'right' ? 'falls' : 'rises', quantity: qty };
}

export interface Gap {
  qd: number;
  qs: number;
  /** Shortage = excess demand; surplus = excess supply. */
  kind: 'shortage' | 'surplus' | 'none';
  size: number;
}

/** Quantity demanded and supplied at a price, and the shortage or surplus between them. */
export function gapAtPrice(demand: Line, supply: Line, price: number): Gap {
  const qd = quantityAt(demand, price);
  const qs = quantityAt(supply, price);
  const diff = qd - qs;
  const kind = Math.abs(diff) < 1e-9 ? 'none' : diff > 0 ? 'shortage' : 'surplus';
  return { qd, qs, kind, size: Math.abs(diff) };
}

/**
 * The part of a curve to draw: from price `lo` to price `hi`, cut off at the price axis
 * (q = 0) and at the right edge of the diagram so labels stay inside.
 */
export function segment(line: Line, lo = 1, hi = 9, xMax = X_MAX): [Pt, Pt] {
  const ends = [lo, hi].map((p) => {
    const q = quantityAt(line, p);
    if (q < 0) return { q: 0, p: priceAt(line, 0) };
    if (q > xMax) return { q: xMax, p: priceAt(line, xMax) };
    return { q, p };
  });
  return ends[0].q <= ends[1].q ? [ends[0], ends[1]] : [ends[1], ends[0]];
}

/** The price shown at step t (0 to 1) as the market moves from the old to the new equilibrium. */
export function priceStep(p1: number, p2: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  // Ease out: fast at first, slowing as the gap closes.
  return p1 + (p2 - p1) * (1 - (1 - k) ** 2);
}

/**
 * The order cards are dealt in. Normal mode: shift cards only.
 * Trap mode: a trap card, then a shift card, and so on, so "no shift" is not always the answer.
 * `seed` rotates the deck so a replay starts somewhere new.
 */
export function buildDeck(shiftIds: string[], trapIds: string[], trapMode: boolean, seed = 0): string[] {
  const rot = <T,>(a: T[], k: number) => (a.length ? [...a.slice(k % a.length), ...a.slice(0, k % a.length)] : a);
  const s = rot(shiftIds, seed);
  if (!trapMode) return s;
  const t = rot(trapIds, seed);
  const out: string[] = [];
  for (let i = 0; i < Math.max(s.length, t.length); i++) {
    if (i < t.length) out.push(t[i]);
    if (i < s.length) out.push(s[i]);
  }
  return out;
}

/** "Price rises and quantity falls" style summary in words. */
export function outcomeWords(o: { price: Change; quantity: Change }): string {
  const w = (c: Change) => (c === 'no change' ? 'does not change' : c);
  return `Equilibrium price ${w(o.price)} and equilibrium quantity ${w(o.quantity)}.`;
}

/** Level 3: what can be said about price or quantity when both curves shift. */
export type DoubleChange = 'rises' | 'falls' | 'cannot tell';

/**
 * Theory for two shifts at once. When demand and supply push price (or quantity) the same way,
 * the direction is certain. When they push it opposite ways, the direction depends on which
 * shift is bigger, so it cannot be told from the events alone.
 */
export function doubleOutcome(d: Dir, s: Dir): { price: DoubleChange; quantity: DoubleChange } {
  const dSign = d === 'right' ? 1 : -1;
  const sSign = s === 'right' ? 1 : -1;
  // Demand right raises price and quantity. Supply right lowers price and raises quantity.
  const price = dSign - sSign;
  const quantity = dSign + sSign;
  const word = (v: number): DoubleChange => (v > 0 ? 'rises' : v < 0 ? 'falls' : 'cannot tell');
  return { price: word(price), quantity: word(quantity) };
}

/** Both curves shifted at once, by dD and dS bags (right is positive). */
export function doubleMarket(dD: number, dS: number): { demand: Line; supply: Line } {
  return { demand: shiftLine(BASE_D, dD, 0), supply: shiftLine(BASE_S, dS, 0) };
}

/** Level 3 deck: each card pairs one demand event with one supply event. `seed` changes the pairs. */
export function buildPairs(demandIds: string[], supplyIds: string[], seed = 0): [string, string][] {
  const out: [string, string][] = [];
  const n = Math.max(demandIds.length, supplyIds.length);
  for (let i = 0; i < n; i++) {
    out.push([demandIds[(i + seed) % demandIds.length], supplyIds[(i * 3 + seed * 2) % supplyIds.length]]);
  }
  return out;
}
