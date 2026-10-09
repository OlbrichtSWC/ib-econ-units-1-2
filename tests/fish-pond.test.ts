import { describe, expect, it } from 'vitest';
import {
  birthOptions, births, cheatPays, cheats, COLLAPSE, expectedFine, HEALTHY, L1_CHOICES, L1_GOAL, L1_SEASONS, L1_START, l1Wants, l1Won, L2_GOAL,
  L2_NO_RULE, L2_SEASONS, L2_START, l2Won, L3_EXTRA, L3_GOAL, L3_SEASONS, L3_START, l3BotWants, l3Choices, l3Limit, l3Won, nextStock,
  playSeason, POINTS_PER_RULE, roundHalfUp, ruleTrend, safeCatch, shareCatch, stockPath, survives, sustainableCatch, trendOf,
} from '../src/activities/fish-pond/model';
import { checkNumber } from '../src/shared/activity/CheckIt';
import type { NumberQuestion } from '../src/shared/activity/types';
import content from '../public/content/activities/fish-pond.json';
import glossary from '../public/content/glossary.json';

const t = content.try;
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

describe('Fish Pond: breeding and fishing', () => {
  it('rounds half up', () => {
    expect(roundHalfUp(12.5)).toBe(13);
    expect(roundHalfUp(11.49)).toBe(11);
  });
  it('new fish = 0.5 × left × (1 − left ÷ 100), rounded; none below the collapse line', () => {
    expect(births(40)).toBe(12); // 20 × 0.6
    expect(births(60)).toBe(12); // 30 × 0.4
    expect(births(20)).toBe(8); // 10 × 0.8
    expect(births(80)).toBe(8); // 40 × 0.2
    expect(births(50)).toBe(13); // 25 × 0.5 = 12.5
    expect(births(62)).toBe(12); // 31 × 0.38 = 11.78
    expect(births(10)).toBe(5); // 5 × 0.9 = 4.5
    expect(births(COLLAPSE - 1)).toBe(0);
    expect(births(100)).toBe(0);
  });
  it('next stock = fish left + new fish, never above 100, and 0 after a collapse', () => {
    expect(nextStock(40)).toBe(52);
    expect(nextStock(95)).toBe(97); // 47.5 × 0.05 = 2.375
    expect(nextStock(100)).toBe(100);
    expect(nextStock(9)).toBe(0);
  });
  it('shares out the fish when the boats want more than the pond holds', () => {
    expect(shareCatch(30, [3, 5])).toEqual([3, 5]);
    expect(shareCatch(10, [5, 5, 5, 5])).toEqual([2, 2, 2, 2]);
    expect(shareCatch(10, [0, 10, 10])).toEqual([0, 5, 5]);
    expect(sum(shareCatch(7, [3, 5, 5, 5]))).toBeLessThanOrEqual(7);
  });
  it('plays a season: fish, then breed', () => {
    const s = playSeason(80, [3, 5, 5, 5]);
    expect(s).toEqual({ start: 80, catches: [3, 5, 5, 5], caught: 18, left: 62, born: 12, end: 74, collapsed: false });
    const c = playSeason(20, [3, 5, 5, 5]);
    expect(c.left).toBe(2);
    expect(c.collapsed).toBe(true);
    expect(c.end).toBe(0);
  });
  it('stock paths, survival and the sustainable catch', () => {
    expect(stockPath(50, [12, 12])).toEqual([50, 50, 50]);
    // 30 + 10.5 → 41; 21 + 8.3 → 29; 9 left → collapse.
    expect(stockPath(50, [20, 20, 20, 20])).toEqual([50, 41, 29, 0]);
    expect(survives(50, [20, 20, 20, 20])).toBe(false);
    expect(survives(50, [12, 12, 12])).toBe(true);
    // 38 left + 12 born = 50; 37 left + 12 born = 49.
    expect(sustainableCatch(50)).toBe(12);
    expect(sustainableCatch(40)).toBe(10); // 30 left + 11 born = 41; 29 left + 10 born = 39
  });
});

describe('Fish Pond: level 1', () => {
  it('three computer fishers take 5 each, and only a small catch saves the pond', () => {
    expect(l1Wants(3)).toEqual([3, 5, 5, 5]);
    const path3 = stockPath(L1_START, Array.from({ length: L1_SEASONS }, () => 18));
    expect(path3).toEqual([80, 74, 68, 63, 57, 51, 44, 36, 25]);
    expect(survives(L1_START, Array.from({ length: L1_SEASONS }, () => 20))).toBe(false);
    expect(safeCatch(L1_START, L1_SEASONS)).toBe(3);
    // Even catching 1 fish, the stock falls: the others take more than the pond makes.
    const path1 = stockPath(L1_START, Array.from({ length: L1_SEASONS }, () => 16));
    expect(path1[path1.length - 1]).toBeLessThan(L1_START);
    expect(safeCatch(20, 3)).toBeNull();
  });
  it('the safe catch is always one of the choices while the pond can be saved', () => {
    for (let s = 30; s <= 100; s++) {
      const c = safeCatch(s, 1);
      if (c !== null) expect(L1_CHOICES).toContain(c);
    }
  });
  it('birth options: one right answer, four different numbers, the slips named', () => {
    const o = birthOptions(80, 62);
    expect(o.map((x) => x.value)).toEqual([12, 31, 8, 74]);
    for (const [start, left] of [[80, 62], [50, 50], [74, 56], [60, 40], [40, 22], [30, 12]]) {
      const opts = birthOptions(start, left);
      expect(opts).toHaveLength(4);
      expect(new Set(opts.map((x) => x.value)).size).toBe(4);
      expect(opts.filter((x) => x.slip === 'right')).toHaveLength(1);
      expect(opts.find((x) => x.slip === 'right')!.value).toBe(births(left));
    }
  });
  it('the goal needs the pond alive and 6 of 8 right first time', () => {
    expect(t.l1Questions.length + 1).toBe(L1_SEASONS);
    expect(l1Won(true, L1_GOAL)).toBe(true);
    expect(l1Won(true, L1_GOAL - 1)).toBe(false);
    expect(l1Won(false, 8)).toBe(false);
    expect(L1_GOAL).toBeGreaterThan(L1_SEASONS / 2);
  });
  it('every question has exactly one right answer and feedback for each option', () => {
    for (const q of t.l1Questions) {
      expect(q.options.filter((o) => 'correct' in o && o.correct).length, q.id).toBe(1);
      for (const o of q.options) expect(o.feedback.length, q.id).toBeGreaterThan(10);
    }
    for (const k of ['prompt', 'right', 'noCrowding', 'beforeFishing', 'stock', 'near']) expect((t.births as Record<string, string>)[k]).toBeTruthy();
  });
});

describe('Fish Pond: level 2', () => {
  it('names the trend of a stock path', () => {
    expect(trendOf([50, 52])).toBe('same');
    expect(trendOf([50, 55])).toBe('grows');
    expect(trendOf([50, 45])).toBe('falls');
    expect(trendOf([50, 41, 0])).toBe('collapses');
  });
  it('hand-checked trends from a pond of 50 over 6 seasons', () => {
    expect(stockPath(L2_START, Array(L2_SEASONS).fill(8))).toEqual([50, 54, 58, 63, 67, 71, 75]);
    expect(stockPath(L2_START, Array(L2_SEASONS).fill(10))).toEqual([50, 52, 54, 56, 58, 60, 63]);
    expect(stockPath(L2_START, Array(L2_SEASONS).fill(14))).toEqual([50, 48, 45, 42, 38, 33, 27]);
    expect(ruleTrend(8)).toBe('grows');
    expect(ruleTrend(10)).toBe('grows');
    expect(ruleTrend(12)).toBe('same');
    expect(ruleTrend(14)).toBe('falls');
    expect(ruleTrend(L2_NO_RULE)).toBe('collapses');
  });
  it('each rule gives the expected result, and the result text matches the total', () => {
    const expected: Record<string, { total: number; trend: string }> = {
      quota: { total: 8, trend: 'grows' },
      permits: { total: 12, trend: 'same' },
      group: { total: 10, trend: 'grows' },
      licence: { total: 14, trend: 'falls' },
      treaty: { total: 12, trend: 'same' },
    };
    expect(t.rules.map((r) => r.id).sort()).toEqual(Object.keys(expected).sort());
    for (const r of t.rules) {
      const total = sum(r.wants);
      expect(total, r.id).toBe(expected[r.id].total);
      expect(ruleTrend(total), r.id).toBe(expected[r.id].trend);
      expect(r.result, r.id).toContain(`${total} fish in all`);
      expect(r.wants).toHaveLength(t.boats.length);
    }
  });
  it('every strength and limitation has exactly one right answer', () => {
    for (const r of t.rules) {
      expect(r.strengths.filter((o) => 'correct' in o && o.correct).length, r.id).toBe(1);
      expect(r.limits.filter((o) => 'correct' in o && o.correct).length, r.id).toBe(1);
    }
  });
  it('the goal can be reached', () => {
    const max = t.rules.length * POINTS_PER_RULE;
    expect(max).toBe(15);
    expect(l2Won(L2_GOAL)).toBe(true);
    expect(l2Won(L2_GOAL - 1)).toBe(false);
    expect(L2_GOAL).toBeLessThanOrEqual(max);
  });
});

describe('Fish Pond: level 3', () => {
  const plan = (extra: number[] = []) =>
    Array.from({ length: L3_SEASONS }, (_, i) => {
      const s = i + 1;
      return l3Limit(s) + (extra.includes(s) ? L3_EXTRA : 0) + sum(l3BotWants(s));
    });
  it('the limit is 3 per boat, then 2 from season 5; Cy cheats in seasons 2 and 3', () => {
    expect(l3Limit(1)).toBe(3);
    expect(l3Limit(4)).toBe(3);
    expect(l3Limit(5)).toBe(2);
    expect(l3BotWants(1)).toEqual([3, 3, 3]);
    expect(l3BotWants(2)).toEqual([3, 3, 8]);
    expect(l3BotWants(4)).toEqual([3, 3, 3]);
    expect(l3BotWants(6)).toEqual([2, 2, 2]);
    expect(cheats(3)).toBe(true);
    expect(cheats(4)).toBe(false);
    expect(l3Choices(3)).toEqual([2, 3, 6]);
  });
  it('keeping the limit brings the pond back to the healthy level; one extra catch does not', () => {
    expect(plan()).toEqual([12, 17, 17, 12, 8, 8, 8, 8, 8, 8]);
    const p = stockPath(L3_START, plan());
    expect(p).toEqual([50, 50, 44, 37, 34, 36, 38, 41, 44, 48, 52]);
    expect(p[p.length - 1]).toBeGreaterThanOrEqual(HEALTHY);
    const greedy = stockPath(L3_START, plan([6]));
    expect(greedy[greedy.length - 1]).toBeLessThan(HEALTHY);
  });
  it('the numbers in the questions match the model', () => {
    const p = stockPath(L3_START, plan());
    const q = (id: string) => t.l3Questions.find((x) => x.id === id)!;
    expect(q('monitor').prompt).toContain(`fell to ${p[2]}`);
    expect(q('monitor').prompt).toContain(`${sustainableCatch(50)} new fish`);
    const s4 = playSeason(p[3], [3, ...l3BotWants(4)]);
    expect(q('lower').prompt).toContain(`stock is ${s4.end}`);
    expect(q('lower').prompt).toContain(`only ${s4.born} new fish`);
    expect(q('why').prompt).toContain(`caught ${8}`);
  });
  it('a fine works only when the expected fine is more than the gain', () => {
    expect(expectedFine(12, 0.5)).toBe(6);
    expect(cheatPays(5, 12, 0.5)).toBe(false);
    expect(cheatPays(5, 9, 0.5)).toBe(true);
    expect(cheatPays(5, 10, 0.5)).toBe(false); // equal: no gain from cheating
    const fine = t.l3Questions.find((x) => x.id === 'fine')!;
    for (const o of fine.options) {
      const f = Number(o.text.match(/\d+/)![0]);
      expect(!cheatPays(5, f, 0.5), o.text).toBe(!!('correct' in o && o.correct));
    }
  });
  it('every question has exactly one right answer, and the goal can be reached', () => {
    for (const q of t.l3Questions) {
      expect(q.options.filter((o) => 'correct' in o && o.correct).length, q.id).toBe(1);
      expect(q.after).toBeGreaterThanOrEqual(1);
      expect(q.after).toBeLessThanOrEqual(L3_SEASONS);
    }
    expect(t.l3Questions).toHaveLength(6);
    expect(l3Won(52, L3_GOAL)).toBe(true);
    expect(l3Won(49, 6)).toBe(false);
    expect(l3Won(52, L3_GOAL - 1)).toBe(false);
  });
});

describe('Fish Pond: content', () => {
  it('check it: 8 or 9 questions with a label question, two number questions from the model', () => {
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
    expect(nq('q4').answer).toBe(nextStock(40));
    expect(nq('q5').answer).toBe(sustainableCatch(50));
    for (const [left, born] of nq('q5').table!.rows as number[][]) expect(births(left)).toBe(born);
    expect(checkNumber(nq('q4'), 12).feedback).toMatch(/new fish/);
    expect(checkNumber(nq('q5'), 14).feedback).toMatch(/falls/);
    for (const id of ['q4', 'q5']) for (const m of nq(id).mistakes!) expect(checkNumber(nq(id), m.value).ok, `${id} ${m.value}`).toBe(false);
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
