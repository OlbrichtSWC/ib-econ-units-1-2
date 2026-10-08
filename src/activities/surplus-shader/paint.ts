/**
 * "Paint the surplus": the student paints an area on a grid laid over the diagram,
 * and the app scores how well the painting matches the true area.
 *
 * The plot is split into GRID × GRID cells. A cell belongs to the true area when its
 * centre lies inside the area's shape. The score is the overlap divided by everything
 * painted or in the area (intersection over union), so painting too much and too little
 * both lower it.
 */
import type { Pt } from '../../econ/calc';
import type { Ask } from './model';

export const GRID = 40;
/** Score needed for a painting to count towards the Surplus Painter stamp. */
export const PASS_SCORE = 85;
/** Different areas that must be painted well to earn the stamp. */
export const PAINT_GOAL = 3;

/** What to paint. Community surplus is consumer and producer surplus together. */
export type PaintAsk = Ask | 'community';

export interface PaintTask {
  id: string;
  price: number;
  ask: PaintAsk;
  /** Demand and supply shift steps (see shiftedMarket). Missing = the original market. */
  shift?: [number, number];
}

/** Level 1 tasks, in order. Prices: $50 is equilibrium, $35 a maximum price, $70 a minimum price. */
export const PAINT_TASKS: PaintTask[] = [
  { id: 'cs-eq', price: 50, ask: 'cs' },
  { id: 'ps-eq', price: 50, ask: 'ps' },
  { id: 'wl-floor', price: 70, ask: 'wl' },
  { id: 'cs-ceiling', price: 35, ask: 'cs' },
  { id: 'ps-floor', price: 70, ask: 'ps' },
  { id: 'wl-ceiling', price: 35, ask: 'wl' },
];

/**
 * Level 2: the market has shifted first. Demand right one step: equilibrium $55 and 500 passes.
 * Supply left one step: equilibrium $55 and 350 passes.
 */
export const PAINT_TASKS_2: PaintTask[] = [
  { id: 'l2-cs-dright', price: 55, ask: 'cs', shift: [1, 0] },
  { id: 'l2-ps-sleft', price: 55, ask: 'ps', shift: [0, -1] },
  { id: 'l2-wl-floor-dright', price: 70, ask: 'wl', shift: [1, 0] },
  { id: 'l2-cs-ceiling-sleft', price: 45, ask: 'cs', shift: [0, -1] },
  { id: 'l2-ps-ceiling-dright', price: 45, ask: 'ps', shift: [1, 0] },
  { id: 'l2-wl-floor-sleft', price: 70, ask: 'wl', shift: [0, -1] },
];

/** Level 3: community surplus, no Qd and Qs markers, and a stricter score. */
export const PAINT_TASKS_3: PaintTask[] = [
  { id: 'l3-community-ceiling', price: 35, ask: 'community' },
  { id: 'l3-wl-ceiling-sleft', price: 45, ask: 'wl', shift: [0, -1] },
  { id: 'l3-community-floor-dright', price: 70, ask: 'community', shift: [1, 0] },
  { id: 'l3-cs-floor', price: 70, ask: 'cs' },
  { id: 'l3-ps-ceiling-dright', price: 45, ask: 'ps', shift: [1, 0] },
  { id: 'l3-community-eq-sleft', price: 55, ask: 'community', shift: [0, -1] },
];

export interface PaintLevel {
  tasks: PaintTask[];
  /** Score needed to count a painting. */
  pass: number;
  /** Show dots where the price line meets demand and supply. */
  markers: boolean;
  /** Wrong checks before the dashed outline and "Show me" appear. */
  helpAfter: number;
}

export const PAINT_LEVELS: PaintLevel[] = [
  { tasks: PAINT_TASKS, pass: PASS_SCORE, markers: true, helpAfter: 2 },
  { tasks: PAINT_TASKS_2, pass: PASS_SCORE, markers: true, helpAfter: 2 },
  { tasks: PAINT_TASKS_3, pass: 92, markers: false, helpAfter: 3 },
];

/** The cells of the area a task asks for. Community surplus joins consumer and producer surplus. */
export function taskCells(shapes: { cs: Pt[]; ps: Pt[]; wl: Pt[] }, ask: PaintAsk, xMax: number, yMax: number): Set<number> {
  if (ask === 'community') {
    const out = targetCells(shapes.cs, xMax, yMax);
    targetCells(shapes.ps, xMax, yMax).forEach((c) => out.add(c));
    return out;
  }
  return targetCells(ask === 'cs' ? shapes.cs : ask === 'ps' ? shapes.ps : shapes.wl, xMax, yMax);
}

export function cellIndex(col: number, row: number): number {
  return row * GRID + col;
}

/** The cell (column from the left, row from the bottom) that contains a data point, or null outside the plot. */
export function cellAt(pt: Pt, xMax: number, yMax: number): { col: number; row: number } | null {
  const col = Math.floor((pt.q / xMax) * GRID);
  const row = Math.floor((pt.p / yMax) * GRID);
  if (col < 0 || row < 0 || col >= GRID || row >= GRID) return null;
  return { col, row };
}

/** The data point at the centre of a cell. */
export function cellCentre(col: number, row: number, xMax: number, yMax: number): Pt {
  return { q: ((col + 0.5) / GRID) * xMax, p: ((row + 0.5) / GRID) * yMax };
}

/** Ray casting: true if the point is inside the polygon. */
export function inside(pt: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.p > pt.p !== b.p > pt.p && pt.q < ((b.q - a.q) * (pt.p - a.p)) / (b.p - a.p) + a.q) hit = !hit;
  }
  return hit;
}

/** The cells whose centres lie inside a shape. */
export function targetCells(poly: Pt[], xMax: number, yMax: number): Set<number> {
  const out = new Set<number>();
  if (poly.length < 3) return out;
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (inside(cellCentre(col, row, xMax, yMax), poly)) out.add(cellIndex(col, row));
    }
  }
  return out;
}

/** The cells a brush covers: size 1 is one cell, size 3 is a 3 × 3 block. */
export function brushCells(col: number, row: number, size: 1 | 3): number[] {
  const r = size === 3 ? 1 : 0;
  const out: number[] = [];
  for (let dr = -r; dr <= r; dr++) {
    for (let dc = -r; dc <= r; dc++) {
      const c = col + dc, rr = row + dr;
      if (c >= 0 && rr >= 0 && c < GRID && rr < GRID) out.push(cellIndex(c, rr));
    }
  }
  return out;
}

/** Match score from 0 to 100: overlap ÷ (painted or target). */
export function paintScore(painted: Set<number>, target: Set<number>): number {
  let both = 0;
  painted.forEach((c) => target.has(c) && both++);
  const union = painted.size + target.size - both;
  return union === 0 ? 0 : Math.round((both / union) * 100);
}

/** Cells painted outside the area, and cells of the area left unpainted. */
export function paintMistakes(painted: Set<number>, target: Set<number>): { extra: number; missed: number } {
  let extra = 0, missed = 0;
  painted.forEach((c) => !target.has(c) && extra++);
  target.forEach((c) => !painted.has(c) && missed++);
  return { extra, missed };
}
