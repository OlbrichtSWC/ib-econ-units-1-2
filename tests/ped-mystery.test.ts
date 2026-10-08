import { describe, expect, it } from 'vitest';
import { totalRevenue, quantityAt } from '../src/econ/calc';
import {
  DEMAND, ibCheck, MAIN_CURVE, MysteryRule, mysteryAnswers, mysteryAsk, mysteryDirection, mysteryHolds, mysteryTypedRight, mysteryValue, SKATE_CURVE, snapOn,
} from '../src/activities/ped-line/model';
import content from '../public/content/activities/ped-line.json';

type Lv = { curve: 'main' | 'skate'; checks: number; clues: { id: string; rule: MysteryRule }[] };
const levels = (content.try as unknown as { mysteryLevels: Lv[] }).mysteryLevels;
const clues = levels[0].clues;
const curveOf = (l: Lv) => (l.curve === 'skate' ? SKATE_CURVE : MAIN_CURVE);

describe('Same Slope: mystery mode', () => {
  it('every clue in the content file has exactly one hidden point on the line', () => {
    for (const c of clues) expect(mysteryAnswers(c.rule), c.id).toHaveLength(1);
  });

  it('the hidden points are where the clues say (worked by hand)', () => {
    const ans = Object.fromEntries(clues.map((c) => [c.id, mysteryAnswers(c.rule)[0]]));
    // Q = 200 − 10P, so PED from a $1 cut = −10P ÷ Q.
    expect(ans.ped3).toBe(15); // −10 × 15 ÷ 50 = −3
    expect(ans.ped025).toBe(4); // −10 × 4 ÷ 160 = −0.25
    expect(ans.ped4).toBe(16); // −10 × 16 ÷ 40 = −4
    expect(ans.tr960).toBe(12); // $12 × 80 = $960 (also $8 × 120, but that is inelastic)
    expect(ans.tr510).toBe(3); // $3 × 170 = $510 (also $17 × 30, but that is elastic)
    expect(ans.trmax).toBe(10); // $10 × 100 = $1,000
  });

  it('PED in the clues uses the IB formula from the point', () => {
    const c = ibCheck(15);
    expect(c.pctQ / c.pctP).toBeCloseTo(-3);
    expect(totalRevenue(12, quantityAt(DEMAND, 12))).toBe(960);
  });

  it('a wrong guess says which way to move', () => {
    const rule: MysteryRule = { type: 'ped', value: -3 };
    expect(mysteryHolds(rule, 15)).toBe(true);
    expect(mysteryDirection(rule, 12)).toBe('higher');
    expect(mysteryDirection(rule, 17)).toBe('lower');
    expect(mysteryDirection(rule, 15)).toBeNull();
  });
});

describe('Same Slope: mystery levels 2 and 3', () => {
  it('has three levels, each with a check limit, and every clue has exactly one answer on its curve', () => {
    expect(levels).toHaveLength(3);
    for (const l of levels) {
      expect(l.checks).toBeGreaterThan(0);
      expect(l.clues.length).toBeGreaterThanOrEqual(3);
      for (const c of l.clues) expect(mysteryAnswers(c.rule, curveOf(l)), c.id).toHaveLength(1);
    }
    expect(levels[1].checks).toBeLessThan(levels[0].checks);
    expect(levels[2].checks).toBeLessThan(levels[1].checks);
  });

  it('Level 2 answers (worked by hand on Q = 200 − 10P, PED = −P ÷ (20 − P))', () => {
    const ans = Object.fromEntries(levels[1].clues.map((c) => [c.id, mysteryAnswers(c.rule)[0]]));
    expect(ans['l2-ped15']).toBe(12); // −12 ÷ 8 = −1.5
    expect(ans['l2-tr910']).toBe(13); // $13 × 70 = $910 (also $7 × 130, inelastic)
    expect(ans['l2-ped06']).toBe(7.5); // −7.5 ÷ 12.5 = −0.6
    expect(ans['l2-tr750']).toBe(5); // $5 × 150 = $750 (also $15 × 50, elastic)
    expect(ans['l2-ped9']).toBe(18); // −18 ÷ 2 = −9
    expect(ans['l2-tr640']).toBe(16); // $16 × 40 = $640 (also $4 × 160, inelastic)
  });

  it('Level 3 answers (Snowline Skates: Q = 240 − 15P, PED = −P ÷ (16 − P))', () => {
    const ans = Object.fromEntries(levels[2].clues.map((c) => [c.id, mysteryAnswers(c.rule, SKATE_CURVE)[0]]));
    expect(quantityAt(SKATE_CURVE.line, 8)).toBe(120);
    expect(ans['l3-ped06']).toBe(6); // −6 ÷ 10 = −0.6
    expect(ans['l3-tr825']).toBe(11); // $11 × 75 = $825 (also $5 × 165, inelastic)
    expect(ans['l3-ped7']).toBe(14); // −14 ÷ 2 = −7
    expect(ans['l3-tr720']).toBe(4); // $4 × 180 = $720
    expect(ans['l3-tr720e']).toBe(12); // $12 × 60 = $720, elastic, so a price cut raises TR
    expect(ans['l3-trmax']).toBe(8); // midpoint: $8 × 120 = $960
  });

  it('a wrong guess asks for PED on PED clues and TR on the others', () => {
    expect(mysteryAsk({ type: 'ped', value: -3 })).toBe('ped');
    expect(mysteryAsk({ type: 'tr', value: 960, zone: 'elastic' })).toBe('tr');
    expect(mysteryAsk({ type: 'trmax' })).toBe('tr');
    expect(mysteryValue({ type: 'trmax' }, 6)).toBe(840); // $6 × 140
    expect(mysteryValue({ type: 'ped', value: -3 }, 10)).toBeCloseTo(-1, 10);
  });

  it('the worked-out value is accepted with either PED sign, to 2 decimal places', () => {
    const pedRule: MysteryRule = { type: 'ped', value: -3 };
    // At $13: PED = −13 ÷ 7 = −1.857...
    expect(mysteryTypedRight(pedRule, 13, -1.86)).toBe(true);
    expect(mysteryTypedRight(pedRule, 13, 1.86)).toBe(true);
    expect(mysteryTypedRight(pedRule, 13, 1.8)).toBe(false);
    const trRule: MysteryRule = { type: 'tr', value: 960, zone: 'elastic' };
    expect(mysteryTypedRight(trRule, 13, 910)).toBe(true);
    expect(mysteryTypedRight(trRule, 13, 900)).toBe(false);
    expect(mysteryTypedRight(trRule, 13, NaN)).toBe(false);
  });

  it('prices snap to $0.50 inside the curve', () => {
    expect(snapOn(SKATE_CURVE, 15.9)).toBe(15);
    expect(snapOn(SKATE_CURVE, 7.3)).toBe(7.5);
    expect(snapOn(MAIN_CURVE, 0)).toBe(1);
  });
});

