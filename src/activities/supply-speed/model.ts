/**
 * Supply Speed (2.6): the rules behind the game, kept apart from the screen so they can be tested.
 *
 * Level 1: rank producers from least to most elastic supply, then name the determinant behind the ranking.
 * Level 2: one producer travels through the momentary period, the short run and the long run.
 * Level 3: work out PES from the producer's own results and classify it.
 */
import { classifyPed, percentChange, pes as pesCalc } from '../../econ/calc';

export type Determinant = 'time' | 'capacity' | 'storage' | 'mobility' | 'costs';
export const DETERMINANTS: Determinant[] = ['time', 'capacity', 'storage', 'mobility', 'costs'];

export type Period = 'momentary' | 'short' | 'long';
export const PERIODS: Period[] = ['momentary', 'short', 'long'];

export type PesClass = 'perfectly-inelastic' | 'inelastic' | 'unit' | 'elastic' | 'perfectly-elastic';
export const PES_CLASSES: PesClass[] = ['perfectly-inelastic', 'inelastic', 'unit', 'elastic', 'perfectly-elastic'];

/** Level 1: 5 rounds x 2 marks (the ranking and the determinant), right first time. */
export const RACE_GOAL = 8;
/** Level 2: 4 producers x 3 periods, right first time. */
export const TIME_GOAL = 10;
/** Level 3: rounds solved with no wrong try, out of 6. */
export const MEASURE_GOAL = 5;

/** PES = % change in quantity supplied / % change in price. */
export function pesFromData(p0: number, p1: number, q0: number, q1: number): number {
  return pesCalc(p0, q0, p1, q1);
}

/** Round to 2 decimal places, the way students give PES. */
export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** The % change in quantity supplied for a given PES and % change in price (rearranged formula). */
export function pctQFromPes(pesValue: number, pctPrice: number): number {
  return pesValue * pctPrice;
}

/** The new quantity supplied after a price change, from PES. */
export function newQuantity(q0: number, pesValue: number, pctPrice: number): number {
  return q0 * (1 + pctQFromPes(pesValue, pctPrice) / 100);
}

/** Classify a PES value. Infinity means perfectly elastic. */
export function classifyPes(value: number): PesClass {
  const t = classifyPed(value);
  if (t === 'perfectly inelastic') return 'perfectly-inelastic';
  if (t === 'perfectly elastic') return 'perfectly-elastic';
  if (t === 'unitary') return 'unit';
  return t;
}

/** Level 1: producer ids ordered from least to most elastic supply. */
export function rankByPes<T extends { id: string; pes: number }>(producers: T[]): string[] {
  return [...producers].sort((a, b) => a.pes - b.pes).map((p) => p.id);
}

/**
 * Level 1: producers are tapped in order, least elastic first. `placed` lists the ids already placed.
 * Returns true when `tapped` is the next one in the ranking.
 */
export function isNextInRank<T extends { id: string; pes: number }>(producers: T[], placed: string[], tapped: string): boolean {
  return rankByPes(producers)[placed.length] === tapped;
}

/** Level 1 race: how far along the lane (0 to 1) each producer gets. The fastest reaches the end. */
export function raceShare(pctQ: number, maxPctQ: number): number {
  if (maxPctQ <= 0) return 0;
  return Math.max(0, Math.min(1, pctQ / maxPctQ));
}

/** Level 2: the producer's output in each period. */
export interface TimeProducer {
  p0: number;
  p1: number;
  q0: number;
  qShort: number;
  qLong: number;
}

export function outputIn(t: TimeProducer, period: Period): number {
  return period === 'momentary' ? t.q0 : period === 'short' ? t.qShort : t.qLong;
}

/** PES in each period: zero in the momentary period, then higher as time passes. */
export function pesIn(t: TimeProducer, period: Period): number {
  return pesFromData(t.p0, t.p1, t.q0, outputIn(t, period));
}

/**
 * Level 2 diagram (not to scale): every curve pivots on the starting point (base, P₀).
 * The price on the diagram always rises by `pctP`%, so the quantity where a curve meets the new
 * price is base × (1 + PES × pctP / 100). That keeps each curve's PES equal to the producer's.
 */
export function pivotQ(pesValue: number, base = 35, pctP = 50): number {
  return base * (1 + (pesValue * pctP) / 100);
}

/** Level 3 gauge: PES 0 points left (-90 degrees), PES 1 points up (0), very large PES points right (towards 90). */
export function gaugeAngle(pesValue: number): number {
  if (!Number.isFinite(pesValue)) return 90;
  const v = Math.max(0, pesValue);
  return (180 * v) / (v + 1) - 90;
}

/** Level 3: what kind of slip a typed PES shows. */
export type PesSlip = 'right' | 'inverted' | 'absolute' | 'pctQ' | 'pctP' | 'negative' | 'other';

export interface PesData {
  p0: number;
  p1: number;
  q0: number;
  q1: number;
}

const near = (a: number, b: number) => Math.abs(a - b) <= 0.011;

export function diagnosePes(typed: number, d: PesData): PesSlip {
  const pq = percentChange(d.q0, d.q1);
  const pp = percentChange(d.p0, d.p1);
  const right = round2(pq / pp);
  if (near(typed, right)) return 'right';
  if (near(typed, -right)) return 'negative';
  if (pq !== 0 && near(typed, round2(pp / pq))) return 'inverted';
  if (near(typed, round2((d.q1 - d.q0) / (d.p1 - d.p0)))) return 'absolute';
  if (near(typed, round2(pq))) return 'pctQ';
  if (near(typed, round2(pp))) return 'pctP';
  return 'other';
}

/** Level 3 reverse rounds: % change in quantity supplied from PES and % change in price. */
export type ReverseSlip = 'right' | 'divided' | 'flipped' | 'other';

export function diagnoseReverse(typed: number, pesValue: number, pctPrice: number): ReverseSlip {
  if (near(typed, round2(pesValue * pctPrice))) return 'right';
  if (near(typed, round2(pctPrice / pesValue))) return 'divided';
  if (near(typed, round2(pesValue / pctPrice))) return 'flipped';
  return 'other';
}

export const raceWon = (marks: number) => marks >= RACE_GOAL;
export const timeWon = (firstRight: number) => firstRight >= TIME_GOAL;
export const measureWon = (solved: number) => solved >= MEASURE_GOAL;
