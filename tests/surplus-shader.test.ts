import { describe, expect, it } from 'vitest';
import { equilibrium, welfareAtPrice } from '../src/econ/calc';
import {
  checkAnswer, correctValue, DEMAND, shiftedMarket, shoelace, slips, snapPrice, sumPieces, SUPPLY, surplusShapes, working,
} from '../src/activities/surplus-shader/model';

const M = { demand: DEMAND, supply: SUPPLY };

describe('Surplus Shader ski hill market', () => {
  it('equilibrium is 400 passes at $50', () => {
    // Demand: 90 - 0.1Q. Supply: 30 + 0.05Q. 90 - 0.1Q = 30 + 0.05Q -> Q = 400, P = 50.
    const e = equilibrium(DEMAND, SUPPLY);
    expect(e.q).toBeCloseTo(400, 9);
    expect(e.p).toBeCloseTo(50, 9);
  });

  it('every shifted market has a whole-dollar equilibrium', () => {
    // Demand right 150: 105 - 0.1Q = 30 + 0.05Q -> Q 500, P 55. Demand left: Q 300, P 45.
    // Supply right 150: 90 - 0.1Q = 22.5 + 0.05Q -> Q 450, P 45. Supply left: Q 350, P 55.
    const cases: [number, number, number, number][] = [[1, 0, 500, 55], [-1, 0, 300, 45], [0, 1, 450, 45], [0, -1, 350, 55]];
    for (const [d, s, q, p] of cases) {
      const m = shiftedMarket(d, s);
      const e = equilibrium(m.demand, m.supply);
      expect(e.q).toBeCloseTo(q, 9);
      expect(e.p).toBeCloseTo(p, 9);
    }
  });

  it('snaps the price to whole dollars between the two price-axis intercepts', () => {
    expect(snapPrice(M, 61.4)).toBe(61);
    expect(snapPrice(M, 12)).toBe(30); // supply starts at $30
    expect(snapPrice(M, 99)).toBe(90); // demand starts at $90
    expect(snapPrice(shiftedMarket(0, 1), 10)).toBe(23); // supply now starts at $22.50
    expect(snapPrice(M, 61.4, 0.5)).toBe(61.5);
  });
});

describe('Surplus shapes match welfareAtPrice (shoelace formula)', () => {
  const prices = [31, 38, 45, 49.5, 50, 50.5, 60, 74, 89];
  for (const price of prices) {
    it(`at $${price}`, () => {
      const s = surplusShapes(M, price);
      const w = welfareAtPrice(DEMAND, SUPPLY, price);
      expect(s.q).toBeCloseTo(w.quantity, 9);
      expect(shoelace(s.cs)).toBeCloseTo(w.consumerSurplus, 6);
      expect(shoelace(s.ps)).toBeCloseTo(w.producerSurplus, 6);
      expect(s.wl.length ? shoelace(s.wl) : 0).toBeCloseTo(w.welfareLoss, 6);
      const wk = working(M, price);
      expect(sumPieces(wk.cs)).toBeCloseTo(w.consumerSurplus, 6);
      expect(sumPieces(wk.ps)).toBeCloseTo(w.producerSurplus, 6);
      expect(sumPieces(wk.wl)).toBeCloseTo(w.welfareLoss, 6);
    });
  }
  it('also in shifted markets', () => {
    for (const [d, s] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) {
      const m = shiftedMarket(d, s);
      for (const price of [35, 45, 55, 70]) {
        const sh = surplusShapes(m, price);
        const w = welfareAtPrice(m.demand, m.supply, price);
        expect(shoelace(sh.cs)).toBeCloseTo(w.consumerSurplus, 6);
        expect(shoelace(sh.ps)).toBeCloseTo(w.producerSurplus, 6);
        expect(sh.wl.length ? shoelace(sh.wl) : 0).toBeCloseTo(w.welfareLoss, 6);
      }
    }
  });
  it('at the supply intercept nothing is traded and the whole community surplus is lost', () => {
    const s = surplusShapes(M, 30);
    expect(s.q).toBe(0);
    expect(s.cs).toEqual([]);
    expect(s.ps).toEqual([]);
    expect(shoelace(s.wl)).toBeCloseTo(12000, 6); // ½ × 400 × (90 - 30)
  });
});

describe('IB working, hand-checked', () => {
  it('at equilibrium: CS = ½ × 400 × 40 = 8000, PS = ½ × 400 × 20 = 4000, no welfare loss', () => {
    const w = working(M, 50);
    expect(w.cs).toEqual([{ kind: 'triangle', base: 400, top: 90, bottom: 50, value: 8000 }]);
    expect(w.ps).toEqual([{ kind: 'triangle', base: 400, top: 50, bottom: 30, value: 4000 }]);
    expect(w.wl).toEqual([]);
  });
  it('at $60 (above): Q = 300; CS = ½ × 300 × 30 = 4500; PS = 15 × 300 + ½ × 300 × 15 = 6750; WL = ½ × 100 × 15 = 750', () => {
    const w = working(M, 60);
    expect(sumPieces(w.cs)).toBeCloseTo(4500, 9);
    expect(w.ps.map((p) => p.kind)).toEqual(['rectangle', 'triangle']);
    expect(w.ps[0].value).toBeCloseTo(4500, 9);
    expect(w.ps[1].value).toBeCloseTo(2250, 9);
    expect(w.wl[0].base).toBeCloseTo(100, 9);
    expect(w.wl[0].value).toBeCloseTo(750, 9);
  });
  it('at $38 (below): Qs = 160; CS = 36 × 160 + ½ × 160 × 16 = 7040; PS = ½ × 160 × 8 = 640; WL = ½ × 240 × 36 = 4320', () => {
    const w = working(M, 38);
    expect(w.cs[0].value).toBeCloseTo(5760, 9);
    expect(w.cs[1].value).toBeCloseTo(1280, 9);
    expect(sumPieces(w.ps)).toBeCloseTo(640, 9);
    expect(w.wl[0].top).toBeCloseTo(74, 9);
    expect(w.wl[0].bottom).toBeCloseTo(38, 9);
    expect(sumPieces(w.wl)).toBeCloseTo(4320, 9);
  });
  it('at $74 (above): Qd = 160; CS = ½ × 160 × 16 = 1280; PS = 36 × 160 + ½ × 160 × 8 = 6400', () => {
    expect(correctValue(M, 74, 'cs')).toBeCloseTo(1280, 9);
    expect(correctValue(M, 74, 'ps')).toBeCloseTo(6400, 9);
    expect(correctValue(M, 74, 'wl')).toBeCloseTo(4320, 9);
  });
});

describe('Calculate it: checking answers and spotting slips', () => {
  it('accepts the right answer, within $1', () => {
    expect(checkAnswer(M, 74, 'cs', 1280)).toEqual({ ok: true });
    expect(checkAnswer(M, 74, 'cs', 1280.6)).toEqual({ ok: true });
    expect(checkAnswer(M, 38, 'cs', 7040)).toEqual({ ok: true });
    expect(checkAnswer(M, 38, 'wl', 4320)).toEqual({ ok: true });
  });
  it('CS at $74: forgot ½ (2560), height from 0 (½ × 160 × 90 = 7200), used equilibrium (8000), used Qs as base (½ × 880 × 16 = 7040)', () => {
    expect(checkAnswer(M, 74, 'cs', 2560)).toEqual({ ok: false, slip: 'noHalf' });
    expect(checkAnswer(M, 74, 'cs', 7200)).toEqual({ ok: false, slip: 'heightFromZero' });
    expect(checkAnswer(M, 74, 'cs', 8000)).toEqual({ ok: false, slip: 'equilibrium' });
    expect(checkAnswer(M, 74, 'cs', 7040)).toEqual({ ok: false, slip: 'longSide' });
    expect(checkAnswer(M, 74, 'cs', 1234)).toEqual({ ok: false, slip: null });
  });
  it('CS at $38: one big triangle (½ × 160 × 52 = 4160), rectangle only (5760), triangle only (1280), forgot ½ (8320)', () => {
    expect(checkAnswer(M, 38, 'cs', 4160)).toEqual({ ok: false, slip: 'oneTriangle' });
    expect(checkAnswer(M, 38, 'cs', 5760)).toEqual({ ok: false, slip: 'rectOnly' });
    expect(checkAnswer(M, 38, 'cs', 1280)).toEqual({ ok: false, slip: 'triOnly' });
    expect(checkAnswer(M, 38, 'cs', 8320)).toEqual({ ok: false, slip: 'noHalf' });
  });
  it('welfare loss at $38: forgot ½ (8640), height to Pe (½ × 240 × 12 = 1440), height from Pe to demand (½ × 240 × 24 = 2880)', () => {
    expect(checkAnswer(M, 38, 'wl', 8640)).toEqual({ ok: false, slip: 'noHalf' });
    expect(checkAnswer(M, 38, 'wl', 1440)).toEqual({ ok: false, slip: 'heightToPe' });
    expect(checkAnswer(M, 38, 'wl', 2880)).toEqual({ ok: false, slip: 'heightOther' });
  });
  it('a slip is never reported when it gives the right answer', () => {
    // At $70: Q traded 200 = Qe - Q, so "wrong base" gives the right number and must not be flagged.
    const right = correctValue(M, 70, 'wl'); // ½ × 200 × (70 - 40) = 3000
    expect(right).toBeCloseTo(3000, 9);
    expect(slips(M, 70, 'wl').find((s) => s.id === 'wrongBase')!.value).toBeCloseTo(3000, 9);
    expect(checkAnswer(M, 70, 'wl', 3000)).toEqual({ ok: true });
  });
});
