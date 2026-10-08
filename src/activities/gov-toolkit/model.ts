/**
 * Government Toolkit (2.7): the economics behind each policy mission (invented markets).
 *
 * Four tools: a maximum price (price ceiling), a minimum price (price floor), a specific
 * (per-unit) indirect tax and a specific subsidy. applyPolicy works out what each does to the
 * market. Every dollar value comes from the tested functions in econ/calc.ts.
 */
import {
  equilibrium, floorBuyUpCost, Line, priceAt, priceCeiling, priceFloor, Pt, quantityAt, round, shiftLine, specificSubsidy, specificTax,
} from '../../econ/calc';

export type Tool = 'ceiling' | 'floor' | 'tax' | 'subsidy';
export const TOOLS: Tool[] = ['ceiling', 'floor', 'tax', 'subsidy'];

export interface Outcome {
  tool: Tool;
  /** Ceiling or floor price, or the tax or subsidy per unit. */
  size: number;
  quantity: number;
  /** What buyers pay. */
  consumerPrice: number;
  /** What sellers keep (after a tax) or receive (with a subsidy). */
  producerPrice: number;
  qd: number;
  qs: number;
  /** Shortage (ceiling) or surplus (floor), 0 otherwise. */
  shortage: number;
  surplus: number;
  /** Tax revenue (positive) or subsidy spending (negative). Ceilings and floors: 0. */
  budget: number;
  welfareLoss: number;
  /** HL: tax burden on consumers and producers (tax only). */
  consumerBurden: number;
  producerBurden: number;
  /** Cost for the government to buy the whole surplus at a minimum price. */
  buyUpCost: number;
  /** The market before the policy. */
  e: Pt;
}

/** What a policy does to a market. A ceiling at or above equilibrium, or a floor at or below it, does nothing. */
export function applyPolicy(demand: Line, supply: Line, tool: Tool, size: number): Outcome {
  const e = equilibrium(demand, supply);
  const base = { tool, size, e, shortage: 0, surplus: 0, budget: 0, consumerBurden: 0, producerBurden: 0, buyUpCost: 0 };
  if (tool === 'tax') {
    const r = specificTax(demand, supply, size);
    return {
      ...base, quantity: r.quantity, consumerPrice: r.consumerPrice, producerPrice: r.producerPrice, qd: r.quantity, qs: r.quantity,
      budget: r.governmentRevenue, welfareLoss: r.welfareLoss, consumerBurden: r.consumerBurden, producerBurden: r.producerBurden,
    };
  }
  if (tool === 'subsidy') {
    const r = specificSubsidy(demand, supply, size);
    return {
      ...base, quantity: r.quantity, consumerPrice: r.consumerPrice, producerPrice: r.producerPrice, qd: r.quantity, qs: r.quantity,
      budget: -r.governmentSpending, welfareLoss: r.welfareLoss,
    };
  }
  const r = tool === 'ceiling' ? priceCeiling(demand, supply, size) : priceFloor(demand, supply, size);
  const price = tool === 'ceiling' ? Math.min(size, e.p) : Math.max(size, e.p);
  return {
    ...base,
    quantity: r.quantityTraded,
    consumerPrice: price,
    producerPrice: price,
    qd: r.quantityDemanded,
    qs: r.quantitySupplied,
    shortage: tool === 'ceiling' ? Math.max(0, r.gap) : 0,
    surplus: tool === 'floor' ? Math.max(0, r.gap) : 0,
    welfareLoss: r.welfare.welfareLoss,
    buyUpCost: tool === 'floor' ? floorBuyUpCost(demand, supply, size) : 0,
  };
}

export type Measure = 'consumerPrice' | 'producerPrice' | 'quantity' | 'budget';

export interface Target {
  measure: Measure;
  op: '<=' | '>=';
  value: number;
}

/** True when the outcome meets the mission's target. */
export function meetsTarget(o: Outcome, t: Target): boolean {
  const v = o[t.measure];
  return t.op === '<=' ? v <= t.value + 1e-9 : v >= t.value - 1e-9;
}

// ---------- Level 2: predict the effects ----------

export type PriceMove = 'rises' | 'falls';
export type BudgetEffect = 'gains revenue' | 'spends money' | 'no direct effect';
export type Gap = 'shortage' | 'surplus' | 'neither';

export interface Effects {
  consumerPrice: PriceMove;
  quantity: PriceMove;
  budget: BudgetEffect;
  gap: Gap;
}

/** The effects a binding policy always has, whatever its size. */
export function policyEffects(tool: Tool): Effects {
  switch (tool) {
    case 'ceiling':
      return { consumerPrice: 'falls', quantity: 'falls', budget: 'no direct effect', gap: 'shortage' };
    case 'floor':
      return { consumerPrice: 'rises', quantity: 'falls', budget: 'no direct effect', gap: 'surplus' };
    case 'tax':
      return { consumerPrice: 'rises', quantity: 'falls', budget: 'gains revenue', gap: 'neither' };
    case 'subsidy':
      return { consumerPrice: 'falls', quantity: 'rises', budget: 'spends money', gap: 'neither' };
  }
}

/** Checks the outcome agrees with policyEffects (used by the tests on every mission). */
export function effectsOf(o: Outcome): Effects {
  const dir = (a: number, b: number): PriceMove => (b > a ? 'rises' : 'falls');
  return {
    consumerPrice: dir(o.e.p, o.consumerPrice),
    quantity: dir(o.e.q, o.quantity),
    budget: o.budget > 1e-9 ? 'gains revenue' : o.budget < -1e-9 ? 'spends money' : 'no direct effect',
    gap: o.shortage > 1e-9 ? 'shortage' : o.surplus > 1e-9 ? 'surplus' : 'neither',
  };
}

/** How many of the student's predictions are right. */
export function effectsRight(pred: Partial<Effects>, tool: Tool): number {
  const t = policyEffects(tool);
  return (Object.keys(t) as (keyof Effects)[]).filter((k) => pred[k] === t[k]).length;
}

// ---------- Level 3 (HL): calculate ----------

export type CalcAsk = 'budget' | 'consumerBurden' | 'producerBurden' | 'welfareLoss' | 'shortage' | 'surplus' | 'buyUpCost' | 'consumerPrice' | 'quantity';

/** The true value for a calculation, as a positive number (spending is shown as a cost). */
export function calcValue(o: Outcome, ask: CalcAsk): number {
  return round(Math.abs(o[ask]), 2);
}

/** Accepts answers within 1% (or 0.01), so rounding along the way is fine. */
export function calcRight(o: Outcome, ask: CalcAsk, typed: number): boolean {
  const v = calcValue(o, ask);
  return Number.isFinite(typed) && Math.abs(Math.abs(typed) - v) <= Math.max(0.01, v * 0.01) + 1e-9;
}

// ---------- Missions and levels ----------

/** no-spending rules out a subsidy; needs-revenue needs a tax; no-shortage rules out a binding maximum price. */
export type Rule = 'no-spending' | 'needs-revenue' | 'no-shortage';

/** True when a policy outcome breaks one of the brief's rules. */
export function breaksRules(o: Outcome, rules: Rule[]): boolean {
  return rules.some((r) => (r === 'no-spending' ? o.budget < -1e-9 : r === 'needs-revenue' ? o.budget <= 1e-9 : o.shortage > 1e-9));
}

export interface Mission {
  id: string;
  title: string;
  /** Short story and the goal, in markdown. */
  brief: string;
  tool: Tool;
  /** Feedback when the student picks each wrong tool. */
  wrongTool: Partial<Record<Tool, string>>;
  demand: Line;
  supply: Line;
  xMax: number;
  yMax: number;
  xLabel: string;
  yLabel: string;
  /** Unit word for quantities, for example "bottles". */
  unit: string;
  /** One unit, for "per ..." (a tax per bottle). */
  per: string;
  /** Quantities are in thousands, so revenue, spending and welfare loss are in thousands of dollars too. */
  moneyScale?: 'thousand';
  /** Slider range for the policy size. */
  min: number;
  max: number;
  step: number;
  target: Target;
  /** What the brief rules out. Tests use these to check that only one tool fits each brief. */
  rules: Rule[];
  /** Level 3: what to calculate at the student's policy. */
  calc?: { ask: CalcAsk; prompt: string }[];
  /** Why the right tool works, shown at the end. */
  explain: string;
}

/** Points to draw: the taxed or subsidised supply curve. */
export function shiftedSupply(supply: Line, tool: Tool, size: number): Line | null {
  if (tool === 'tax') return shiftLine(supply, 0, size);
  if (tool === 'subsidy') return shiftLine(supply, 0, -size);
  return null;
}

/** The welfare loss triangle, or [] when there is none. */
export function lossTriangle(demand: Line, supply: Line, o: Outcome): Pt[] {
  if (o.welfareLoss < 1e-9) return [];
  const q = o.quantity;
  return [
    { q, p: priceAt(demand, q) },
    { q: o.e.q, p: o.e.p },
    { q, p: priceAt(supply, q) },
  ];
}

/** Tax revenue or subsidy spending as a rectangle: between the two prices, from 0 to the quantity. */
export function budgetRect(o: Outcome): Pt[] {
  if (Math.abs(o.budget) < 1e-9) return [];
  const lo = Math.min(o.consumerPrice, o.producerPrice), hi = Math.max(o.consumerPrice, o.producerPrice);
  return [{ q: 0, p: lo }, { q: o.quantity, p: lo }, { q: o.quantity, p: hi }, { q: 0, p: hi }];
}

/** Snaps a slider value to the mission's step and range. */
export function snapSize(m: Mission, v: number): number {
  const s = Math.round((v - m.min) / m.step) * m.step + m.min;
  return round(Math.min(m.max, Math.max(m.min, s)), 4);
}

/** The policy sizes on the slider that meet the target with the right tool. A good mission has some, but not all. */
export function workingSizes(m: Mission): number[] {
  const out: number[] = [];
  for (let v = m.min; v <= m.max + 1e-9; v += m.step) {
    const s = round(v, 4);
    if (meetsTarget(applyPolicy(m.demand, m.supply, m.tool, s), m.target)) out.push(s);
  }
  return out;
}

/** Quantity demanded at a price, never negative (for drawing). */
export const qAt = (l: Line, p: number) => Math.max(0, quantityAt(l, p));
