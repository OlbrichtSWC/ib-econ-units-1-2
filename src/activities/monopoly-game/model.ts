/**
 * Rival Pricing (2.11, HL): the rules behind the game, kept apart from the screen so they can be tested.
 *
 * Level 1: market structures and the concentration ratio.
 * Level 2: profit maximization from a cost and revenue schedule (a table, never a function).
 * Level 3: a two-firm pricing game with a payoff matrix (a prisoner's dilemma).
 */

// ---------------- Market structures ----------------

/** The four market structures, from no market power to the most market power. */
export type Structure = 'perfect' | 'monopolistic' | 'oligopoly' | 'monopoly';
export const STRUCTURES: Structure[] = ['perfect', 'monopolistic', 'oligopoly', 'monopoly'];

/** 0 for perfect competition up to 3 for monopoly. */
export const powerRank = (s: Structure) => STRUCTURES.indexOf(s);

/** Only a perfectly competitive firm is a price taker. Every other firm has some market power. */
export const priceTaker = (s: Structure) => s === 'perfect';

/** The concentration ratio CRn: the combined market share (%) of the n largest firms. */
export function concentrationRatio(shares: number[], n = 4): number {
  return [...shares].sort((a, b) => b - a).slice(0, n).reduce((s, x) => s + x, 0);
}

export type CrSlip = 'firstN' | 'all' | 'whole' | 'tooFew' | 'average';

/** Common slips in a concentration ratio, used for feedback. Slips that give the right answer are left out. */
export function crMistakes(shares: number[], n = 4): { kind: CrSlip; value: number }[] {
  const right = concentrationRatio(shares, n);
  const out = [
    { kind: 'firstN' as const, value: shares.slice(0, n).reduce((s, x) => s + x, 0) },
    { kind: 'all' as const, value: shares.reduce((s, x) => s + x, 0) },
    { kind: 'whole' as const, value: 100 }, // every firm, including all the small ones
    { kind: 'tooFew' as const, value: concentrationRatio(shares, n - 1) },
    { kind: 'average' as const, value: right / n },
  ];
  return out.filter((x, i) => Math.abs(x.value - right) > 1e-9 && out.findIndex((y) => Math.abs(y.value - x.value) < 1e-9) === i);
}

// ---------------- Profit maximization from a schedule ----------------

/**
 * A firm's schedule. prices[i] is the price (AR) when it sells Q = i + 1 units.
 * costs[i] is total cost (TC) at Q = i, so costs[0] is the fixed cost.
 */
export interface Schedule {
  prices: number[];
  costs: number[];
}

export interface Row {
  q: number;
  /** Price = average revenue (AR). */
  p: number;
  tr: number;
  tc: number;
  /** Marginal revenue: the change in TR from the unit before. */
  mr: number;
  /** Marginal cost: the change in TC from the unit before. */
  mc: number;
  /** Average cost: TC / Q. */
  ac: number;
  profit: number;
}

/** The rows for Q = 1 up to the last output. */
export function rows(s: Schedule): Row[] {
  if (s.costs.length !== s.prices.length + 1) throw new RangeError('costs needs one more entry than prices (Q = 0).');
  let lastTr = 0;
  return s.prices.map((p, i) => {
    const q = i + 1;
    const tr = p * q;
    const tc = s.costs[q];
    const row = { q, p, tr, tc, mr: tr - lastTr, mc: tc - s.costs[q - 1], ac: tc / q, profit: tr - tc };
    lastTr = tr;
    return row;
  });
}

export function rowAt(s: Schedule, q: number): Row {
  const r = rows(s).find((x) => x.q === q);
  if (!r) throw new RangeError(`No row for Q = ${q}.`);
  return r;
}

/** The output with the most profit (TR − TC). */
export function bestOutput(s: Schedule): number {
  return rows(s).reduce((best, r) => (r.profit > best.profit ? r : best)).q;
}

/**
 * The MC = MR rule on a table: keep making units while MR is at least MC, and stop before MC rises above MR.
 * It gives the same output as the biggest TR − TC.
 */
export function mcEqualsMrOutput(s: Schedule): number {
  const rs = rows(s);
  let q = 0;
  for (const r of rs) {
    if (r.mr >= r.mc) q = r.q;
    else if (r.q > 1 && rs[r.q - 2].mc < r.mc) break; // MC is above MR and rising: stop.
  }
  return q;
}

/** Is the best output unique? A tie would give two right answers. */
export function uniqueBest(s: Schedule): boolean {
  const rs = rows(s);
  const top = Math.max(...rs.map((r) => r.profit));
  return rs.filter((r) => Math.abs(r.profit - top) < 1e-9).length === 1;
}

/** The output (or outputs) where TR is highest. */
export function trMaxOutputs(s: Schedule): number[] {
  const rs = rows(s);
  const top = Math.max(...rs.map((r) => r.tr));
  return rs.filter((r) => Math.abs(r.tr - top) < 1e-9).map((r) => r.q);
}

export type ProfitKind = 'abnormal' | 'normal' | 'loss';
export const PROFIT_KINDS: ProfitKind[] = ['abnormal', 'normal', 'loss'];

/** Abnormal profit when AR > AC (TR > TC), normal profit when AR = AC, a loss when AR < AC. */
export function profitKind(s: Schedule, q = bestOutput(s)): ProfitKind {
  const r = rowAt(s, q);
  if (Math.abs(r.p - r.ac) < 1e-9) return 'normal';
  return r.p > r.ac ? 'abnormal' : 'loss';
}

export type OutputSlip = 'right' | 'trMax' | 'before' | 'after';

/** Why a chosen output is wrong: the TR-max trap, too few units (MR still above MC) or too many (MC above MR). */
export function outputSlip(s: Schedule, q: number): OutputSlip {
  const best = bestOutput(s);
  if (q === best) return 'right';
  if (trMaxOutputs(s).includes(q)) return 'trMax';
  return q < best ? 'before' : 'after';
}

export type PriceSlip = 'mr' | 'mc' | 'tr' | 'ac';

/** Numbers students often type instead of the price at the best output. */
export function priceMistakes(s: Schedule): { kind: PriceSlip; value: number }[] {
  const r = rowAt(s, bestOutput(s));
  const out = [
    { kind: 'mr' as const, value: r.mr },
    { kind: 'mc' as const, value: r.mc },
    { kind: 'tr' as const, value: r.tr },
    { kind: 'ac' as const, value: r.ac },
  ];
  return out.filter((x, i) => Math.abs(x.value - r.p) > 1e-9 && out.findIndex((y) => Math.abs(y.value - x.value) < 1e-9) === i);
}

export type ProfitSlip = 'trOnly' | 'pMinusMc' | 'trMaxRow' | 'sign';

/** Numbers students often type instead of the profit at the best output. */
export function profitMistakes(s: Schedule): { kind: ProfitSlip; value: number }[] {
  const r = rowAt(s, bestOutput(s));
  const trRow = rowAt(s, trMaxOutputs(s)[0]);
  const out = [
    { kind: 'trOnly' as const, value: r.tr },
    { kind: 'pMinusMc' as const, value: (r.p - r.mc) * r.q },
    { kind: 'trMaxRow' as const, value: trRow.profit },
    { kind: 'sign' as const, value: -r.profit },
  ];
  return out.filter((x, i) => Math.abs(x.value - r.profit) > 1e-9 && out.findIndex((y) => Math.abs(y.value - x.value) < 1e-9) === i);
}

// ---------------- The pricing game ----------------

export type Move = 'high' | 'low';
export const MOVES: Move[] = ['high', 'low'];

/**
 * A payoff matrix for two firms. The key is your move then the rival's move.
 * Each cell is [your profit, the rival's profit].
 */
export type Matrix = Record<`${Move}-${Move}`, [number, number]>;

export const cell = (m: Matrix, you: Move, rival: Move) => m[`${you}-${rival}`];

/** Your best move when you know the rival's move. Null when both moves earn the same. */
export function bestReply(m: Matrix, rival: Move): Move | null {
  const h = cell(m, 'high', rival)[0], l = cell(m, 'low', rival)[0];
  if (h === l) return null;
  return h > l ? 'high' : 'low';
}

/** The rival's best move when it knows your move. */
export function rivalBestReply(m: Matrix, you: Move): Move | null {
  const h = cell(m, you, 'high')[1], l = cell(m, you, 'low')[1];
  if (h === l) return null;
  return h > l ? 'high' : 'low';
}

/** A dominant strategy is the best move whatever the rival does. Null if there is none. */
export function dominantStrategy(m: Matrix): Move | null {
  const a = bestReply(m, 'high'), b = bestReply(m, 'low');
  return a && a === b ? a : null;
}

export function rivalDominantStrategy(m: Matrix): Move | null {
  const a = rivalBestReply(m, 'high'), b = rivalBestReply(m, 'low');
  return a && a === b ? a : null;
}

/** Where both firms end up when each plays its best reply to the other (a Nash equilibrium). */
export function equilibrium(m: Matrix): [Move, Move] | null {
  for (const y of MOVES) for (const r of MOVES) if (bestReply(m, r) === y && rivalBestReply(m, y) === r) return [y, r];
  return null;
}

/** The cell with the highest joint profit: what the firms would agree on if they colluded. */
export function jointBest(m: Matrix): [Move, Move] {
  let best: [Move, Move] = ['high', 'high'];
  for (const y of MOVES) for (const r of MOVES) {
    const c = cell(m, y, r), b = cell(m, best[0], best[1]);
    if (c[0] + c[1] > b[0] + b[1]) best = [y, r];
  }
  return best;
}

/** A prisoner's dilemma: both firms follow their dominant strategy and both end up worse off than if they had both cooperated. */
export function isPrisonersDilemma(m: Matrix): boolean {
  const e = equilibrium(m), j = jointBest(m);
  if (!e || !dominantStrategy(m) || !rivalDominantStrategy(m)) return false;
  const ce = cell(m, e[0], e[1]), cj = cell(m, j[0], j[1]);
  return (e[0] !== j[0] || e[1] !== j[1]) && cj[0] > ce[0] && cj[1] > ce[1];
}

/** The gain from cheating on a deal to keep prices high: undercut while the rival stays high. */
export function cheatGain(m: Matrix): number {
  return cell(m, 'low', 'high')[0] - cell(m, 'high', 'high')[0];
}

/** The rival's rule (tit-for-tat): start with a high price, then copy your price from the week before. */
export function titForTat(yours: Move[], week: number): Move {
  return week === 0 ? 'high' : yours[week - 1];
}

/** Profits over the weeks played, with the rival following tit-for-tat. */
export function tally(m: Matrix, yours: Move[]): { you: number; rival: number; weeks: { you: Move; rival: Move; pay: [number, number] }[] } {
  const weeks = yours.map((y, w) => {
    const r = titForTat(yours, w);
    return { you: y, rival: r, pay: cell(m, y, r) };
  });
  return { you: weeks.reduce((s, w) => s + w.pay[0], 0), rival: weeks.reduce((s, w) => s + w.pay[1], 0), weeks };
}

/** How many of n customers walk to your café: the cheaper café gets most of them. */
export function customersToYou(you: Move, rival: Move, n = 6): number {
  if (you === rival) return Math.round(n / 2);
  return you === 'low' ? n - 1 : 1;
}

// ---------------- Typed numbers and goals ----------------

/** Read a typed number: accepts "45", "$45", "-22", "−22" and "1,200". NaN if it is not a number. */
export function parseNumber(text: string): number {
  const t = text.replace(/[$,%\s]/g, '').replace('−', '-');
  if (!/^-?\d*\.?\d+$/.test(t)) return NaN;
  return Number(t);
}

/** Check a typed number, allowing a small rounding slip. */
export function numberRight(typed: number, answer: number, tol = 0.01): boolean {
  return Number.isFinite(typed) && Math.abs(typed - answer) <= tol + 1e-9;
}

/** Level 1: markets mapped right first time (every step right on the first try). */
export const MAP_GOAL = 8;
/** Level 2: first-try points (output, price, profit, kind of profit in each round). */
export const POINTS_PER_PROFIT_ROUND = 4;
export const PROFIT_GOAL = 16;
/** Level 3: first-try points from reading the matrix, the weeks of play and the judgements. */
export const MATRIX_STEPS = 4;
export const POINTS_PER_WEEK = 2;
export const DUEL_GOAL = 15;

export const mapWon = (firstRight: number, goal = MAP_GOAL) => firstRight >= goal;
export const profitWon = (points: number) => points >= PROFIT_GOAL;
export const duelWon = (points: number) => points >= DUEL_GOAL;
export const duelMax = (weeks: number, judgements: number) => MATRIX_STEPS + weeks * POINTS_PER_WEEK + judgements;
