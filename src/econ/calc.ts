/**
 * Every economic calculation the app makes lives in this file, so each one
 * has an automated test (tests/calc.test.ts).
 *
 * Formulas follow the IB Economics guide (first assessment 2024):
 *   percentage change = (new - original) / original x 100
 *   PED = %change in quantity demanded / %change in price
 *   YED = %change in quantity demanded / %change in income
 *   PES = %change in quantity supplied / %change in price
 *
 * Curves are straight lines drawn through two points on a diagram
 * (or rows of a schedule). Students never see an equation.
 */

/** A point on a price-quantity diagram. */
export interface Pt {
  q: number;
  p: number;
}

/** A straight demand or supply curve, defined by two points on it. */
export interface Line {
  a: Pt;
  b: Pt;
}

const EPS = 1e-9;

// ---------- Percentage change and elasticities ----------

/** Percentage change from an original value to a new value. */
export function percentChange(original: number, next: number): number {
  if (original === 0) throw new RangeError('Percentage change is undefined when the original value is 0.');
  return ((next - original) / original) * 100;
}

/** Elasticity = %change in quantity / %change in the cause (price or income). */
export function elasticity(pctQuantity: number, pctCause: number): number {
  if (pctCause === 0) throw new RangeError('Elasticity is undefined when the cause does not change.');
  return pctQuantity / pctCause;
}

/** PED between two price-quantity pairs. The sign is kept (normally negative). */
export function ped(p1: number, q1: number, p2: number, q2: number): number {
  return elasticity(percentChange(q1, q2), percentChange(p1, p2));
}

/** YED between two income-quantity pairs. Positive = normal good, negative = inferior good. */
export function yed(y1: number, q1: number, y2: number, q2: number): number {
  return elasticity(percentChange(q1, q2), percentChange(y1, y2));
}

/** PES between two price-quantity-supplied pairs. */
export function pes(p1: number, q1: number, p2: number, q2: number): number {
  return elasticity(percentChange(q1, q2), percentChange(p1, p2));
}

export type PedType = 'perfectly inelastic' | 'inelastic' | 'unitary' | 'elastic' | 'perfectly elastic';

/** Classify PED by its absolute value. `tol` treats values this close to 1 as unitary. */
export function classifyPed(value: number, tol = 0.005): PedType {
  const v = Math.abs(value);
  if (!Number.isFinite(v)) return 'perfectly elastic';
  if (v < EPS) return 'perfectly inelastic';
  if (Math.abs(v - 1) <= tol) return 'unitary';
  return v < 1 ? 'inelastic' : 'elastic';
}

export type YedType = 'inferior' | 'normal, income inelastic (necessity)' | 'normal, income elastic (luxury)' | 'unitary income elastic';

export function classifyYed(value: number, tol = 0.005): YedType {
  if (value < 0) return 'inferior';
  if (Math.abs(value - 1) <= tol) return 'unitary income elastic';
  return value < 1 ? 'normal, income inelastic (necessity)' : 'normal, income elastic (luxury)';
}

/** Rearranged PED: the % change in quantity that follows a % change in price. */
export function pctQuantityFromPed(pedValue: number, pctPrice: number): number {
  return pedValue * pctPrice;
}

// ---------- Revenue ----------

export function totalRevenue(p: number, q: number): number {
  return p * q;
}

/**
 * Splits a change in total revenue into two rectangles on the demand diagram that never overlap.
 * priceEffect ("price pull"): the price change on the units sold at both prices.
 * quantityEffect ("quantity pull"): units gained or lost, valued at the lower price.
 * For a price rise: (P2 - P1) x Q2 and P1 x (Q2 - Q1). For a price cut: (P2 - P1) x Q1 and P2 x (Q2 - Q1).
 * priceEffect + quantityEffect = TR2 - TR1 exactly.
 */
export function revenueChange(p1: number, q1: number, p2: number, q2: number) {
  const rise = p2 >= p1;
  const priceEffect = (p2 - p1) * (rise ? q2 : q1);
  const quantityEffect = (rise ? p1 : p2) * (q2 - q1);
  return {
    tr1: p1 * q1,
    tr2: p2 * q2,
    change: p2 * q2 - p1 * q1,
    priceEffect,
    quantityEffect,
  };
}

// ---------- Straight-line curves ----------

/** Price on the line at quantity q. */
export function priceAt(line: Line, q: number): number {
  const { a, b } = line;
  if (Math.abs(b.q - a.q) < EPS) throw new RangeError('A vertical line has no single price at each quantity.');
  return a.p + ((b.p - a.p) * (q - a.q)) / (b.q - a.q);
}

/** Quantity on the line at price p. */
export function quantityAt(line: Line, p: number): number {
  const { a, b } = line;
  if (Math.abs(b.p - a.p) < EPS) throw new RangeError('A horizontal line has no single quantity at each price.');
  return a.q + ((b.q - a.q) * (p - a.p)) / (b.p - a.p);
}

/** Where the line meets the price axis (Q = 0). */
export function priceIntercept(line: Line): number {
  return priceAt(line, 0);
}

/** Moves a whole line by dq to the right and dp up. */
export function shiftLine(line: Line, dq: number, dp: number): Line {
  return {
    a: { q: line.a.q + dq, p: line.a.p + dp },
    b: { q: line.b.q + dq, p: line.b.p + dp },
  };
}

/** Where two lines cross, or null if they are parallel. */
export function intersect(l1: Line, l2: Line): Pt | null {
  const x1 = l1.a.q, y1 = l1.a.p, x2 = l1.b.q, y2 = l1.b.p;
  const x3 = l2.a.q, y3 = l2.a.p, x4 = l2.b.q, y4 = l2.b.p;
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < EPS) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  return { q: x1 + t * (x2 - x1), p: y1 + t * (y2 - y1) };
}

/** Market equilibrium where demand meets supply. */
export function equilibrium(demand: Line, supply: Line): Pt {
  const e = intersect(demand, supply);
  if (!e) throw new RangeError('Demand and supply are parallel, so there is no equilibrium.');
  return e;
}

/** Area under a straight line between quantities q0 and q1. */
function areaUnder(line: Line, q0: number, q1: number): number {
  return ((priceAt(line, q0) + priceAt(line, q1)) / 2) * (q1 - q0);
}

/**
 * PED at a point on a straight-line demand curve (HL 2.5).
 * For a straight line, the IB percentage-change formula gives this same value
 * for any price change that starts at this point.
 */
export function pedAtPoint(demand: Line, p: number): number {
  const q = quantityAt(demand, p);
  if (q <= EPS) return -Infinity;
  const slopeQperP = (demand.b.q - demand.a.q) / (demand.b.p - demand.a.p);
  return slopeQperP * (p / q);
}

// ---------- Surplus and welfare (2.3) ----------

export interface Welfare {
  /** Quantity bought and sold at this price. */
  quantity: number;
  consumerSurplus: number;
  producerSurplus: number;
  communitySurplus: number;
  /** Community surplus lost compared with the competitive equilibrium. */
  welfareLoss: number;
  /** Positive: excess demand (shortage). Negative: excess supply (surplus). */
  excessDemand: number;
}

/**
 * Surplus at any price, using the short side of the market: the quantity traded is the
 * smaller of quantity demanded and quantity supplied. At the equilibrium price this gives
 * the maximum community surplus and zero welfare loss.
 */
export function welfareAtPrice(demand: Line, supply: Line, price: number): Welfare {
  const e = equilibrium(demand, supply);
  const qd = Math.max(0, quantityAt(demand, price));
  const qs = Math.max(0, quantityAt(supply, price));
  const q = Math.min(qd, qs);
  // Consumer surplus: area under demand and above the price, from 0 to q.
  const cs = areaUnder(demand, 0, q) - price * q;
  // Producer surplus: area above supply and below the price, from 0 to q.
  // Supply drawn to start on the price axis; below its intercept no units are supplied.
  const ps = price * q - areaUnder(supply, 0, q);
  const maxCommunity = areaUnder(demand, 0, e.q) - areaUnder(supply, 0, e.q);
  const community = cs + ps;
  return {
    quantity: q,
    consumerSurplus: cs,
    producerSurplus: ps,
    communitySurplus: community,
    welfareLoss: Math.max(0, maxCommunity - community),
    excessDemand: qd - qs,
  };
}

/** Area of a triangle from base and height, as used in IB surplus calculations. */
export function triangleArea(base: number, height: number): number {
  return 0.5 * base * height;
}

// ---------- Government intervention (2.7, HL calculations) ----------

export interface TaxResult {
  /** New quantity traded. */
  quantity: number;
  /** Price consumers pay. */
  consumerPrice: number;
  /** Price producers keep after paying the tax. */
  producerPrice: number;
  governmentRevenue: number;
  consumerBurden: number;
  producerBurden: number;
  welfareLoss: number;
}

/** A specific (per-unit) indirect tax: supply shifts up by the tax at every quantity. */
export function specificTax(demand: Line, supply: Line, tax: number): TaxResult {
  const e = equilibrium(demand, supply);
  const taxed = equilibrium(demand, shiftLine(supply, 0, tax));
  const q = taxed.q;
  const pc = taxed.p;
  const pp = pc - tax;
  return {
    quantity: q,
    consumerPrice: pc,
    producerPrice: pp,
    governmentRevenue: tax * q,
    consumerBurden: (pc - e.p) * q,
    producerBurden: (e.p - pp) * q,
    welfareLoss: triangleArea(e.q - q, tax),
  };
}

/** An ad valorem tax at `rate` (0.2 = 20%) of the price producers receive: supply pivots upward. */
export function adValoremTax(demand: Line, supply: Line, rate: number): TaxResult {
  const e = equilibrium(demand, supply);
  const taxedSupply: Line = {
    a: { q: supply.a.q, p: supply.a.p * (1 + rate) },
    b: { q: supply.b.q, p: supply.b.p * (1 + rate) },
  };
  const taxed = equilibrium(demand, taxedSupply);
  const q = taxed.q;
  const pc = taxed.p;
  const pp = priceAt(supply, q);
  const perUnit = pc - pp;
  return {
    quantity: q,
    consumerPrice: pc,
    producerPrice: pp,
    governmentRevenue: perUnit * q,
    consumerBurden: (pc - e.p) * q,
    producerBurden: (e.p - pp) * q,
    welfareLoss: triangleArea(e.q - q, perUnit),
  };
}

export interface SubsidyResult {
  quantity: number;
  consumerPrice: number;
  /** Price producers receive including the subsidy. */
  producerPrice: number;
  governmentSpending: number;
  consumerGain: number;
  producerGain: number;
  welfareLoss: number;
}

/** A per-unit subsidy: supply shifts down by the subsidy at every quantity. */
export function specificSubsidy(demand: Line, supply: Line, subsidy: number): SubsidyResult {
  const e = equilibrium(demand, supply);
  const sub = equilibrium(demand, shiftLine(supply, 0, -subsidy));
  const q = sub.q;
  const pc = sub.p;
  const pp = pc + subsidy;
  return {
    quantity: q,
    consumerPrice: pc,
    producerPrice: pp,
    governmentSpending: subsidy * q,
    // Gains on the original quantity plus the triangle on the extra units.
    consumerGain: (e.p - pc) * e.q + triangleArea(q - e.q, e.p - pc),
    producerGain: (pp - e.p) * e.q + triangleArea(q - e.q, pp - e.p),
    welfareLoss: triangleArea(q - e.q, subsidy),
  };
}

export interface PriceControlResult {
  quantityDemanded: number;
  quantitySupplied: number;
  quantityTraded: number;
  /** Shortage for a ceiling (positive), surplus for a floor (positive). */
  gap: number;
  welfare: Welfare;
}

/** A binding maximum price (price ceiling) below equilibrium creates a shortage. */
export function priceCeiling(demand: Line, supply: Line, ceiling: number): PriceControlResult {
  const e = equilibrium(demand, supply);
  const price = Math.min(ceiling, e.p);
  const qd = quantityAt(demand, price);
  const qs = quantityAt(supply, price);
  return { quantityDemanded: qd, quantitySupplied: qs, quantityTraded: Math.min(qd, qs), gap: qd - qs, welfare: welfareAtPrice(demand, supply, price) };
}

/** A binding minimum price (price floor) above equilibrium creates a surplus. */
export function priceFloor(demand: Line, supply: Line, floor: number): PriceControlResult {
  const e = equilibrium(demand, supply);
  const price = Math.max(floor, e.p);
  const qd = quantityAt(demand, price);
  const qs = quantityAt(supply, price);
  return { quantityDemanded: qd, quantitySupplied: qs, quantityTraded: Math.min(qd, qs), gap: qs - qd, welfare: welfareAtPrice(demand, supply, price) };
}

/** Government spending to buy the whole surplus at a price floor. */
export function floorBuyUpCost(demand: Line, supply: Line, floor: number): number {
  const r = priceFloor(demand, supply, floor);
  return Math.max(0, r.gap) * Math.max(floor, equilibrium(demand, supply).p);
}

// ---------- PPC (1.1) ----------

/** A PPC as a schedule: combinations of good X and good Y, in order of increasing X. */
export type PpcSchedule = { x: number; y: number }[];

/** Opportunity cost of each extra unit of X between consecutive points, in units of Y given up. */
export function opportunityCosts(schedule: PpcSchedule): number[] {
  const out: number[] = [];
  for (let i = 1; i < schedule.length; i++) {
    const dx = schedule[i].x - schedule[i - 1].x;
    const dy = schedule[i - 1].y - schedule[i].y;
    if (dx <= 0) throw new RangeError('PPC schedule must list increasing amounts of X.');
    out.push(dy / dx);
  }
  return out;
}

/** 'increasing' if each extra unit of X costs more Y than the last, 'constant' if all equal. */
export function opportunityCostPattern(schedule: PpcSchedule, tol = 1e-6): 'increasing' | 'constant' | 'other' {
  const c = opportunityCosts(schedule);
  if (c.every((v) => Math.abs(v - c[0]) <= tol)) return 'constant';
  if (c.every((v, i) => i === 0 || v > c[i - 1] + tol)) return 'increasing';
  return 'other';
}

/** Maximum Y the economy can make with the given X, reading along the schedule (straight between points). */
export function ppcMaxY(schedule: PpcSchedule, x: number): number {
  if (x < schedule[0].x || x > schedule[schedule.length - 1].x) return x < schedule[0].x ? schedule[0].y : -Infinity;
  for (let i = 1; i < schedule.length; i++) {
    const s0 = schedule[i - 1], s1 = schedule[i];
    if (x <= s1.x + EPS) return s0.y + ((s1.y - s0.y) * (x - s0.x)) / (s1.x - s0.x);
  }
  return schedule[schedule.length - 1].y;
}

export type PpcPosition = 'inside' | 'on' | 'outside';

/** Whether the combination (x, y) is inside (unemployed resources), on (efficient) or outside (unattainable) the PPC. */
export function ppcPosition(schedule: PpcSchedule, x: number, y: number, tol = 0.5): PpcPosition {
  const maxY = ppcMaxY(schedule, x);
  if (y > maxY + tol) return 'outside';
  if (y < maxY - tol) return 'inside';
  return 'on';
}

// ---------- Helpers for display ----------

/** Rounds to a number of decimal places (default 2) without floating point noise. */
export function round(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round((value + Number.EPSILON) * f) / f;
}
