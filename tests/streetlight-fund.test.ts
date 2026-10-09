import { describe, expect, it } from 'vitest';
import {
  BENEFIT_PER_LAMP, COUNCIL_GOAL, COUNCIL_TAX, councilTax, councilWon, ENDOWMENT, featuresOf, FUND_GOAL, fullyLitPossible, fundWon, GIFTS, HOUSEHOLDS,
  kindOf, KINDS, LAMPS, lampsLit, NEIGHBOURS, neighbourGift, neighboursTotal, numberRight, parseNumber, payoff, playWeek, POINTS_PER_CASE,
  progressLamps, SORT_GOAL, sortSlip, sortWon, STREET_BENEFIT_PER_LAMP, TARGET, taxMistakes, taxPerHousehold, totalCost, VOLUNTARY_WEEKS, WAYS, WEEKS,
  LAMP_COST,
} from '../src/activities/streetlight-fund/model';
import type { Kind, Way } from '../src/activities/streetlight-fund/model';
import { checkNumber } from '../src/shared/activity/CheckIt';
import type { NumberQuestion } from '../src/shared/activity/types';
import content from '../public/content/activities/streetlight-fund.json';
import glossary from '../public/content/glossary.json';

const t = content.try;

describe('Streetlight Fund: the four kinds of good', () => {
  it('sorts by rivalry and excludability', () => {
    expect(kindOf(true, true)).toBe('private');
    expect(kindOf(false, true)).toBe('club');
    expect(kindOf(true, false)).toBe('common');
    expect(kindOf(false, false)).toBe('public');
    for (const k of KINDS) expect(kindOf(featuresOf(k).rival, featuresOf(k).excludable)).toBe(k);
  });
  it('names the feature a wrong choice got wrong', () => {
    expect(sortSlip('public', 'private')).toEqual({ rival: true, excludable: true });
    expect(sortSlip('public', 'club')).toEqual({ rival: false, excludable: true });
    expect(sortSlip('public', 'common')).toEqual({ rival: true, excludable: false });
    expect(sortSlip('club', 'club')).toEqual({ rival: false, excludable: false });
  });
});

describe('Streetlight Fund: the contribution game', () => {
  it('the street needs $30: six lamps at $5', () => {
    expect(TARGET).toBe(30);
    expect(LAMPS * LAMP_COST).toBe(30);
    expect(HOUSEHOLDS).toBe(NEIGHBOURS.length + 1);
  });
  it('lights one lamp per $5, never more than six', () => {
    expect(lampsLit(0)).toBe(0);
    expect(lampsLit(4)).toBe(0);
    expect(lampsLit(5)).toBe(1);
    expect(lampsLit(18)).toBe(3);
    expect(lampsLit(28)).toBe(5);
    expect(lampsLit(30)).toBe(6);
    expect(lampsLit(50)).toBe(6);
  });
  it('neighbours give less each week; Dev always gives $0', () => {
    // Hand-checked: Ama 8,7,6,5,4. Ben 6,4,2,0,0. Chen 4,2,0,0,0. Dev 0.
    const by = (id: string) => NEIGHBOURS.find((n) => n.id === id)!;
    expect([1, 2, 3, 4, 5].map((w) => neighbourGift(by('ama'), w))).toEqual([8, 7, 6, 5, 4]);
    expect([1, 2, 3, 4, 5].map((w) => neighbourGift(by('ben'), w))).toEqual([6, 4, 2, 0, 0]);
    expect([1, 2, 3, 4, 5].map((w) => neighbourGift(by('chen'), w))).toEqual([4, 2, 0, 0, 0]);
    expect([1, 2, 3, 4, 5].map((w) => neighbourGift(by('dev'), w))).toEqual([0, 0, 0, 0, 0]);
    expect([1, 2, 3, 4, 5].map(neighboursTotal)).toEqual([18, 13, 8, 5, 4]);
    for (let w = 2; w <= VOLUNTARY_WEEKS; w++) expect(neighboursTotal(w)).toBeLessThan(neighboursTotal(w - 1));
  });
  it('payoff = money kept + $2 per lit lamp, paid or not', () => {
    expect(payoff(10, 5)).toBe(0 + 10);
    expect(payoff(0, 5)).toBe(10 + 10);
    expect(payoff(6, 6)).toBe(4 + 12);
    expect(BENEFIT_PER_LAMP).toBe(2);
  });
  it('a lamp is worth it to the street but not to one payer', () => {
    expect(STREET_BENEFIT_PER_LAMP).toBe(10);
    expect(STREET_BENEFIT_PER_LAMP).toBeGreaterThan(LAMP_COST);
    expect(BENEFIT_PER_LAMP).toBeLessThan(LAMP_COST);
  });
  it('plays a week: everyone gets the same light, and the free rider does best', () => {
    const w1 = playWeek(1, 10);
    expect(w1.total).toBe(28);
    expect(w1.lamps).toBe(5);
    expect(w1.gifts.map((g) => g.payoff)).toEqual([10, 12, 14, 16, 20]);
    const w3 = playWeek(3, 4);
    expect(w3.total).toBe(12);
    expect(w3.lamps).toBe(2);
    const dev = w3.gifts.find((g) => g.id === 'dev')!;
    expect(dev.payoff).toBe(Math.max(...w3.gifts.map((g) => g.payoff)));
  });
  it('giving alone can never light the whole street, even if the student gives everything', () => {
    for (let w = 1; w <= VOLUNTARY_WEEKS; w++) {
      expect(fullyLitPossible(w)).toBe(false);
      for (const g of GIFTS) expect(playWeek(w, g).lamps).toBeLessThan(LAMPS);
    }
    expect(Math.max(...GIFTS)).toBe(ENDOWMENT);
  });
  it('the council tax ($30 / 5 = $6) lights every lamp', () => {
    expect(taxPerHousehold(30, 5)).toBe(6);
    expect(COUNCIL_TAX).toBe(6);
    const tax = playWeek(WEEKS, 0);
    expect(tax.taxed).toBe(true);
    expect(tax.total).toBe(30);
    expect(tax.lamps).toBe(LAMPS);
    expect(tax.gifts.every((g) => g.gift === 6 && g.payoff === 4 + 12)).toBe(true);
    // Everyone is better off than the worst-lit voluntary week.
    expect(tax.gifts[0].payoff).toBeGreaterThan(playWeek(5, 0).gifts[0].payoff);
  });
});

describe('Streetlight Fund: the council tax', () => {
  it('tax per household = items × cost / households', () => {
    expect(totalCost(40, 150)).toBe(6000);
    expect(councilTax(40, 150, 200)).toBe(30);
    expect(councilTax(1, 9000, 450)).toBe(20);
    expect(councilTax(3, 400000, 4000)).toBe(300);
    expect(councilTax(3, 80000, 12000)).toBe(20);
  });
  it('names the common slips, leaving out any that match the answer', () => {
    const m = Object.fromEntries(taxMistakes(40, 150, 200).map((x) => [x.kind, x.value]));
    expect(m).toEqual({ total: 6000, noMultiply: 0.75, byItems: 150, times: 1200000 });
    // One item: cost / households is the right answer, and total / items is the total.
    expect(taxMistakes(1, 9000, 450).map((x) => x.kind)).toEqual(['total', 'times']);
  });
  it('reads typed numbers', () => {
    expect(parseNumber('30')).toBe(30);
    expect(parseNumber('$1,200')).toBe(1200);
    expect(parseNumber('0.75')).toBe(0.75);
    expect(parseNumber('abc')).toBeNaN();
    expect(numberRight(30.004, 30)).toBe(true);
    expect(numberRight(31, 30)).toBe(false);
  });
  it('lamps show progress through a level', () => {
    expect(progressLamps(0, 10)).toBe(0);
    expect(progressLamps(5, 10)).toBe(3);
    expect(progressLamps(10, 10)).toBe(6);
    expect(progressLamps(1, 4)).toBe(2);
    expect(progressLamps(0, 0)).toBe(0);
  });
});

describe('Streetlight Fund: goals', () => {
  it('goals count first-try answers and can be reached with the content', () => {
    expect(sortWon(SORT_GOAL)).toBe(true);
    expect(sortWon(SORT_GOAL - 1)).toBe(false);
    expect(t.goods.length).toBe(10);
    expect(SORT_GOAL).toBeLessThanOrEqual(t.goods.length);
    expect(SORT_GOAL).toBeGreaterThan(t.goods.length / 2);
    expect(fundWon(FUND_GOAL)).toBe(true);
    expect(fundWon(FUND_GOAL - 1)).toBe(false);
    expect(t.weeks.length).toBe(WEEKS);
    expect(FUND_GOAL).toBeLessThanOrEqual(WEEKS);
    expect(councilWon(COUNCIL_GOAL)).toBe(true);
    expect(councilWon(COUNCIL_GOAL - 1)).toBe(false);
    const max = t.cases.length * POINTS_PER_CASE;
    expect(max).toBe(12);
    expect(COUNCIL_GOAL).toBeLessThanOrEqual(max);
    expect(COUNCIL_GOAL).toBeGreaterThan(max / 2);
  });
});

describe('Streetlight Fund: content', () => {
  it('level 1 goods: hand-checked kinds, and every kind is used', () => {
    const by = Object.fromEntries(t.goods.map((g) => [g.id, g.kind]));
    expect(by).toEqual({
      streetlight: 'public', defence: 'public', pizza: 'private', gym: 'club', fish: 'common',
      lighthouse: 'public', toll: 'club', fireworks: 'public', tshirt: 'private', field: 'common',
    });
    for (const k of KINDS) expect(t.goods.some((g) => g.kind === k), k).toBe(true);
    for (const g of t.goods) {
      expect(Object.keys(t.kindNames)).toContain(g.kind);
      // The feature texts agree with the kind.
      const f = featuresOf(g.kind as Kind);
      expect(g.rival.includes('non-rivalrous'), g.id).toBe(!f.rival);
      expect(g.excl.includes('non-excludable'), g.id).toBe(!f.excludable);
    }
  });
  it('level 2: every week has exactly one right answer, with feedback for each option', () => {
    for (const w of t.weeks) {
      expect(w.options.filter((o) => 'correct' in o && o.correct).length, w.prompt).toBe(1);
      for (const o of w.options) expect(o.feedback.length).toBeGreaterThan(10);
    }
    // The questions match the game: Dev gives $0 in week 1, the tax is $6, five households.
    expect(t.weeks[0].prompt).toContain('Dev gave $0');
    expect(neighbourGift(NEIGHBOURS[3], 1)).toBe(0);
    expect(t.weeks[5].prompt).toContain(`$${COUNCIL_TAX}`);
    expect(t.weeks[3].prompt).toContain(`$${LAMP_COST}`);
    expect(t.weeks[3].prompt).toContain(`$${BENEFIT_PER_LAMP}`);
  });
  it('level 3 cases: hand-checked tax, both ways used, one right judgement, no slip gives the answer', () => {
    const expected: Record<string, { way: Way; tax: number }> = {
      lights: { way: 'direct', tax: 30 },
      fireworks: { way: 'contract', tax: 20 },
      flood: { way: 'contract', tax: 300 },
      lighthouse: { way: 'direct', tax: 20 },
    };
    for (const c of t.cases) {
      expect(c.way).toBe(expected[c.id].way);
      expect(councilTax(c.items, c.costEach, c.households)).toBe(expected[c.id].tax);
      expect(c.options.filter((o) => 'correct' in o && o.correct).length, c.id).toBe(1);
      for (const s of taxMistakes(c.items, c.costEach, c.households)) expect(Math.abs(s.value - expected[c.id].tax)).toBeGreaterThan(0.01);
    }
    for (const w of WAYS) expect(t.cases.some((c) => c.way === w), w).toBe(true);
    expect(new Set(t.cases.map((c) => c.judge))).toEqual(new Set(['advantage', 'disadvantage']));
  });
  it('check it: 8 or 9 questions, a label question, number answers hand-checked with slip feedback', () => {
    expect(content.check.length).toBeGreaterThanOrEqual(8);
    expect(content.check.length).toBeLessThanOrEqual(9);
    expect(content.check.some((q) => q.type === 'label')).toBe(true);
    for (const q of content.check) {
      expect(q.hints).toHaveLength(2);
      expect(q.worked.length).toBeGreaterThan(10);
      expect(q.explanation.length).toBeGreaterThan(10);
      if (q.type === 'choice') expect(q.options!.filter((o) => 'correct' in o && o.correct).length, q.id).toBe(1);
    }
    const nq = (id: string) => content.check.find((q) => q.id === id) as unknown as NumberQuestion;
    expect(nq('q5').answer).toBe(councilTax(50, 120, 300));
    expect(nq('q9').answer).toBe(taxPerHousehold(30, 3));
    expect(checkNumber(nq('q5'), 6000).feedback).toMatch(/total cost/);
    expect(checkNumber(nq('q5'), 120).feedback).toMatch(/number of lights/);
    expect(checkNumber(nq('q9'), 6).feedback).toMatch(/all five/);
    for (const id of ['q5', 'q9']) for (const m of nq(id).mistakes!) expect(checkNumber(nq(id), m.value).ok, `${id} ${m.value}`).toBe(false);
    // The label grid: one tag per box.
    const label = content.check.find((q) => q.type === 'label')!;
    expect(label.diagram!.tags!.length).toBe(4);
    expect(label.slots!.map((s) => s.answer)).toEqual(['Private goods', 'Club goods', 'Common pool resources', 'Public goods']);
    for (const s of label.slots!) expect(label.choices).toContain(s.answer);
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
