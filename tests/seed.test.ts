import { describe, expect, it } from 'vitest';
import { drawRound, newSeed } from '../src/shared/activity/seed';

describe('random rounds from a bigger pool', () => {
  const pool = Array.from({ length: 20 }, (_, i) => i);
  it('draws the asked number of different items, the same way for the same seed', () => {
    const a = drawRound(pool, 12, 7);
    expect(a).toHaveLength(12);
    expect(new Set(a).size).toBe(12);
    expect(drawRound(pool, 12, 7)).toEqual(a);
  });
  it('different seeds give different mixes', () => {
    const mixes = new Set(Array.from({ length: 10 }, (_, s) => [...drawRound(pool, 12, s + 1)].sort((x, y) => x - y).join(',')));
    expect(mixes.size).toBeGreaterThan(1);
  });
  it('always keeps the items that must be in the round', () => {
    for (let s = 1; s < 30; s++) {
      const r = drawRound(pool, 10, s, (x) => x < 6);
      expect(r).toHaveLength(10);
      for (let k = 0; k < 6; k++) expect(r).toContain(k);
    }
  });
  it('never asks for more than the pool holds', () => {
    expect(drawRound(pool, 50, 3)).toHaveLength(20);
  });
  it('a new seed is a whole number from 1 up', () => {
    for (let i = 0; i < 50; i++) {
      const s = newSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(1);
    }
  });
});
