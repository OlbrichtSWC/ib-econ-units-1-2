import { describe, expect, it } from 'vitest';
import content from '../public/content/activities/gov-toolkit.json';
import {
  applyPolicy, breaksRules, budgetRect, calcRight, calcValue, effectsOf, effectsRight, lossTriangle, meetsTarget, Mission, policyEffects, snapSize, TOOLS,
  workingSizes,
} from '../src/activities/gov-toolkit/model';
import { equilibrium, Line } from '../src/econ/calc';

const levels = (content.try as unknown as { missionLevels: Mission[][] }).missionLevels;
const all = levels.flat();
const byId = (id: string) => all.find((m) => m.id === id)!;

describe('Government Toolkit missions (content JSON)', () => {
  it('three levels of four missions, each level using every tool once', () => {
    expect(levels).toHaveLength(3);
    for (const l of levels) {
      expect(l).toHaveLength(4);
      expect(l.map((m) => m.tool).sort()).toEqual([...TOOLS].sort());
    }
    expect(new Set(all.map((m) => m.id)).size).toBe(12);
  });

  it('every mission can be met with the right tool, but not at every setting', () => {
    for (const m of all) {
      const ok = workingSizes(m);
      expect(ok.length, m.id).toBeGreaterThan(0);
      // The neutral setting (no policy) never meets the goal.
      const e = equilibrium(m.demand, m.supply);
      const neutral = m.tool === 'tax' || m.tool === 'subsidy' ? 0 : e.p;
      expect(meetsTarget(applyPolicy(m.demand, m.supply, m.tool, neutral), m.target), m.id).toBe(false);
    }
  });

  it('every wrong tool has its own feedback', () => {
    for (const m of all) for (const t of TOOLS) if (t !== m.tool) expect(m.wrongTool[t], `${m.id} ${t}`).toBeTruthy();
  });

  it('only the right tool meets the goal and keeps the brief, at any setting', () => {
    for (const m of all) {
      for (const t of TOOLS) {
        const e = equilibrium(m.demand, m.supply);
        // Try a wide range of sizes for every tool: prices from 0 to the top of the diagram, taxes and subsidies up to half of it.
        const wide = t === 'tax' || t === 'subsidy' ? Array.from({ length: 41 }, (_, i) => (i * m.yMax) / 80) : Array.from({ length: 81 }, (_, i) => (i * m.yMax) / 80);
        const slider = Array.from({ length: Math.round((m.max - m.min) / m.step) + 1 }, (_, i) => m.min + i * m.step);
        const sizes = [...wide, ...slider];
        const fits = sizes.filter((v) => {
          const o = applyPolicy(m.demand, m.supply, t, v);
          return meetsTarget(o, m.target) && !breaksRules(o, m.rules);
        });
        if (t === m.tool) expect(fits.length, `${m.id} with ${t}`).toBeGreaterThan(0);
        else expect(fits, `${m.id} with ${t} (equilibrium ${e.p})`).toEqual([]);
      }
    }
  });

  it('every mission market has its equilibrium inside the diagram', () => {
    for (const m of all) {
      const e = equilibrium(m.demand, m.supply);
      expect(e.q, m.id).toBeGreaterThan(0);
      expect(e.q, m.id).toBeLessThan(m.xMax);
      expect(e.p, m.id).toBeLessThan(m.yMax);
    }
  });
});

describe('Government Toolkit: the economics, worked by hand', () => {
  it('rent ceiling at $1,000: shortage of 400 flats, welfare loss $40,000', () => {
    const m = byId('rent');
    // D: P = 2000 − Q. S: P = 400 + Q. Equilibrium: Q = 800, P = $1,200.
    const o = applyPolicy(m.demand, m.supply, 'ceiling', 1000);
    expect(o.qd).toBeCloseTo(1000, 9);
    expect(o.qs).toBeCloseTo(600, 9);
    expect(o.shortage).toBeCloseTo(400, 9);
    expect(o.quantity).toBeCloseTo(600, 9);
    // ½ × (800 − 600) × (1400 − 1000)
    expect(o.welfareLoss).toBeCloseTo(40000, 6);
    expect(o.budget).toBe(0);
  });

  it('sugary drinks tax of $1: 150 bottles, buyers pay $3.50, sellers keep $2.50, revenue $150', () => {
    const m = byId('soda');
    const o = applyPolicy(m.demand, m.supply, 'tax', 1);
    expect(o.quantity).toBeCloseTo(150, 9);
    expect(o.consumerPrice).toBeCloseTo(3.5, 9);
    expect(o.producerPrice).toBeCloseTo(2.5, 9);
    expect(o.budget).toBeCloseTo(150, 9);
    expect(meetsTarget(o, m.target)).toBe(true);
    expect(meetsTarget(applyPolicy(m.demand, m.supply, 'tax', 0.75), m.target)).toBe(false);
  });

  it('bus pass subsidy of $12: 260 passes, students pay $34, the company gets $46, spending $3,120', () => {
    const m = byId('bus');
    const o = applyPolicy(m.demand, m.supply, 'subsidy', 12);
    expect(o.quantity).toBeCloseTo(260, 9);
    expect(o.consumerPrice).toBeCloseTo(34, 9);
    expect(o.producerPrice).toBeCloseTo(46, 9);
    expect(o.budget).toBeCloseTo(-3120, 6);
  });

  it('wheat floor at $280: surplus of 120 thousand tonnes', () => {
    const m = byId('wheat');
    const o = applyPolicy(m.demand, m.supply, 'floor', 280);
    expect(o.qd).toBeCloseTo(240, 9);
    expect(o.qs).toBeCloseTo(360, 9);
    expect(o.surplus).toBeCloseTo(120, 9);
  });

  it('minimum wage of $20: 80 workers cannot find jobs', () => {
    const m = byId('wage');
    const o = applyPolicy(m.demand, m.supply, 'floor', 20);
    expect(o.surplus).toBeCloseTo(80, 9);
    expect(o.quantity).toBeCloseTo(200, 9);
  });

  it('cigarettes: only a $6 tax raises $600, and consumers pay most of it (inelastic demand)', () => {
    const m = byId('cigs');
    expect(workingSizes(m)).toEqual([6]);
    const o = applyPolicy(m.demand, m.supply, 'tax', 6);
    expect(o.quantity).toBeCloseTo(100, 9);
    expect(o.budget).toBeCloseTo(600, 9);
    expect(o.consumerBurden).toBeCloseTo(500, 9);
    expect(o.producerBurden).toBeCloseTo(100, 9);
    // A bigger tax raises less.
    expect(applyPolicy(m.demand, m.supply, 'tax', 8).budget).toBeLessThan(600);
  });

  it('Level 3 calculations (HL)', () => {
    const petrol = applyPolicy(byId('petrol').demand, byId('petrol').supply, 'tax', 0.75);
    expect(calcValue(petrol, 'budget')).toBe(225);
    expect(calcValue(petrol, 'consumerBurden')).toBe(150);
    const milk = applyPolicy(byId('milk').demand, byId('milk').supply, 'floor', 2);
    expect(calcValue(milk, 'surplus')).toBe(50);
    expect(calcValue(milk, 'buyUpCost')).toBe(100);
    const laptops = applyPolicy(byId('laptops').demand, byId('laptops').supply, 'subsidy', 100);
    expect(calcValue(laptops, 'budget')).toBe(35000);
    expect(calcValue(laptops, 'consumerPrice')).toBe(550);
    const bread = applyPolicy(byId('bread').demand, byId('bread').supply, 'ceiling', 4);
    expect(calcValue(bread, 'shortage')).toBe(100);
    expect(calcValue(bread, 'welfareLoss')).toBe(50);
  });

  it('Level 3 missions ask for two calculations', () => {
    for (const m of levels[2]) expect(m.calc?.length, m.id).toBe(2);
  });
});

describe('Government Toolkit: effects and marking', () => {
  it('the predicted effects of each tool match the market at every working setting', () => {
    for (const m of all) {
      for (const s of workingSizes(m)) expect(effectsOf(applyPolicy(m.demand, m.supply, m.tool, s)), `${m.id} ${s}`).toEqual(policyEffects(m.tool));
    }
  });

  it('counts right predictions', () => {
    expect(effectsRight(policyEffects('tax'), 'tax')).toBe(4);
    expect(effectsRight({ consumerPrice: 'falls', quantity: 'falls', budget: 'gains revenue', gap: 'neither' }, 'tax')).toBe(3);
    expect(effectsRight({}, 'subsidy')).toBe(0);
  });

  it('accepts calculations within 1%', () => {
    const o = applyPolicy(byId('soda').demand, byId('soda').supply, 'tax', 1);
    expect(calcRight(o, 'budget', 150)).toBe(true);
    expect(calcRight(o, 'budget', 151)).toBe(true);
    expect(calcRight(o, 'budget', 155)).toBe(false);
    expect(calcRight(o, 'budget', NaN)).toBe(false);
  });

  it('a non-binding ceiling or floor does nothing', () => {
    const D: Line = { a: { q: 0, p: 10 }, b: { q: 100, p: 0 } };
    const S: Line = { a: { q: 0, p: 0 }, b: { q: 100, p: 10 } };
    expect(applyPolicy(D, S, 'ceiling', 8)).toMatchObject({ quantity: 50, shortage: 0, welfareLoss: 0 });
    expect(applyPolicy(D, S, 'floor', 3)).toMatchObject({ quantity: 50, surplus: 0, welfareLoss: 0 });
  });

  it('drawing helpers: the revenue rectangle and loss triangle match the values', () => {
    const m = byId('soda');
    const o = applyPolicy(m.demand, m.supply, 'tax', 1);
    const r = budgetRect(o);
    expect((r[1].q - r[0].q) * (r[2].p - r[1].p)).toBeCloseTo(o.budget, 9);
    const t = lossTriangle(m.demand, m.supply, o);
    expect(0.5 * (t[1].q - t[0].q) * (t[0].p - t[2].p)).toBeCloseTo(o.welfareLoss, 9);
  });

  it('snaps slider values to the step and range', () => {
    const m = byId('soda');
    expect(snapSize(m, 0.6)).toBe(0.5);
    expect(snapSize(m, 9)).toBe(2);
    expect(snapSize(m, -1)).toBe(0);
  });
});
