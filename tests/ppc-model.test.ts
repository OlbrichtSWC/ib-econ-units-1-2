import { describe, expect, it } from 'vitest';
import { opportunityCostPattern, opportunityCosts, ppcPosition } from '../src/econ/calc';
import { CONSTANT, INCREASING, output, ppc, scale } from '../src/activities/ppc-explorer/model';

describe('PPC Explorer island model', () => {
  it('the island PPC runs from 55 timber to 55 fish', () => {
    const s = ppc(INCREASING);
    expect(s[0]).toEqual({ x: 0, y: 55 });
    expect(s[s.length - 1]).toEqual({ x: 55, y: 0 });
  });
  it('shows increasing opportunity cost: each extra fish costs more timber', () => {
    const s = ppc(INCREASING);
    expect(opportunityCostPattern(s)).toBe('increasing');
    expect(opportunityCosts(s)[0]).toBeCloseTo(0.1, 10); // first worker: 10 fish for 1 timber
    expect(opportunityCosts(s)[9]).toBeCloseTo(10, 10); // last worker: 1 fish for 10 timber
  });
  it('constant mode gives a straight-line PPC', () => {
    expect(opportunityCostPattern(ppc(CONSTANT))).toBe('constant');
  });
  it('unemployed workers put the economy inside the PPC', () => {
    const o = output({ workers: INCREASING, employed: 7, fishers: 4 });
    expect(ppcPosition(ppc(INCREASING), o.fish, o.timber)).toBe('inside');
  });
  it('full employment puts the economy on the PPC', () => {
    for (let k = 0; k <= 10; k++) {
      const o = output({ workers: INCREASING, employed: 10, fishers: k });
      expect(ppcPosition(ppc(INCREASING), o.fish, o.timber)).toBe('on');
    }
  });
  it('better fishing technology lets the economy reach points outside the old PPC', () => {
    const better = scale(INCREASING, 1.5, 1);
    const o = output({ workers: better, employed: 10, fishers: 5 });
    expect(ppcPosition(ppc(INCREASING), o.fish, o.timber)).toBe('outside');
  });
});
