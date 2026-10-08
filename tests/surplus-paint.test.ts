import { describe, expect, it } from 'vitest';
import { DEMAND, SUPPLY, surplusShapes, shoelace } from '../src/activities/surplus-shader/model';
import {
  brushCells, cellAt, GRID, inside, PAINT_GOAL, PAINT_TASKS, paintMistakes, paintScore, PASS_SCORE, targetCells,
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
