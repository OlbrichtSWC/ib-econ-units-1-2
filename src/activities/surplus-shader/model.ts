/**
 * The ski hill market behind Surplus Shader (invented numbers).
 * Day passes at Snowcap Ridge: demand runs from $90 at 0 passes to $0 at 900 passes,
 * supply starts on the price axis at $30 and rises $5 for every 100 passes.
 * Equilibrium: 400 passes at $50.
 *
 * This file builds the SHAPES of consumer surplus, producer surplus and welfare loss
 * at any price, and the IB-style working for each. The dollar values themselves
 * come from calc.ts (welfareAtPrice, triangleArea); tests check the shapes match them.
 */
import { equilibrium, Line, priceAt, Pt, quantityAt, shiftLine, triangleArea, welfareAtPrice } from '../../econ/calc';

export const DEMAND: Line = { a: { q: 0, p: 90 }, b: { q: 900, p: 0 } };
export const SUPPLY: Line = { a: { q: 0, p: 30 }, b: { q: 1000, p: 80 } };

/** One shift step: 150 passes. Every shifted market still has a whole-dollar equilibrium. */
export const SHIFT_Q = 150;
export const MAX_SHIFT = 1;

export interface Market {
  demand: Line;
  supply: Line;
}

/** The market after shifting demand and supply by a number of steps (+ = right, - = left). */
export function shiftedMarket(demandSteps: number, supplySteps: number): Market {
  return {
    demand: shiftLine(DEMAND, demandSteps * SHIFT_Q, 0),
    supply: shiftLine(SUPPLY, supplySteps * SHIFT_Q, 0),
  };
}

/** Snap a dragged price to whole dollars and keep it between where supply and demand meet the price axis. */
export function snapPrice(m: Market, p: number, step = 1): number {
  const lo = Math.ceil(priceAt(m.supply, 0) / step) * step;
  const hi = Math.floor(priceAt(m.demand, 0) / step) * step;
  return Math.min(hi, Math.max(lo, Math.round(p / step) * step));
}

export interface Shapes {
  qd: number;
  qs: number;
  /** Quantity traded: the short side of the market. */
  q: number;
  eq: Pt;
  cs: Pt[];
  ps: Pt[];
  /** Empty when the price is the equilibrium price. */
  wl: Pt[];
}

/**
 * The polygons for consumer surplus, producer surplus and welfare loss at a price.
 * Below equilibrium (shortage), quantity traded = Qs: CS is a trapezium, PS a triangle.
 * Above equilibrium (surplus), quantity traded = Qd: CS is a triangle, PS a trapezium.
 * The welfare loss triangle lies between demand and supply from Q traded to Qe.
 */
export function surplusShapes(m: Market, price: number): Shapes {
  const eq = equilibrium(m.demand, m.supply);
  const qd = Math.max(0, quantityAt(m.demand, price));
  const qs = Math.max(0, quantityAt(m.supply, price));
  const q = Math.min(qd, qs);
  const dTop = priceAt(m.demand, 0);
  const sBottom = priceAt(m.supply, 0);
  const dq = priceAt(m.demand, q);
  const sq = priceAt(m.supply, q);
  const cs = q > 0 ? [{ q: 0, p: dTop }, { q, p: dq }, { q, p: price }, { q: 0, p: price }] : [];
  const ps = q > 0 ? [{ q: 0, p: price }, { q, p: price }, { q, p: sq }, { q: 0, p: sBottom }] : [];
  const wl = eq.q - q > 1e-9 ? [{ q, p: dq }, eq, { q, p: sq }] : [];
  return { qd, qs, q, eq, cs, ps, wl };
}

/** Area of a polygon by the shoelace formula (used to test the shapes). */
export function shoelace(points: Pt[]): number {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    s += a.q * b.p - b.q * a.p;
  }
  return Math.abs(s) / 2;
}

/** One piece of IB working: a triangle (½ × base × height) or a rectangle (base × height). */
export interface Piece {
  kind: 'triangle' | 'rectangle';
  base: number;
  /** The two prices whose difference is the height (top first). */
  top: number;
  bottom: number;
  value: number;
}

export interface Working {
  cs: Piece[];
  ps: Piece[];
  wl: Piece[];
}

function tri(base: number, top: number, bottom: number): Piece {
  return { kind: 'triangle', base, top, bottom, value: triangleArea(base, top - bottom) };
}
function rect(base: number, top: number, bottom: number): Piece {
  return { kind: 'rectangle', base, top, bottom, value: base * (top - bottom) };
}

/** The pieces an IB student would add up for each area at this price. Zero-size pieces are left out. */
export function working(m: Market, price: number): Working {
  const s = surplusShapes(m, price);
  const dTop = priceAt(m.demand, 0);
  const sBottom = priceAt(m.supply, 0);
  const dq = priceAt(m.demand, s.q);
  const sq = priceAt(m.supply, s.q);
  const keep = (ps: Piece[]) => ps.filter((p) => Math.abs(p.value) > 1e-9);
  return {
    cs: keep([rect(s.q, dq, price), tri(s.q, dTop, dq)]),
    ps: keep([rect(s.q, price, sq), tri(s.q, sq, sBottom)]),
    wl: keep([tri(s.eq.q - s.q, dq, sq)]),
  };
}

export const sumPieces = (pieces: Piece[]) => pieces.reduce((t, p) => t + p.value, 0);

// ---------- HL "Calculate it" cards ----------

export type Ask = 'cs' | 'ps' | 'wl';

export function correctValue(m: Market, price: number, ask: Ask): number {
  const w = welfareAtPrice(m.demand, m.supply, price);
  return ask === 'cs' ? w.consumerSurplus : ask === 'ps' ? w.producerSurplus : w.welfareLoss;
}

/** Common slips, each with the wrong value it gives. The first match wins. */
export function slips(m: Market, price: number, ask: Ask): { id: string; value: number }[] {
  const s = surplusShapes(m, price);
  const w = working(m, price);
  const dTop = priceAt(m.demand, 0);
  const sBottom = priceAt(m.supply, 0);
  const qLong = Math.max(s.qd, s.qs);
  const out: { id: string; value: number }[] = [];
  if (ask === 'wl') {
    const dq = priceAt(m.demand, s.q), sq = priceAt(m.supply, s.q);
    const base = s.eq.q - s.q;
    out.push({ id: 'noHalf', value: base * (dq - sq) });
    out.push({ id: 'heightToPe', value: triangleArea(base, Math.abs(price - s.eq.p)) });
    out.push({ id: 'heightOther', value: triangleArea(base, price > s.eq.p ? s.eq.p - sq : dq - s.eq.p) });
    out.push({ id: 'wrongBase', value: triangleArea(s.q, dq - sq) });
    return out;
  }
  const pieces = ask === 'cs' ? w.cs : w.ps;
  const triangle = pieces.find((p) => p.kind === 'triangle');
  const rectangle = pieces.find((p) => p.kind === 'rectangle');
  const outer = ask === 'cs' ? dTop - price : price - sBottom;
  out.push({ id: 'noHalf', value: (rectangle?.value ?? 0) + 2 * (triangle?.value ?? 0) });
  if (rectangle) {
    out.push({ id: 'oneTriangle', value: triangleArea(s.q, outer) });
    out.push({ id: 'rectOnly', value: rectangle.value });
    out.push({ id: 'triOnly', value: triangle?.value ?? 0 });
  }
  out.push({ id: 'heightFromZero', value: triangleArea(s.q, ask === 'cs' ? dTop : price) });
  out.push({ id: 'equilibrium', value: correctValue(m, s.eq.p, ask) });
  out.push({ id: 'longSide', value: triangleArea(qLong, outer) });
  return out;
}

export type CheckResult = { ok: true } | { ok: false; slip: string | null };

/** Checks a typed answer. Within $1 counts as right (students may round). */
export function checkAnswer(m: Market, price: number, ask: Ask, value: number, tol = 1): CheckResult {
  const right = correctValue(m, price, ask);
  if (Math.abs(value - right) <= tol) return { ok: true };
  const slip = slips(m, price, ask).find((s) => Math.abs(s.value - right) > tol && Math.abs(s.value - value) <= tol);
  return { ok: false, slip: slip ? slip.id : null };
}
