import { describe, expect, it } from 'vitest';
import {
  Calc, calcAnswer, calcClass, CALC_GOAL, calcWon, closeEnough, DETS, engelPoints, LAB_GOAL, labWon, pctChange, ped, PED_KINDS, pedKind, qtyChange,
  round2, scheduleKind, slips, STALL_GOAL, stallWon, stepYeds, YED_KINDS, yed, yedKind,
} from '../src/activities/hints-yed/model';
import content from '../public/content/activities/hints-yed.json';
import glossary from '../public/content/glossary.json';

const t = content.try;
const calcs = t.calcs as Calc[];

describe('HINTS Market: percentage change and elasticities (hand-checked)', () => {
  it('percentage change uses the original value as the base', () => {
    expect(pctChange(4, 5)).toBeCloseTo(25);
    expect(pctChange(400, 340)).toBeCloseTo(-15);
    expect(pctChange(3000, 4000)).toBeCloseTo(33.333, 2);
  });
  it('rounds to 2 decimal places', () => {
    expect(round2(0.666666)).toBe(0.67);
    expect(round2(-0.666666)).toBe(-0.67);
    expect(round2(1.005)).toBe(1.01);
  });
  it('PED = % change in Qd ÷ % change in price', () => {
    expect(ped(4, 5, 400, 340)).toBeCloseTo(-0.6); // −15 ÷ 25
    expect(ped(10, 8, 100, 150)).toBeCloseTo(-2.5); // +50 ÷ −20
    expect(ped(10, 12, 1000, 900)).toBeCloseTo(-0.5); // −10 ÷ 20
    expect(ped(200, 240, 1000, 960)).toBeCloseTo(-0.2); // −4 ÷ 20
  });
  it('YED = % change in Qd ÷ % change in income', () => {
    expect(yed(40000, 44000, 50, 58)).toBeCloseTo(1.6); // 16 ÷ 10
    expect(yed(2500, 3000, 20, 18)).toBeCloseTo(-0.5); // −10 ÷ 20
    expect(yed(50000, 55000, 200, 230)).toBeCloseTo(1.5); // 15 ÷ 10
    expect(yed(3000, 4000, 12, 14)).toBeCloseTo(0.5); // 16.67 ÷ 33.33
  });
  it('rearranged: % change in Qd = elasticity × % change in income', () => {
    expect(qtyChange(0.5, 8)).toBeCloseTo(4);
    expect(qtyChange(0.6, 5)).toBeCloseTo(3);
  });
  it('classifies PED by its size, ignoring the minus sign', () => {
    expect(pedKind(-0.6)).toBe('inelastic');
    expect(pedKind(-2.5)).toBe('elastic');
    expect(pedKind(-1)).toBe('unitary');
    expect(pedKind(0)).toBe('inelastic');
  });
  it('classifies YED by sign and size', () => {
    expect(yedKind(-0.5)).toBe('inferior');
    expect(yedKind(0.4)).toBe('necessity');
    expect(yedKind(1.6)).toBe('luxury');
    expect(yedKind(1)).toBe('unit');
  });
  it('names the usual slips', () => {
    // $10 → $12 and 1,000 → 900: right answer −0.5.
    const s = slips(10, 12, 1000, 900);
    expect(s.flipped).toBe(-2);
    expect(s.newBase).toBe(-0.67); // (−100/900) ÷ (2/12)
    expect(s.sign).toBe(0.5);
    // $50,000 → $55,000 and 200 → 230: right answer 1.5.
    const y = slips(50000, 55000, 200, 230);
    expect(y.flipped).toBe(0.67);
    expect(y.newBase).toBe(1.43); // (30/230) ÷ (5000/55000)
  });
  it('accepts answers within the rounding tolerance only', () => {
    expect(closeEnough(-0.6, -0.6)).toBe(true);
    expect(closeEnough(-0.61, -0.6)).toBe(true);
    expect(closeEnough(-0.62, -0.6)).toBe(false);
    expect(closeEnough(0.6, -0.6)).toBe(false);
  });
});

describe('HINTS Market: Engel curves (Level 2)', () => {
  it('puts income on the vertical axis and quantity on the horizontal axis', () => {
    expect(engelPoints([2000, 3000, 4000], [10, 12, 14], 1)).toEqual([{ q: 10, p: 2000 }, { q: 12, p: 3000 }]);
  });
  it('step YEDs for bread are all between 0 and 1 (hand-checked)', () => {
    const v = stepYeds([2000, 3000, 4000, 5000, 6000], [10, 12, 14, 15, 16]);
    expect(v[0]).toBeCloseTo(0.4); // +20% ÷ +50%
    expect(v[1]).toBeCloseTo(0.5); // +16.67% ÷ +33.33%
    expect(v[2]).toBeCloseTo(0.2857, 3); // +7.14% ÷ +25%
    expect(v[3]).toBeCloseTo(0.3333, 3); // +6.67% ÷ +20%
  });
  it('every good in every basket shows one clear YED class at every step, matching its answer', () => {
    for (const b of t.baskets) {
      for (const g of b.goods) {
        expect(g.qty.length, g.id).toBe(t.incomes.length);
        expect(scheduleKind(t.incomes, g.qty), g.id).toBe(g.kind);
        expect(YED_KINDS).toContain(g.kind);
      }
    }
  });
  it('a schedule that changes class is flagged', () => {
    expect(scheduleKind([1, 2, 3], [10, 30, 31])).toBeNull();
  });
  it('the baskets use each YED class at least once', () => {
    const kinds = t.baskets.flatMap((b) => b.goods.map((g) => g.kind));
    for (const k of YED_KINDS) expect(kinds).toContain(k);
  });
});

describe('HINTS Market: calculator corner (Level 3)', () => {
  it('every stated answer matches the model', () => {
    for (const c of calcs) expect(calcAnswer(c), c.id).toBe(c.answer);
  });
  it('hand-checked answers and meanings', () => {
    const by = (id: string) => calcs.find((c) => c.id === id)!;
    expect(calcAnswer(by('c1'))).toBe(-0.6);
    expect(calcClass(by('c1'))).toBe('inelastic');
    expect(calcAnswer(by('c2'))).toBe(1.6);
    expect(calcClass(by('c2'))).toBe('luxury');
    expect(calcAnswer(by('c3'))).toBe(-2.5);
    expect(calcClass(by('c3'))).toBe('elastic');
    expect(calcAnswer(by('c4'))).toBe(-0.5);
    expect(calcClass(by('c4'))).toBe('inferior');
    expect(calcAnswer(by('c5'))).toBe(4);
    expect(calcClass(by('c5'))).toBe('necessity');
    expect(calcAnswer(by('c6'))).toBe(-0.2);
  });
  it('no round lands on a boundary (unitary PED or YED of exactly 0 or 1)', () => {
    for (const c of calcs) {
      const v = c.kind === 'qty' ? c.elasticity! : calcAnswer(c);
      expect(Math.abs(Math.abs(v) - 1), c.id).toBeGreaterThan(0.05);
      expect(Math.abs(v), c.id).toBeGreaterThan(0.05);
    }
  });
  it('slips never equal the right answer, so feedback cannot confuse them', () => {
    for (const c of calcs.filter((x) => x.kind !== 'qty')) {
      const s = slips(c.x0!, c.x1!, c.q0!, c.q1!);
      for (const v of [s.flipped, s.newBase, s.sign]) expect(closeEnough(v, c.answer), c.id).toBe(false);
    }
  });
  it('the HL round has exactly one right reason, and the HL round is about a primary commodity', () => {
    const hl = calcs.filter((c) => c.hl);
    expect(hl.length).toBe(1);
    expect(hl[0].reason!.options.filter((o) => o.correct).length).toBe(1);
    expect(hl[0].title.toLowerCase()).toContain('primary commodity');
  });
  it('has both PED and YED calculations', () => {
    expect(calcs.some((c) => c.kind === 'ped')).toBe(true);
    expect(calcs.some((c) => c.kind === 'yed')).toBe(true);
    expect(calcs.some((c) => c.kind === 'qty')).toBe(true);
  });
});

describe('HINTS Market: the stall (Level 1)', () => {
  it('every good has one HINTS letter and one crate', () => {
    for (const g of t.goods) {
      expect(DETS, g.id).toContain(g.det);
      expect(PED_KINDS, g.id).toContain(g.ped);
    }
  });
  it('uses all five HINTS letters and both crates', () => {
    for (const d of DETS) expect(t.goods.some((g) => g.det === d), d).toBe(true);
    for (const k of PED_KINDS) expect(t.goods.filter((g) => g.ped === k).length, k).toBeGreaterThanOrEqual(3);
  });
  it('the crate follows the HINTS rule for each letter', () => {
    for (const g of t.goods) {
      if (g.det === 'H' || g.det === 'T') expect(g.ped, g.id).toBe('inelastic');
    }
    expect(t.goods.find((g) => g.id === 'cola')?.ped).toBe('elastic');
    expect(t.goods.find((g) => g.id === 'softdrinks')?.ped).toBe('inelastic');
  });
  it('has names, rules and descriptions for every letter', () => {
    for (const d of DETS) {
      expect(t.detNames[d]).toBeTruthy();
      expect(t.detAbout[d]).toBeTruthy();
      expect(t.detRules[d]).toBeTruthy();
    }
  });
});

describe('HINTS Market: goals', () => {
  it('each goal counts right first time and can be reached', () => {
    expect(stallWon(STALL_GOAL)).toBe(true);
    expect(stallWon(STALL_GOAL - 1)).toBe(false);
    expect(labWon(LAB_GOAL)).toBe(true);
    expect(labWon(LAB_GOAL - 1)).toBe(false);
    expect(calcWon(CALC_GOAL)).toBe(true);
    expect(calcWon(CALC_GOAL - 1)).toBe(false);
    expect(t.goods.length).toBeGreaterThanOrEqual(STALL_GOAL);
    expect(STALL_GOAL).toBeGreaterThan(t.goods.length / 2);
    const labItems = t.baskets.reduce((s, b) => s + b.goods.length, 0);
    expect(labItems).toBeGreaterThanOrEqual(LAB_GOAL);
    expect(LAB_GOAL).toBeGreaterThan(labItems / 2);
    expect(calcs.length).toBeGreaterThanOrEqual(CALC_GOAL);
    expect(CALC_GOAL).toBeGreaterThan(calcs.length / 2);
  });
  it('the level 3 goal can be reached by a student who skips the HL round', () => {
    expect(calcs.filter((c) => !c.hl).length).toBeGreaterThanOrEqual(CALC_GOAL);
  });
});

describe('HINTS Market: content', () => {
  it('check has 8 or 9 questions, with a label question and number questions', () => {
    expect(content.check.length).toBeGreaterThanOrEqual(8);
    expect(content.check.length).toBeLessThanOrEqual(9);
    expect(content.check.some((q) => q.type === 'label')).toBe(true);
    expect(content.check.filter((q) => q.type === 'number').length).toBeGreaterThanOrEqual(2);
  });
  it('every choice question has exactly one right answer', () => {
    for (const q of content.check) {
      if (q.type === 'choice') expect((q.options ?? []).filter((o) => 'correct' in o && o.correct).length, q.id).toBe(1);
    }
  });
  it('number questions in Check it match the model', () => {
    const by = (id: string) => content.check.find((q) => q.id === id)!;
    expect(by('q3').answer).toBe(round2(ped(10, 12, 1000, 900)));
    expect(by('q4').answer).toBe(round2(yed(50000, 55000, 200, 230)));
    expect(by('q7').answer).toBe(round2(qtyChange(0.6, 5)));
  });
  it('every glossary term used exists in the glossary', () => {
    const terms = new Set<string>();
    for (const g of glossary.terms as { term: string; aliases?: string[] }[]) {
      terms.add(g.term.toLowerCase());
      g.aliases?.forEach((a) => terms.add(a.toLowerCase()));
    }
    const text = JSON.stringify(content);
    for (const m of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const term = m[1].split('|').pop()!.toLowerCase();
      expect(terms.has(term), term).toBe(true);
    }
  });
  it('on-screen text follows the house style', () => {
    const text = JSON.stringify(content);
    expect(text).not.toMatch(/—|genuinely|honestly|actually|\btick\b|\bcards?\b/i);
  });
});
