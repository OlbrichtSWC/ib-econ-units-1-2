import { describe, expect, it } from 'vitest';
import { totalRevenue, quantityAt } from '../src/econ/calc';
import { DEMAND, ibCheck, MysteryRule, mysteryAnswers, mysteryDirection, mysteryHolds } from '../src/activities/ped-line/model';
import content from '../public/content/activities/ped-line.json';

const clues = (content.try as unknown as { mystery: { id: string; rule: MysteryRule }[] }).mystery;

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
