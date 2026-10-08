import { describe, expect, it } from 'vitest';
import content from '../public/content/activities/market-shock.json';
import { equilibrium, priceAt } from '../src/econ/calc';
import {
  BASE_D, BASE_S, buildDeck, checkPrediction, dragDirection, expectedOutcome, gapAtPrice, marketOutcome, outcomeWords,
  parseShift, priceStep, segment, Shift, shiftedMarket, SHIFT_SIZE, snapDrag, toShift,
} from '../src/activities/market-shock/model';

describe('Market Shock: the base market', () => {
  it('demand and supply cross at $5 and 50 bags', () => {
    // D: $9 at 10 bags to $1 at 90 bags (falls $0.10 per bag). S: $1 at 10 to $9 at 90.
    // 9 - 0.1(q - 10) = 1 + 0.1(q - 10)  =>  q = 50, p = 5
    const e = equilibrium(BASE_D, BASE_S);
    expect(e.q).toBeCloseTo(50, 10);
    expect(e.p).toBeCloseTo(5, 10);
  });
});

describe('Market Shock: checking predictions', () => {
  it('right answer', () => expect(checkPrediction('D-right', 'D-right')).toBe('right'));
  it('right curve, wrong direction', () => expect(checkPrediction('S-right', 'S-left')).toBe('wrong-direction'));
  it('wrong curve', () => expect(checkPrediction('D-left', 'S-left')).toBe('wrong-curve'));
  it('said no shift when a curve shifts', () => expect(checkPrediction('none', 'D-left')).toBe('missed-shift'));
  it('said shift on a trap card', () => expect(checkPrediction('D-left', 'none')).toBe('movement-not-shift'));
  it('trap card answered correctly', () => expect(checkPrediction('none', 'none')).toBe('right'));
  it('parses and builds shift codes', () => {
    expect(parseShift('S-left')).toEqual({ side: 'supply', dir: 'left' });
    expect(parseShift('D-right')).toEqual({ side: 'demand', dir: 'right' });
    expect(toShift('supply', 'right')).toBe('S-right');
  });
});

describe('Market Shock: dragging', () => {
  it('small drags do not count yet', () => {
    expect(dragDirection(4)).toBeNull();
    expect(dragDirection(-4)).toBeNull();
  });
  it('a drag of 6 bags or more has a direction', () => {
    expect(dragDirection(6)).toBe('right');
    expect(dragDirection(-12)).toBe('left');
  });
  it('snaps to a 2-bag grid and stays within 30 bags', () => {
    expect(snapDrag(7.2)).toBe(8); // 7.2 / 2 = 3.6 -> 4 -> 8
    expect(snapDrag(-41)).toBe(-30);
    expect(snapDrag(0.4)).toBe(0);
  });
});

describe('Market Shock: new equilibrium after each shift', () => {
  const cases: [Shift, number, number][] = [
    // Demand right 20: 9 - 0.1(q - 30) = 1 + 0.1(q - 10) => 0.2q = 12 => q = 60, p = 6
    ['D-right', 60, 6],
    // Demand left 20: 9 - 0.1(q + 10) = 1 + 0.1(q - 10) => 0.2q = 8 => q = 40, p = 4
    ['D-left', 40, 4],
    // Supply right 20: 9 - 0.1(q - 10) = 1 + 0.1(q - 30) => 0.2q = 12 => q = 60, p = 4
    ['S-right', 60, 4],
    // Supply left 20: 9 - 0.1(q - 10) = 1 + 0.1(q + 10) => 0.2q = 8 => q = 40, p = 6
    ['S-left', 40, 6],
  ];
  for (const [s, q, p] of cases) {
    it(`${s}: new equilibrium ${q} bags at $${p}, matching theory`, () => {
      const { side, dir } = parseShift(s);
      const m = shiftedMarket(side, dir === 'right' ? SHIFT_SIZE : -SHIFT_SIZE);
      const o = marketOutcome(BASE_D, BASE_S, m.demand, m.supply);
      expect(o.e2.q).toBeCloseTo(q, 10);
      expect(o.e2.p).toBeCloseTo(p, 10);
      expect({ price: o.price, quantity: o.quantity }).toEqual(expectedOutcome(s));
    });
  }
  it('expected outcomes from theory', () => {
    expect(expectedOutcome('D-right')).toEqual({ price: 'rises', quantity: 'rises' });
    expect(expectedOutcome('S-left')).toEqual({ price: 'rises', quantity: 'falls' });
    expect(expectedOutcome('S-right')).toEqual({ price: 'falls', quantity: 'rises' });
    expect(expectedOutcome('D-left')).toEqual({ price: 'falls', quantity: 'falls' });
  });
  it('a shift leaves the other curve unchanged', () => {
    const m = shiftedMarket('supply', -20);
    expect(m.demand).toEqual(BASE_D);
    expect(m.supply.a).toEqual({ q: -10, p: 1 });
  });
  it('summary in words', () => {
    expect(outcomeWords({ price: 'rises', quantity: 'falls' })).toBe('Equilibrium price rises and equilibrium quantity falls.');
    expect(outcomeWords({ price: 'no change', quantity: 'rises' })).toBe('Equilibrium price does not change and equilibrium quantity rises.');
  });
});

describe('Market Shock: gap at the old price (price mechanism)', () => {
  it('demand right 20: shortage of 20 at $5', () => {
    // At $5: new Qd = 70 (old 50 + 20), Qs = 50 -> excess demand 20
    const m = shiftedMarket('demand', 20);
    const g = gapAtPrice(m.demand, m.supply, 5);
    expect(g.qd).toBeCloseTo(70, 10);
    expect(g.qs).toBeCloseTo(50, 10);
    expect(g.kind).toBe('shortage');
    expect(g.size).toBeCloseTo(20, 10);
  });
  it('supply right 20: surplus of 20 at $5', () => {
    // At $5: Qd = 50, new Qs = 70 -> excess supply 20
    const m = shiftedMarket('supply', 20);
    const g = gapAtPrice(m.demand, m.supply, 5);
    expect(g.kind).toBe('surplus');
    expect(g.size).toBeCloseTo(20, 10);
  });
  it('no gap at equilibrium', () => {
    expect(gapAtPrice(BASE_D, BASE_S, 5).kind).toBe('none');
  });
  it('the price moves from P1 to P2 and stops there', () => {
    expect(priceStep(5, 6, 0)).toBe(5);
    expect(priceStep(5, 6, 0.5)).toBeCloseTo(5.75, 10); // 1 - 0.5^2 = 0.75 of the way
    expect(priceStep(5, 6, 1)).toBe(6);
    expect(priceStep(5, 6, 2)).toBe(6);
  });
  it('the gap closes as the price reaches the new equilibrium', () => {
    const m = shiftedMarket('demand', 20);
    expect(gapAtPrice(m.demand, m.supply, 5.5).size).toBeCloseTo(10, 10); // Qd 65, Qs 55
    expect(gapAtPrice(m.demand, m.supply, 6).kind).toBe('none');
  });
});

describe('Market Shock: drawing segments', () => {
  it('base demand runs from $9 to $1', () => {
    expect(segment(BASE_D)).toEqual([{ q: 10, p: 9 }, { q: 90, p: 1 }]);
  });
  it('a curve shifted left is cut at the price axis', () => {
    // Supply left 20: at $1, q = -10, so cut at q = 0 where p = 1 + 0.1 x 10 = 2
    const s = segment(shiftedMarket('supply', -20).supply);
    expect(s[0].q).toBe(0);
    expect(s[0].p).toBeCloseTo(2, 10);
    expect(priceAt(BASE_S, 10)).toBeCloseTo(1, 10);
  });
  it('a curve shifted right is cut at the right edge', () => {
    // Demand right 40: at $1, q = 130 > 120, cut at q = 120 where p = 9 - 0.1 x (120 - 50) = 2
    const s = segment(shiftedMarket('demand', 40).demand);
    expect(s[1].q).toBe(120);
    expect(s[1].p).toBeCloseTo(2, 10);
  });
});

describe('Market Shock: dealing the deck', () => {
  it('normal mode deals shift cards only', () => {
    expect(buildDeck(['a', 'b', 'c'], ['t1', 't2'], false)).toEqual(['a', 'b', 'c']);
  });
  it('trap mode alternates trap and shift cards', () => {
    expect(buildDeck(['a', 'b', 'c'], ['t1', 't2'], true)).toEqual(['t1', 'a', 't2', 'b', 'c']);
  });
  it('a new seed rotates the deck', () => {
    expect(buildDeck(['a', 'b', 'c'], [], false, 1)).toEqual(['b', 'c', 'a']);
  });
});

describe('Market Shock: content', () => {
  const cards = content.try.cards as unknown as { answer: Shift; determinant: string; mechanism: { answer: string } }[];
  it('has 14 to 18 shift cards and every answer is a real shift', () => {
    expect(cards.length).toBeGreaterThanOrEqual(14);
    expect(cards.length).toBeLessThanOrEqual(18);
    for (const c of cards) {
      expect(['D-left', 'D-right', 'S-left', 'S-right']).toContain(c.answer);
      expect(['signalling', 'incentive', 'rationing']).toContain(c.mechanism.answer);
    }
  });
  it('covers every non-price determinant in the guide', () => {
    const all = cards.map((c) => c.determinant.toLowerCase()).join(' | ');
    for (const k of ['income (normal', 'income (inferior', 'tastes', 'demand: future price', 'substitute', 'complement', 'number of consumers',
      'factors of production', 'joint supply', 'competitive supply', 'indirect tax', 'subsidy', 'supply: future price', 'technology', 'number of firms']) {
      expect(all).toContain(k);
    }
  });
  it('trap cards all have the answer "no shift"', () => {
    for (const t of content.try.traps) expect(t.answer).toBe('none');
  });
});
