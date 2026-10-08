import { describe, expect, it } from 'vitest';
import { equilibrium } from '../src/econ/calc';
import { DEMAND, shiftedMarket, SUPPLY, surplusShapes, shoelace } from '../src/activities/surplus-shader/model';
import {
  brushCells, cellAt, GRID, inside, PAINT_GOAL, PAINT_LEVELS, PAINT_TASKS, PAINT_TASKS_2, PAINT_TASKS_3, paintMistakes, paintScore, PASS_SCORE, targetCells,
  taskCells,
} from '../src/activities/surplus-shader/paint';

const X = 900, Y = 110;
const m = { demand: DEMAND, supply: SUPPLY };
const cellArea = (X / GRID) * (Y / GRID);

describe('Paint the surplus', () => {
  it('finds points inside and outside a triangle', () => {
    const tri = [{ q: 0, p: 0 }, { q: 10, p: 0 }, { q: 0, p: 10 }];
    expect(inside({ q: 2, p: 2 }, tri)).toBe(true);
    expect(inside({ q: 8, p: 8 }, tri)).toBe(false);
  });

  it('the target cells cover about the same area as the true shape (within 15%, the grid is coarse)', () => {
    for (const t of PAINT_TASKS) {
      const s = surplusShapes(m, t.price);
      const poly = t.ask === 'cs' ? s.cs : t.ask === 'ps' ? s.ps : s.wl;
      const cells = targetCells(poly, X, Y);
      const area = shoelace(poly);
      expect(cells.size).toBeGreaterThan(8);
      expect(Math.abs(cells.size * cellArea - area) / area).toBeLessThan(0.15);
    }
  });

  it('a perfect painting scores 100, nothing scores 0', () => {
    const target = targetCells(surplusShapes(m, 50).cs, X, Y);
    expect(paintScore(new Set(target), target)).toBe(100);
    expect(paintScore(new Set(), target)).toBe(0);
  });

  it('painting too much lowers the score as much as painting too little', () => {
    const target = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(paintScore(new Set([1, 2, 3, 4, 5, 6, 7, 8]), target)).toBe(80); // 2 missed
    expect(paintScore(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]), target)).toBe(77); // 3 extra: 10 / 13
    expect(paintMistakes(new Set([1, 2, 11]), target)).toEqual({ extra: 1, missed: 8 });
  });

  it('painting the whole plot does not pass', () => {
    const target = targetCells(surplusShapes(m, 50).cs, X, Y);
    const all = new Set(Array.from({ length: GRID * GRID }, (_, i) => i));
    expect(paintScore(all, target)).toBeLessThan(PASS_SCORE);
  });

  it('maps points to cells and keeps the brush inside the grid', () => {
    expect(cellAt({ q: 0, p: 0 }, X, Y)).toEqual({ col: 0, row: 0 });
    expect(cellAt({ q: 899, p: 109 }, X, Y)).toEqual({ col: GRID - 1, row: GRID - 1 });
    expect(cellAt({ q: -1, p: 5 }, X, Y)).toBeNull();
    expect(brushCells(0, 0, 3).length).toBe(4);
    expect(brushCells(5, 5, 3).length).toBe(9);
    expect(brushCells(5, 5, 1)).toEqual([5 * GRID + 5]);
  });

  it('there are enough different tasks to earn the stamp', () => {
    expect(new Set(PAINT_TASKS.map((t) => t.id)).size).toBeGreaterThanOrEqual(PAINT_GOAL);
  });
});

describe('Paint the surplus: Levels 2 and 3', () => {
  it('three levels, with a stricter score and no markers in Level 3', () => {
    expect(PAINT_LEVELS).toHaveLength(3);
    expect(PAINT_LEVELS[0].tasks).toBe(PAINT_TASKS);
    expect(PAINT_LEVELS[2].pass).toBeGreaterThan(PAINT_LEVELS[1].pass);
    expect(PAINT_LEVELS[2].markers).toBe(false);
    for (const lv of PAINT_LEVELS) expect(lv.tasks.length).toBeGreaterThanOrEqual(PAINT_GOAL);
  });

  it('Level 2 markets: demand right one step gives $55 and 500 passes; supply left one step gives $55 and 350', () => {
    expect(equilibrium(shiftedMarket(1, 0).demand, shiftedMarket(1, 0).supply)).toEqual({ q: 500, p: 55 });
    const s = shiftedMarket(0, -1);
    const e = equilibrium(s.demand, s.supply);
    expect(e.q).toBeCloseTo(350, 9);
    expect(e.p).toBeCloseTo(55, 9);
  });

  it('every Level 2 and 3 task has an area big enough to paint, matching the true area', () => {
    for (const t of [...PAINT_TASKS_2, ...PAINT_TASKS_3]) {
      const mk = t.shift ? shiftedMarket(t.shift[0], t.shift[1]) : m;
      const s = surplusShapes(mk, t.price);
      const cells = taskCells(s, t.ask, X, Y);
      const area = t.ask === 'community' ? shoelace(s.cs) + shoelace(s.ps) : shoelace(t.ask === 'cs' ? s.cs : t.ask === 'ps' ? s.ps : s.wl);
      expect(cells.size, t.id).toBeGreaterThan(8);
      expect(Math.abs(cells.size * cellArea - area) / area, t.id).toBeLessThan(0.15);
    }
  });

  it('community surplus is consumer surplus and producer surplus together', () => {
    const s = surplusShapes(m, 35);
    const all = taskCells(s, 'community', X, Y);
    const cs = targetCells(s.cs, X, Y), ps = targetCells(s.ps, X, Y);
    cs.forEach((c) => expect(all.has(c)).toBe(true));
    ps.forEach((c) => expect(all.has(c)).toBe(true));
    expect(all.size).toBeLessThanOrEqual(cs.size + ps.size);
  });

  it('task ids are unique across all levels', () => {
    const ids = PAINT_LEVELS.flatMap((l) => l.tasks.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
