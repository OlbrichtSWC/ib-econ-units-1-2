import { describe, expect, it } from 'vitest';
import {
  adValoremTax, classifyPed, classifyYed, elasticity, equilibrium, floorBuyUpCost, intersect, Line,
  opportunityCostPattern, opportunityCosts, ped, pedAtPoint, percentChange, pes, ppcMaxY, ppcPosition,
  priceAt, priceCeiling, priceFloor, quantityAt, revenueChange, round, specificSubsidy, specificTax,
  totalRevenue, triangleArea, welfareAtPrice, yed, pctQuantityFromPed,
} from '../src/econ/calc';

// Worked example used throughout (invented numbers):
// Demand passes through (Q 0, P $10) and (Q 100, P $0).
// Supply passes through (Q 0, P $2) and (Q 80, P $10).
// Equilibrium: Q = 40, P = $6.
const D: Line = { a: { q: 0, p: 10 }, b: { q: 100, p: 0 } };
const S: Line = { a: { q: 0, p: 2 }, b: { q: 80, p: 10 } };

describe('Percentage change', () => {
  it('rise from 4 to 5 is +25%', () => expect(percentChange(4, 5)).toBe(25));
  it('fall from 5 to 4 is -20%', () => expect(percentChange(5, 4)).toBe(-20));
  it('no change is 0%', () => expect(percentChange(7, 7)).toBe(0));
  it('refuses an original value of 0', () => expect(() => percentChange(0, 5)).toThrow());
});

describe('PED', () => {
  it('price $4 to $5, quantity 100 to 80 gives PED -0.8 (inelastic)', () => {
    const v = ped(4, 100, 5, 80);
    expect(v).toBeCloseTo(-0.8, 10);
    expect(classifyPed(v)).toBe('inelastic');
  });
  it('price $10 to $9, quantity 50 to 60 gives PED -2 (elastic)', () => {
    const v = ped(10, 50, 9, 60);
    expect(v).toBeCloseTo(-2, 10);
    expect(classifyPed(v)).toBe('elastic');
  });
  it('equal percentage changes give unitary PED', () => {
    expect(classifyPed(ped(10, 100, 11, 90))).toBe('unitary');
  });
  it('no change in quantity is perfectly inelastic', () => {
    expect(classifyPed(ped(10, 100, 12, 100))).toBe('perfectly inelastic');
  });
  it('rearranged: PED -1.5 and a 10% price rise means a 15% fall in quantity', () => {
    expect(pctQuantityFromPed(-1.5, 10)).toBeCloseTo(-15, 10);
  });
  it('elasticity refuses a zero change in the cause', () => {
    expect(() => elasticity(10, 0)).toThrow();
  });
});

describe('YED', () => {
  it('income $50 000 to $55 000, quantity 10 to 9 gives YED -1 (inferior)', () => {
    const v = yed(50000, 10, 55000, 9);
    expect(v).toBeCloseTo(-1, 10);
    expect(classifyYed(v)).toBe('inferior');
  });
  it('YED 0.5 is a necessity', () => {
    const v = yed(100, 100, 120, 110);
    expect(v).toBeCloseTo(0.5, 10);
    expect(classifyYed(v)).toBe('normal, income inelastic (necessity)');
  });
  it('YED 2 is a luxury', () => {
    const v = yed(100, 100, 110, 120);
    expect(v).toBeCloseTo(2, 10);
    expect(classifyYed(v)).toBe('normal, income elastic (luxury)');
  });
});

describe('PES', () => {
  it('price $2 to $3, quantity supplied 100 to 200 gives PES 2', () => {
    expect(pes(2, 100, 3, 200)).toBeCloseTo(2, 10);
  });
  it('price $2 to $3, quantity supplied 100 to 120 gives PES 0.4', () => {
    expect(pes(2, 100, 3, 120)).toBeCloseTo(0.4, 10);
  });
});

describe('Total revenue', () => {
  it('TR = P x Q', () => expect(totalRevenue(4.5, 120)).toBe(540));
  it('splits a price rise into price and quantity effects', () => {
    const r = revenueChange(4, 100, 5, 80);
    expect(r.tr1).toBe(400);
    expect(r.tr2).toBe(400);
    expect(r.change).toBe(0);
    expect(r.priceEffect).toBe(80); // ($5 - $4) x 80
    expect(r.quantityEffect).toBe(-80); // $4 x (80 - 100)
  });
  it('splits a price cut without overlapping areas', () => {
    const r = revenueChange(5, 80, 4, 100);
    expect(r.priceEffect).toBe(-80); // ($4 - $5) x 80, the units sold at both prices
    expect(r.quantityEffect).toBe(80); // $4 x (100 - 80), the extra units at the new price
    expect(r.change).toBe(0);
  });
  it('price and quantity effects always add up to the change in TR', () => {
    for (let i = 0; i < 200; i++) {
      const p1 = 1 + Math.random() * 20, p2 = 1 + Math.random() * 20;
      const q1 = Math.random() * 500, q2 = Math.random() * 500;
      const r = revenueChange(p1, q1, p2, q2);
      expect(r.priceEffect + r.quantityEffect).toBeCloseTo(r.change, 8);
    }
  });
});

describe('Straight-line curves', () => {
  it('reads price and quantity off a line', () => {
    expect(priceAt(D, 40)).toBeCloseTo(6, 10);
    expect(quantityAt(S, 6)).toBeCloseTo(40, 10);
  });
  it('finds the equilibrium Q 40, P $6', () => {
    const e = equilibrium(D, S);
    expect(e.q).toBeCloseTo(40, 10);
    expect(e.p).toBeCloseTo(6, 10);
  });
  it('parallel lines have no intersection', () => {
    expect(intersect(D, { a: { q: 0, p: 20 }, b: { q: 100, p: 10 } })).toBeNull();
  });
});

describe('PED along a straight-line demand curve (HL)', () => {
  it('is unitary at the midpoint', () => expect(pedAtPoint(D, 5)).toBeCloseTo(-1, 10));
  it('is elastic above the midpoint', () => expect(pedAtPoint(D, 8)).toBeCloseTo(-4, 10));
  it('is inelastic below the midpoint', () => expect(pedAtPoint(D, 2)).toBeCloseTo(-0.25, 10));
  it('matches the percentage-change formula for a price change starting at that point', () => {
    // From P $8 (Q 20) to P $9 (Q 10).
    expect(ped(8, 20, 9, quantityAt(D, 9))).toBeCloseTo(pedAtPoint(D, 8), 10);
  });
  it('total revenue is greatest at the midpoint, where PED = 1', () => {
    const trMid = totalRevenue(5, quantityAt(D, 5));
    for (let p = 0.5; p < 10; p += 0.5) expect(totalRevenue(p, quantityAt(D, p))).toBeLessThanOrEqual(trMid + 1e-9);
  });
});

describe('Consumer, producer and community surplus (2.3)', () => {
  it('at equilibrium: CS $80, PS $80, community surplus $160, no welfare loss', () => {
    const w = welfareAtPrice(D, S, 6);
    expect(w.quantity).toBeCloseTo(40, 10);
    expect(w.consumerSurplus).toBeCloseTo(80, 10); // 0.5 x 40 x (10 - 6)
    expect(w.producerSurplus).toBeCloseTo(80, 10); // 0.5 x 40 x (6 - 2)
    expect(w.communitySurplus).toBeCloseTo(160, 10);
    expect(w.welfareLoss).toBeCloseTo(0, 10);
    expect(w.excessDemand).toBeCloseTo(0, 10);
  });
  it('matches the IB triangle method', () => {
    expect(triangleArea(40, 4)).toBe(80);
  });
  it('price above equilibrium ($8): Q 20, CS $20, PS $100, welfare loss $40, excess supply 40', () => {
    const w = welfareAtPrice(D, S, 8);
    expect(w.quantity).toBeCloseTo(20, 10);
    expect(w.consumerSurplus).toBeCloseTo(20, 10);
    expect(w.producerSurplus).toBeCloseTo(100, 10);
    expect(w.welfareLoss).toBeCloseTo(40, 10);
    expect(w.excessDemand).toBeCloseTo(-40, 10);
  });
  it('price below equilibrium ($4): Q 20, CS $100, PS $20, welfare loss $40, excess demand 40', () => {
    const w = welfareAtPrice(D, S, 4);
    expect(w.quantity).toBeCloseTo(20, 10);
    expect(w.consumerSurplus).toBeCloseTo(100, 10);
    expect(w.producerSurplus).toBeCloseTo(20, 10);
    expect(w.welfareLoss).toBeCloseTo(40, 10);
    expect(w.excessDemand).toBeCloseTo(40, 10);
  });
  it('community surplus is greatest at the equilibrium price', () => {
    const best = welfareAtPrice(D, S, 6).communitySurplus;
    for (let p = 2.25; p < 10; p += 0.25) expect(welfareAtPrice(D, S, p).communitySurplus).toBeLessThanOrEqual(best + 1e-9);
  });
  it('community surplus plus welfare loss always equals the maximum', () => {
    for (let p = 2.25; p < 10; p += 0.25) {
      const w = welfareAtPrice(D, S, p);
      expect(w.communitySurplus + w.welfareLoss).toBeCloseTo(160, 8);
    }
  });
});

describe('Indirect taxes and subsidies (2.7 HL)', () => {
  it('specific tax of $2: Q 30, consumers pay $7, producers keep $5', () => {
    const t = specificTax(D, S, 2);
    expect(t.quantity).toBeCloseTo(30, 10);
    expect(t.consumerPrice).toBeCloseTo(7, 10);
    expect(t.producerPrice).toBeCloseTo(5, 10);
    expect(t.governmentRevenue).toBeCloseTo(60, 10);
    expect(t.consumerBurden).toBeCloseTo(30, 10);
    expect(t.producerBurden).toBeCloseTo(30, 10);
    expect(t.welfareLoss).toBeCloseTo(10, 10);
  });
  it('tax burdens add up to government revenue', () => {
    for (const tax of [0.5, 1, 3, 4.5]) {
      const t = specificTax(D, S, tax);
      expect(t.consumerBurden + t.producerBurden).toBeCloseTo(t.governmentRevenue, 8);
    }
  });
  it('ad valorem tax of 50%: Q 28, consumers pay $7.20, producers keep $4.80', () => {
    const t = adValoremTax(D, S, 0.5);
    expect(t.quantity).toBeCloseTo(28, 10);
    expect(t.consumerPrice).toBeCloseTo(7.2, 10);
    expect(t.producerPrice).toBeCloseTo(4.8, 10);
    expect(t.governmentRevenue).toBeCloseTo(67.2, 10);
    expect(t.consumerBurden).toBeCloseTo(33.6, 10);
    expect(t.producerBurden).toBeCloseTo(33.6, 10);
    expect(t.welfareLoss).toBeCloseTo(14.4, 10);
  });
  it('subsidy of $2: Q 50, consumers pay $5, producers receive $7', () => {
    const s = specificSubsidy(D, S, 2);
    expect(s.quantity).toBeCloseTo(50, 10);
    expect(s.consumerPrice).toBeCloseTo(5, 10);
    expect(s.producerPrice).toBeCloseTo(7, 10);
    expect(s.governmentSpending).toBeCloseTo(100, 10);
    expect(s.consumerGain).toBeCloseTo(45, 10);
    expect(s.producerGain).toBeCloseTo(45, 10);
    expect(s.welfareLoss).toBeCloseTo(10, 10);
  });
  it('subsidy spending = consumer gain + producer gain + welfare loss', () => {
    for (const sub of [0.5, 1, 3]) {
      const s = specificSubsidy(D, S, sub);
      expect(s.consumerGain + s.producerGain + s.welfareLoss).toBeCloseTo(s.governmentSpending, 8);
    }
  });
});

describe('Price controls (2.7)', () => {
  it('a $4 price ceiling creates a shortage of 40', () => {
    const c = priceCeiling(D, S, 4);
    expect(c.quantityDemanded).toBeCloseTo(60, 10);
    expect(c.quantitySupplied).toBeCloseTo(20, 10);
    expect(c.quantityTraded).toBeCloseTo(20, 10);
    expect(c.gap).toBeCloseTo(40, 10);
    expect(c.welfare.welfareLoss).toBeCloseTo(40, 10);
  });
  it('a ceiling above equilibrium does nothing', () => {
    expect(priceCeiling(D, S, 8).gap).toBeCloseTo(0, 10);
  });
  it('an $8 price floor creates a surplus of 40, costing $320 to buy up', () => {
    const f = priceFloor(D, S, 8);
    expect(f.gap).toBeCloseTo(40, 10);
    expect(floorBuyUpCost(D, S, 8)).toBeCloseTo(320, 10);
  });
});

describe('PPC and opportunity cost (1.1)', () => {
  const increasing = [{ x: 0, y: 100 }, { x: 10, y: 90 }, { x: 20, y: 70 }, { x: 30, y: 40 }, { x: 40, y: 0 }];
  const constant = [{ x: 0, y: 40 }, { x: 10, y: 30 }, { x: 20, y: 20 }, { x: 30, y: 10 }, { x: 40, y: 0 }];
  it('opportunity cost per extra unit of X rises: 1, 2, 3, 4', () => {
    expect(opportunityCosts(increasing)).toEqual([1, 2, 3, 4]);
    expect(opportunityCostPattern(increasing)).toBe('increasing');
  });
  it('a straight-line PPC has constant opportunity cost', () => {
    expect(opportunityCosts(constant)).toEqual([1, 1, 1, 1]);
    expect(opportunityCostPattern(constant)).toBe('constant');
  });
  it('reads the maximum Y between schedule points', () => {
    expect(ppcMaxY(increasing, 15)).toBeCloseTo(80, 10);
  });
  it('classifies points inside, on and outside the curve', () => {
    expect(ppcPosition(increasing, 20, 50)).toBe('inside');
    expect(ppcPosition(increasing, 20, 70)).toBe('on');
    expect(ppcPosition(increasing, 20, 80)).toBe('outside');
  });
});

describe('Rounding for display', () => {
  it('rounds 2.675 to 2.68', () => expect(round(2.675)).toBe(2.68));
  it('rounds to 1 decimal place', () => expect(round(-0.8000000001, 1)).toBe(-0.8));
});
