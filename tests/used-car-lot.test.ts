import { describe, expect, it } from 'vitest';
import {
  accepts, Actor, BID_GOAL, bidWon, expectedValue, expectedValue2, Grade, HAZARD_GOAL, hazardWon, isPrivate, leaveOptions, leaving, Lot, minShareToStay,
  money, nextLot, POINTS_PER_HAZARD_CASE, priceOptions, problemFor, questionsPerLot, responseFor, RESPONSES, sameGrades, shareGood, SIGNAL_GOAL, signalWon,
  spiral, totalCars, trust,
} from '../src/activities/used-car-lot/model';
import { checkNumber } from '../src/shared/activity/CheckIt';
import type { NumberQuestion } from '../src/shared/activity/types';
import content from '../public/content/activities/used-car-lot.json';
import glossary from '../public/content/glossary.json';

const t = content.try;
const lot = (id: string) => t.lots.find((l) => l.id === id)!.types as Lot;

describe('Used Car Lot: expected value', () => {
  it('weights each worth by the number of cars (hand-checked)', () => {
    // (4 × 9,000 + 4 × 6,000 + 4 × 3,000) / 12 = 72,000 / 12 = 6,000
    expect(expectedValue(lot('town'))).toBe(6000);
    // (6 × 10,000 + 4 × 4,000) / 10 = 76,000 / 10 = 7,600
    expect(expectedValue(lot('harbour'))).toBe(7600);
    // (3 × 10,000 + 1 × 4,000) / 4 = 34,000 / 4 = 8,500
    expect(expectedValue(lot('hill'))).toBe(8500);
    expect(expectedValue([])).toBe(0);
    expect(totalCars(lot('town'))).toBe(12);
  });
  it('two-type expected value: 0.7 × 10,000 + 0.3 × 4,000 = 8,200', () => {
    expect(expectedValue2(0.7, 10000, 4000)).toBeCloseTo(8200, 9);
    expect(expectedValue2(0.5, 8000, 2000)).toBeCloseTo(5000, 9);
    expect(expectedValue2(1, 9000, 3000)).toBe(9000);
  });
  it('the smallest share of good cars that keeps them on the lot', () => {
    // 3,000 + 6,000 s = 7,500, so s = 0.75
    expect(minShareToStay(9000, 3000, 7500)).toBeCloseTo(0.75, 9);
    // 2,000 + 8,000 s = 8,000, so s = 0.75
    expect(minShareToStay(10000, 2000, 8000)).toBeCloseTo(0.75, 9);
    expect(minShareToStay(10000, 4000, 3000)).toBe(0);
    expect(() => minShareToStay(3000, 3000, 2000)).toThrow();
  });
  it('share of good cars', () => {
    expect(shareGood(lot('town'))).toBeCloseTo(1 / 3, 9);
    expect(shareGood(lot('harbour'))).toBeCloseTo(0.6, 9);
    expect(shareGood([{ grade: 'lemon', worth: 3000, min: 2000, count: 4 }])).toBe(0);
  });
});

describe('Used Car Lot: the adverse selection spiral', () => {
  it('an owner sells only at or above their lowest price', () => {
    const c = { grade: 'good' as Grade, worth: 9000, min: 8000, count: 1 };
    expect(accepts(c, 8000)).toBe(true);
    expect(accepts(c, 7999)).toBe(false);
  });
  it('the town lot: good cars leave at $6,000, then fair cars at $4,500, then lemons stay at $3,000', () => {
    const s = spiral(lot('town'));
    expect(s.map((x) => x.price)).toEqual([6000, 4500, 3000]);
    expect(s.map((x) => x.leave)).toEqual([['good'], ['fair'], []]);
    expect(nextLot(lot('town')).map((c) => c.grade)).toEqual(['fair', 'lemon']);
    expect(leaving(lot('town'), 6000)).toEqual(['good']);
  });
  it('the harbour lot: good cars leave at $7,600, then only lemons at $4,000', () => {
    const s = spiral(lot('harbour'));
    expect(s.map((x) => x.price)).toEqual([7600, 4000]);
    expect(s.map((x) => x.leave)).toEqual([['good'], []]);
  });
  it('the hill lot: $8,500 is enough for every owner, so no one leaves', () => {
    const s = spiral(lot('hill'));
    expect(s).toHaveLength(1);
    expect(s[0].leave).toEqual([]);
  });
  it('in every lot each car is worth more to a buyer than its owner needs, so every lost sale is a lost gain', () => {
    for (const l of t.lots) for (const c of l.types) expect(c.worth, l.id).toBeGreaterThan(c.min);
  });
  it('the price never rises as the spiral goes round', () => {
    for (const l of t.lots) {
      const p = spiral(l.types as Lot).map((x) => x.price);
      for (let i = 1; i < p.length; i++) expect(p[i]).toBeLessThan(p[i - 1]);
    }
  });
});

describe('Used Car Lot: level 1 options', () => {
  it('price options start with the expected value and have no repeated values', () => {
    for (const l of t.lots) {
      let prev: number | undefined;
      for (const st of spiral(l.types as Lot)) {
        const o = priceOptions(st.lot, prev);
        expect(o[0]).toEqual({ kind: 'expected', value: st.price });
        expect(o.filter((x) => x.kind === 'expected')).toHaveLength(1);
        expect(new Set(o.map((x) => x.value)).size).toBe(o.length);
        expect(o.length, `${l.id} ${st.price}`).toBeGreaterThanOrEqual(3);
        prev = st.price;
      }
    }
  });
  it('price slips are hand-checked on the harbour lot', () => {
    const o = priceOptions(lot('harbour'));
    expect(o.find((x) => x.kind === 'unweighted')?.value).toBe(7000);
    expect(o.find((x) => x.kind === 'best')?.value).toBe(10000);
    // (6 × 8,000 + 4 × 2,000) / 10 = 5,600
    expect(o.find((x) => x.kind === 'ownerMin')?.value).toBe(5600);
  });
  it('every "who drives away?" round has exactly one right option', () => {
    for (const l of t.lots) {
      for (const st of spiral(l.types as Lot)) {
        const opts = leaveOptions(st.lot);
        expect(opts.filter((g) => sameGrades(g, st.leave)), `${l.id} ${st.price}`).toHaveLength(1);
        expect(opts.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it('every lot "why" question has exactly one right answer', () => {
    for (const l of t.lots) expect(l.why.options.filter((o) => 'correct' in o && o.correct).length, l.id).toBe(1);
  });
  it('the numbers in the why answers match the model', () => {
    expect(t.lots.find((l) => l.id === 'harbour')!.why.options.find((o) => 'correct' in o)!.text).toContain(money(expectedValue(lot('harbour'))));
    expect(t.lots.find((l) => l.id === 'hill')!.why.options.find((o) => 'correct' in o)!.text).toContain(money(expectedValue(lot('hill'))));
  });
  it('money is shown with a dollar sign and commas', () => {
    expect(money(7600)).toBe('$7,600');
    expect(money(4500)).toBe('$4,500');
  });
});

describe('Used Car Lot: responses and problems', () => {
  it('the IB responses: private signalling and screening, government legislation and information', () => {
    expect(responseFor('informed')).toBe('signalling');
    expect(responseFor('uninformed')).toBe('screening');
    expect(responseFor('government', 'rule')).toBe('legislation');
    expect(responseFor('government', 'facts')).toBe('information');
    expect(isPrivate('signalling') && isPrivate('screening')).toBe(true);
    expect(isPrivate('legislation') || isPrivate('information')).toBe(false);
  });
  it('level 2 uses every response, with the warranty as signalling and the inspection as screening', () => {
    const ans = t.cases.map((c) => responseFor(c.actor as Actor, c.act as 'rule' | 'facts'));
    for (const r of RESPONSES) expect(ans.filter((a) => a === r).length, r).toBeGreaterThanOrEqual(2);
    const byId = (id: string) => { const c = t.cases.find((k) => k.id === id)!; return responseFor(c.actor as Actor, c.act as 'rule' | 'facts'); };
    expect(byId('warranty')).toBe('signalling');
    expect(byId('mechanic')).toBe('screening');
    expect(byId('refund')).toBe('legislation');
    expect(byId('ratings')).toBe('information');
  });
  it('hidden before the deal is adverse selection, after is moral hazard', () => {
    expect(problemFor('before')).toBe('adverse');
    expect(problemFor('after')).toBe('moral');
    expect(problemFor(t.hazards.find((h) => h.id === 'bank')!.hidden as 'before' | 'after')).toBe('moral');
    expect(problemFor(t.hazards.find((h) => h.id === 'sick')!.hidden as 'before' | 'after')).toBe('adverse');
  });
  it('level 3 has both problems and every case has exactly one right response', () => {
    expect(t.hazards.some((h) => h.hidden === 'before')).toBe(true);
    expect(t.hazards.some((h) => h.hidden === 'after')).toBe(true);
    for (const h of t.hazards) expect(h.options.filter((o) => 'correct' in o && o.correct).length, h.id).toBe(1);
  });
  it('trust on the lot rises with each case solved', () => {
    expect(trust(0, 10)).toBe(0);
    expect(trust(4, 10)).toBeCloseTo(0.4, 9);
    expect(trust(12, 10)).toBe(1);
    expect(trust(1, 0)).toBe(0);
  });
});

describe('Used Car Lot: goals', () => {
  it('level 1: 15 questions in 3 lots, goal 12', () => {
    const total = t.lots.reduce((s, l) => s + questionsPerLot(l.types as Lot), 0);
    expect(total).toBe(15);
    expect(BID_GOAL).toBeLessThanOrEqual(total);
    expect(BID_GOAL).toBeGreaterThan(total / 2);
    expect(bidWon(BID_GOAL)).toBe(true);
    expect(bidWon(BID_GOAL - 1)).toBe(false);
  });
  it('level 2: 10 cases, goal 8', () => {
    expect(t.cases.length).toBe(10);
    expect(SIGNAL_GOAL).toBeLessThanOrEqual(t.cases.length);
    expect(signalWon(SIGNAL_GOAL)).toBe(true);
    expect(signalWon(SIGNAL_GOAL - 1)).toBe(false);
  });
  it('level 3: 16 first-try points, goal 13', () => {
    const max = t.hazards.length * POINTS_PER_HAZARD_CASE;
    expect(max).toBe(16);
    expect(HAZARD_GOAL).toBeLessThanOrEqual(max);
    expect(hazardWon(HAZARD_GOAL)).toBe(true);
    expect(hazardWon(HAZARD_GOAL - 1)).toBe(false);
  });
  it('the level blurbs match the goals', () => {
    expect(t.levels[0].blurb).toContain(`${BID_GOAL} right`);
    expect(t.levels[1].blurb).toContain(`${SIGNAL_GOAL} right`);
    expect(t.levels[2].blurb).toContain(`${HAZARD_GOAL} of 16`);
    for (const l of t.levels) expect(l.title).toContain('(HL)');
  });
});

describe('Used Car Lot: content', () => {
  it('check has 8 or 9 questions, a label question and number questions', () => {
    expect(content.check.length).toBeGreaterThanOrEqual(8);
    expect(content.check.length).toBeLessThanOrEqual(9);
    expect(content.check.some((q) => q.type === 'label')).toBe(true);
    expect(content.check.filter((q) => q.type === 'number').length).toBeGreaterThanOrEqual(2);
    for (const q of content.check) {
      expect(q.hints).toHaveLength(2);
      expect(q.worked.length).toBeGreaterThan(10);
      expect(q.explanation.length).toBeGreaterThan(10);
      if (q.type === 'choice') expect(q.options!.filter((o) => 'correct' in o && o.correct).length, q.id).toBe(1);
    }
  });
  it('the label question has a slot for every tag and every answer is a choice', () => {
    const q = content.check.find((x) => x.type === 'label')!;
    const letters = q.diagram!.tags!.map((g) => g.letter);
    expect(q.slots!.map((s) => s.letter)).toEqual(letters);
    for (const s of q.slots!) expect(q.choices).toContain(s.answer);
  });
  it('number questions: answers are hand-checked and the common slips get their own feedback', () => {
    const nq = (id: string) => content.check.find((q) => q.id === id) as unknown as NumberQuestion;
    expect(nq('q3').answer).toBeCloseTo(expectedValue2(0.7, 10000, 4000), 6);
    expect(nq('q4').answer).toBeCloseTo(minShareToStay(9000, 3000, 7500) * 100, 6);
    expect(checkNumber(nq('q3'), 7000).feedback).toMatch(/Weight/);
    expect(checkNumber(nq('q3'), 5800).feedback).toMatch(/swapped/);
    expect(checkNumber(nq('q4'), 83.3).feedback).toMatch(/divided/);
    expect(checkNumber(nq('q4'), 25).feedback).toMatch(/lemons/);
    expect(checkNumber(nq('q4'), 75).ok).toBe(true);
    for (const id of ['q3', 'q4']) for (const m of nq(id).mistakes!) expect(checkNumber(nq(id), m.value).ok, `${id} ${m.value}`).toBe(false);
  });
  it('every glossary term used exists in the glossary', () => {
    const names = new Set<string>();
    for (const g of glossary.terms as { term: string; aliases?: string[] }[]) {
      names.add(g.term.toLowerCase());
      for (const a of g.aliases ?? []) names.add(a.toLowerCase());
    }
    const text = JSON.stringify(content);
    for (const m of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const term = m[1].includes('|') ? m[1].split('|')[1] : m[1];
      expect(names.has(term.trim().toLowerCase()), term).toBe(true);
    }
  });
  it('on-screen text follows the house style', () => {
    const text = JSON.stringify(content);
    expect(text).not.toMatch(/—|genuinely|honestly|actually|\btick\b|\bcards?\b/i);
  });
});
