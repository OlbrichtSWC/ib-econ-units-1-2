/**
 * The Elasticity Café: a business simulation with a hidden demand curve (invented numbers).
 * Each scenario has a straight-line demand curve that the student never sees until the
 * end of the week. Its playable price range sits wholly on the elastic part, or wholly
 * on the inelastic part, of that line, so every price change gives the same answer.
 *
 * Cups sold are whole numbers, and every percentage change and PED in the sales log is
 * worked out from those whole numbers, so the numbers students see agree with each other.
 */
import { Line, pedAtPoint, percentChange, ped, quantityAt, revenueChange, round } from '../../econ/calc';

export interface Scenario {
  id: string;
  name: string;
  /** Markdown shown when the scenario is chosen. */
  text: string;
  /** True when the scenario should not hint at its PED in the picker. */
  mystery?: boolean;
  /** Two points on the hidden demand curve. */
  demand: Line;
  priceMin: number;
  priceMax: number;
  startPrice: number;
  /** Axis maximums for the diagram. */
  qMax: number;
  pMax: number;
  /** HINTS debrief: one short sentence per letter. */
  hints: { letter: 'H' | 'I' | 'N' | 'T' | 'S'; text: string }[];
}

export type RangeType = 'elastic' | 'inelastic' | 'mixed';

export const PRICE_STEP = 0.25;

/** Snap a price to the $0.25 grid and keep it inside the scenario's range. */
export function snapPrice(s: Scenario, price: number): number {
  const snapped = Math.round(price / PRICE_STEP) * PRICE_STEP;
  return round(Math.min(s.priceMax, Math.max(s.priceMin, snapped)), 2);
}

/** Whole cups sold at a price (never negative). */
export function cupsSold(s: Scenario, price: number): number {
  return Math.max(0, Math.round(quantityAt(s.demand, price)));
}

/** Whether the whole playable range is elastic or inelastic (checked at both ends). */
export function rangeType(s: Scenario): RangeType {
  const lo = Math.abs(pedAtPoint(s.demand, s.priceMin));
  const hi = Math.abs(pedAtPoint(s.demand, s.priceMax));
  if (lo > 1 && hi > 1) return 'elastic';
  if (lo < 1 && hi < 1) return 'inelastic';
  return 'mixed';
}

export interface DayRow {
  day: number;
  price: number;
  cups: number;
  revenue: number;
  /** Changes from the previous day (null on day 1). */
  pctPrice: number | null;
  pctQuantity: number | null;
  /** Null on day 1, or when the price did not change. */
  ped: number | null;
  changeTR: number | null;
  /** Price pull and quantity pull from calc.ts revenueChange (null on day 1). */
  pricePull: number | null;
  quantityPull: number | null;
}

/** The sales log for the prices chosen so far. The previous day is always the original value. */
export function salesLog(s: Scenario, prices: number[]): DayRow[] {
  const rows: DayRow[] = [];
  prices.forEach((price, i) => {
    const cups = cupsSold(s, price);
    const revenue = round(price * cups, 2);
    if (i === 0) {
      rows.push({ day: 1, price, cups, revenue, pctPrice: null, pctQuantity: null, ped: null, changeTR: null, pricePull: null, quantityPull: null });
      return;
    }
    const prev = rows[i - 1];
    const rc = revenueChange(prev.price, prev.cups, price, cups);
    const samePrice = Math.abs(price - prev.price) < 1e-9;
    rows.push({
      day: i + 1,
      price,
      cups,
      revenue,
      pctPrice: percentChange(prev.price, price),
      pctQuantity: prev.cups === 0 ? null : percentChange(prev.cups, cups),
      ped: samePrice || prev.cups === 0 ? null : ped(prev.price, prev.cups, price, cups),
      changeTR: round(rc.change, 2),
      pricePull: round(rc.priceEffect, 2),
      quantityPull: round(rc.quantityEffect, 2),
    });
  });
  return rows;
}

export interface WeekSummary {
  /** Days where the price changed from the day before. */
  changes: number;
  /** Of those, days where total revenue moved the opposite way to price (sign of elastic demand). */
  opposite: number;
  /** Of those, days where total revenue moved the same way as price (sign of inelastic demand). */
  same: number;
  /** Average of |PED| over days with a price change, or null if none. */
  meanAbsPed: number | null;
  /** What the student's own data says, or null if there is not enough data. */
  dataSays: 'elastic' | 'inelastic' | null;
  /** The row with the biggest price change, used as the worked example in feedback. */
  example: DayRow | null;
}

export function summarize(rows: DayRow[]): WeekSummary {
  const changed = rows.filter((r) => r.ped !== null);
  let opposite = 0, same = 0;
  changed.forEach((r) => {
    const dp = Math.sign(r.pctPrice ?? 0);
    const dtr = Math.sign(r.changeTR ?? 0);
    if (dtr === -dp) opposite++;
    else if (dtr === dp) same++;
  });
  const meanAbsPed = changed.length ? changed.reduce((t, r) => t + Math.abs(r.ped!), 0) / changed.length : null;
  const example = changed.reduce<DayRow | null>((best, r) => (!best || Math.abs(r.pctPrice!) > Math.abs(best.pctPrice!) ? r : best), null);
  return {
    changes: changed.length,
    opposite,
    same,
    meanAbsPed,
    dataSays: meanAbsPed === null ? null : meanAbsPed > 1 ? 'elastic' : 'inelastic',
    example,
  };
}

/** To raise total revenue: lower the price when demand is elastic, raise it when inelastic. */
export function bestMove(type: 'elastic' | 'inelastic'): 'raise' | 'lower' {
  return type === 'elastic' ? 'lower' : 'raise';
}

/** Fills {name} placeholders in a content template. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

// ---------- Display helpers ----------

export const money = (v: number) => (v < 0 ? '−$' : '$') + Math.abs(v).toFixed(2);
export const signedMoney = (v: number) => (v > 0 ? '+$' : v < 0 ? '−$' : '$') + Math.abs(v).toFixed(2);
export const signedPct = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(round(v, 1)).toFixed(1) + '%';
export const pedText = (v: number) => (v < 0 ? '−' : '') + Math.abs(round(v, 2)).toFixed(2);
