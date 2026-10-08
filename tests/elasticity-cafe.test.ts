import { describe, expect, it } from 'vitest';
import { classifyPed, pedAtPoint, ped, percentChange } from '../src/econ/calc';
import {
  bestMove, CAMPAIGN, campaignMet, cupsSold, fill, money, pedText, rangeType, salesLog, Scenario, signedMoney, signedPct, snapPrice, summarize, WeekResult, weekGrew, weekResult,
} from '../src/activities/elasticity-cafe/model';
import content from '../public/content/activities/elasticity-cafe.json';

const scenarios = (content.try as unknown as { scenarios: Scenario[] }).scenarios;
const byId = (id: string) => scenarios.find((s) => s.id === id)!;
const latte = byId('latte');
const lodge = byId('lodge');
const fizz = byId('fizz');

/** Every price on the $0.25 grid in the scenario's range. */
const grid = (s: Scenario) => {
  const out: number[] = [];
  for (let p = s.priceMin; p <= s.priceMax + 1e-9; p += 0.25) out.push(Math.round(p * 100) / 100);
  return out;
};

describe('Elasticity Café scenarios (content JSON)', () => {
  it('has at least 3 scenarios, including a mystery one', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(3);
    expect(scenarios.some((s) => s.mystery)).toBe(true);
  });

  it('each price range lies wholly on one side of unitary PED (checked at both ends)', () => {
    // Latte: line from $10 (0 cups) to 400 cups at $0. At $5.50, Q = 180 and PED = -40 x 5.5 / 180 = -1.22.
    expect(pedAtPoint(latte.demand, 5.5)).toBeCloseTo(-1.2222, 4);
    // At $8.50, Q = 60 and PED = -40 x 8.5 / 60 = -5.67.
    expect(pedAtPoint(latte.demand, 8.5)).toBeCloseTo(-5.6667, 4);
    // Lodge: line from $20 to 320 cups. At $8, Q = 192 and PED = -16 x 8 / 192 = -0.667. At $3, Q = 272, PED = -16 x 3 / 272 = -0.176.
    expect(pedAtPoint(lodge.demand, 8)).toBeCloseTo(-0.6667, 4);
    expect(pedAtPoint(lodge.demand, 3)).toBeCloseTo(-0.1765, 4);
    // Cloud Fizz: line from $12 to 240 cups. At $6.50, Q = 110 and PED = -20 x 6.5 / 110 = -1.18.
    expect(pedAtPoint(fizz.demand, 6.5)).toBeCloseTo(-1.1818, 4);
    expect(rangeType(latte)).toBe('elastic');
    expect(rangeType(lodge)).toBe('inelastic');
    expect(rangeType(fizz)).toBe('elastic');
    for (const s of scenarios) expect(rangeType(s)).not.toBe('mixed');
  });

  it('start prices are inside the range and on the $0.25 grid', () => {
    for (const s of scenarios) {
      expect(snapPrice(s, s.startPrice)).toBe(s.startPrice);
      expect(s.priceMin).toBeLessThan(s.priceMax);
    }
  });

  it('cups sold are whole numbers that fit on the diagram', () => {
    for (const s of scenarios) {
      for (const p of grid(s)) {
        const q = cupsSold(s, p);
        expect(Number.isInteger(q)).toBe(true);
        expect(q).toBeGreaterThan(0);
        expect(q).toBeLessThan(s.qMax);
        expect(p).toBeLessThanOrEqual(s.pMax);
      }
    }
    expect(cupsSold(latte, 6)).toBe(160); // 400 - 40 x 6
    expect(cupsSold(lodge, 4)).toBe(256); // 320 - 16 x 4
    expect(cupsSold(fizz, 7.5)).toBe(90); // 240 - 20 x 7.5
  });

  it('ANY price change inside the range gives a PED on the expected side of 1 (from whole cups)', () => {
    for (const s of scenarios) {
      const want = rangeType(s);
      for (const p1 of grid(s)) {
        for (const p2 of grid(s)) {
          if (p1 === p2) continue;
          const v = ped(p1, cupsSold(s, p1), p2, cupsSold(s, p2));
          expect(classifyPed(v)).toBe(want);
        }
      }
    }
  });

  it('total revenue always moves the way PED predicts', () => {
    for (const s of scenarios) {
      const elastic = rangeType(s) === 'elastic';
      for (const p1 of grid(s)) {
        for (const p2 of grid(s)) {
          if (p1 === p2) continue;
          const tr1 = p1 * cupsSold(s, p1), tr2 = p2 * cupsSold(s, p2);
          const sameWay = Math.sign(tr2 - tr1) === Math.sign(p2 - p1);
          expect(sameWay).toBe(!elastic);
        }
      }
    }
  });
});

describe('snapPrice', () => {
  it('rounds to $0.25 and clamps to the range', () => {
    expect(snapPrice(latte, 6.1)).toBe(6); // nearest quarter
    expect(snapPrice(latte, 6.2)).toBe(6.25);
    expect(snapPrice(latte, 2)).toBe(5.5); // below the minimum
    expect(snapPrice(latte, 99)).toBe(8.5); // above the maximum
  });
});

describe('salesLog', () => {
  // Latte: $6.00 -> 160 cups ($960); $7.00 -> 120 cups ($840); $7.00 again; $6.50 -> 140 cups ($910).
  const rows = salesLog(latte, [6, 7, 7, 6.5]);

  it('day 1 has no changes', () => {
    expect(rows[0]).toMatchObject({ day: 1, price: 6, cups: 160, revenue: 960, pctPrice: null, pctQuantity: null, ped: null, changeTR: null });
  });

  it('uses the previous day as the original value (IB formula)', () => {
    const r = rows[1];
    expect(r.cups).toBe(120);
    expect(r.revenue).toBe(840);
    expect(r.pctPrice).toBeCloseTo(16.6667, 4); // (7 - 6) / 6 x 100
    expect(r.pctQuantity).toBeCloseTo(-25, 10); // (120 - 160) / 160 x 100
    expect(r.ped).toBeCloseTo(-1.5, 10); // -25 / 16.667
    expect(r.changeTR).toBe(-120); // 840 - 960
    expect(r.pricePull).toBe(120); // (7 - 6) x 120
    expect(r.quantityPull).toBe(-240); // 6 x (120 - 160)
    expect(r.pricePull! + r.quantityPull!).toBe(r.changeTR);
  });

  it('a day with no price change has no PED but a change in TR of 0', () => {
    expect(rows[2].ped).toBeNull();
    expect(rows[2].pctPrice).toBe(0);
    expect(rows[2].changeTR).toBe(0);
  });

  it('a price cut: price pull is a loss, quantity pull is a gain', () => {
    const r = rows[3];
    expect(r.cups).toBe(140);
    expect(r.pctPrice).toBeCloseTo(-7.1429, 4); // (6.5 - 7) / 7 x 100
    expect(r.pctQuantity).toBeCloseTo(16.6667, 4); // (140 - 120) / 120 x 100
    expect(r.ped).toBeCloseTo(-2.3333, 4); // 16.667 / -7.143
    expect(r.pricePull).toBe(-60); // (6.5 - 7) x 120, the cups sold at both prices
    expect(r.quantityPull).toBe(130); // 6.5 x (140 - 120), the extra cups at the new lower price
    expect(r.changeTR).toBe(70); // 910 - 840
  });

  it('the PED shown agrees with the % changes shown (from whole cups)', () => {
    for (const s of scenarios) {
      const log = salesLog(s, grid(s));
      for (const r of log.slice(1)) {
        expect(r.ped!).toBeCloseTo(r.pctQuantity! / r.pctPrice!, 10);
        expect(r.pctQuantity!).toBeCloseTo(percentChange(log[r.day - 2].cups, r.cups), 10);
      }
    }
  });

  it('inelastic lodge: a price rise raises revenue', () => {
    // $4.00 -> 256 cups ($1024); $5.00 -> 240 cups ($1200).
    const [, r] = salesLog(lodge, [4, 5]);
    expect(r.revenue).toBe(1200);
    expect(r.ped).toBeCloseTo(-0.25, 10); // -6.25% / 25%
    expect(r.pricePull).toBe(240); // 1 x 240
    expect(r.quantityPull).toBe(-64); // 4 x -16
    expect(r.changeTR).toBe(176);
  });
});

describe('summarize and the end-of-week decision', () => {
  it('summarises a week of latte sales', () => {
    const sum = summarize(salesLog(latte, [6, 7, 7, 6.5]));
    expect(sum.changes).toBe(2); // day 3 had no price change
    expect(sum.opposite).toBe(2); // TR fell when price rose, rose when price fell
    expect(sum.same).toBe(0);
    expect(sum.meanAbsPed).toBeCloseTo((1.5 + 2.3333) / 2, 3);
    expect(sum.dataSays).toBe('elastic');
    expect(sum.example?.day).toBe(2); // +16.7% is the biggest price change
  });

  it('summarises a week of lodge sales', () => {
    const sum = summarize(salesLog(lodge, [4, 5, 6, 5.5]));
    expect(sum.same).toBe(3);
    expect(sum.dataSays).toBe('inelastic');
  });

  it('has no data verdict when the price never changes', () => {
    const sum = summarize(salesLog(fizz, [7.5, 7.5, 7.5]));
    expect(sum.changes).toBe(0);
    expect(sum.dataSays).toBeNull();
    expect(sum.example).toBeNull();
  });

  it('the best move for revenue', () => {
    expect(bestMove('elastic')).toBe('lower');
    expect(bestMove('inelastic')).toBe('raise');
  });
});

describe('display helpers', () => {
  it('formats money, % and PED without dashes', () => {
    expect(money(960)).toBe('$960.00');
    expect(signedMoney(-120)).toBe('−$120.00');
    expect(signedMoney(70)).toBe('+$70.00');
    expect(signedPct(16.6667)).toBe('+16.7%');
    expect(signedPct(-25)).toBe('−25.0%');
    expect(pedText(-2.33333)).toBe('−2.33');
  });
  it('fills templates', () => {
    expect(fill('PED = {ped} on Day {day}, {x}', { ped: '−1.50', day: 2 })).toBe('PED = −1.50 on Day 2, {x}');
  });
});

describe('Check it answers (hand-checked)', () => {
  it('q1: $4 to $5, 200 to 170 gives PED -0.6', () => {
    expect(ped(4, 200, 5, 170)).toBeCloseTo(-0.6, 10);
    expect(ped(5, 170, 4, 200)).not.toBeCloseTo(-0.6, 2); // wrong base gives a different answer
  });
  it('q7: new TR after a 10% rise with PED -1.5 is $1,402.50', () => {
    const q = 300 * (1 + (-1.5 * 10) / 100);
    expect(q).toBeCloseTo(255, 10);
    expect(5.5 * q).toBeCloseTo(1402.5, 10);
  });
  it('every check question has the required parts', () => {
    expect(content.check.length).toBeGreaterThanOrEqual(6);
    expect(content.check.length).toBeLessThanOrEqual(8);
    expect(content.check.filter((q) => q.level === 'apply').length).toBeGreaterThanOrEqual(2);
  });
});

describe('Elasticity Café campaign', () => {
  it('has four cafés in the campaign, all in the content file, with both kinds of demand', () => {
    expect(CAMPAIGN.length).toBe(4);
    const types = CAMPAIGN.map((id) => rangeType(byId(id)));
    expect(types).toContain('elastic');
    expect(types).toContain('inelastic');
  });

  it('the kiosk is inelastic: a price rise grows revenue, so the goal is met', () => {
    const s = byId('kiosk');
    expect(rangeType(s)).toBe('inelastic');
    expect(weekGrew(salesLog(s, [3.5, 3.5, 4, 4.5, 4.75, 5]))).toBe(true);
    expect(weekGrew(salesLog(s, [3.5, 3, 2.75, 2.5, 2.5, 2.5]))).toBe(false);
  });

  it('elastic latte: cutting the price by the end of the week meets the goal; raising it does not', () => {
    const s = byId('latte');
    expect(weekGrew(salesLog(s, [6, 6.5, 7, 6, 5.75, 5.5]))).toBe(true);
    expect(weekGrew(salesLog(s, [6, 5.5, 6, 6.5, 7, 7.5]))).toBe(false);
  });

  it('keeping the same price all week does not meet the goal', () => {
    expect(weekGrew(salesLog(byId('lodge'), [4, 4, 4, 4, 4, 4]))).toBe(false);
  });

  it('the stamp needs all four weeks played and revenue growth in at least 3', () => {
    const w = (grew: boolean): WeekResult => ({ scenarioId: 'latte', startTR: 1, endTR: grew ? 2 : 0, grew, typeRight: true });
    expect(campaignMet([w(true), w(true), w(true)])).toBe(false);
    expect(campaignMet([w(true), w(false), w(true), w(true)])).toBe(true);
    expect(campaignMet([w(true), w(false), w(false), w(true)])).toBe(false);
  });

  it('records the start and end revenue of a week', () => {
    const r = weekResult('lodge', salesLog(byId('lodge'), [4, 5, 6, 7, 8, 8]), true);
    expect(r.startTR).toBe(4 * 256);
    expect(r.endTR).toBe(8 * 192);
    expect(r.grew).toBe(true);
  });
});
