import { describe, expect, it } from 'vitest';
import {
  bestOutput, bestReply, cell, cheatGain, concentrationRatio, crMistakes, customersToYou, dominantStrategy, DUEL_GOAL, duelMax, duelWon, equilibrium,
  isPrisonersDilemma, jointBest, MAP_GOAL, mapWon, Matrix, mcEqualsMrOutput, numberRight, outputSlip, parseNumber, powerRank, priceMistakes, priceTaker,
  PROFIT_GOAL, profitKind, profitMistakes, profitWon, POINTS_PER_PROFIT_ROUND, rivalBestReply, rivalDominantStrategy, rowAt, rows, Schedule,
  Structure, STRUCTURES, tally, titForTat, trMaxOutputs, uniqueBest,
} from '../src/activities/monopoly-game/model';
import { checkNumber } from '../src/shared/activity/CheckIt';
import type { NumberQuestion } from '../src/shared/activity/types';
import content from '../public/content/activities/monopoly-game.json';
import glossary from '../public/content/glossary.json';

const t = content.try;
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

// A hand-checked schedule (the mountain village).
// TR = P × Q: 20, 36, 48, 56, 60, 60, 56, 48. TC: 10 (fixed), 20, 26, 32, 39, 49, 62, 78, 97.
// MR: 20, 16, 12, 8, 4, 0, −4, −8. MC: 10, 6, 6, 7, 10, 13, 16, 19.
// Profit: 0, 10, 16, 17, 11, −2, −22, −49. Best at Q = 4: MR 8 ≥ MC 7, and at Q = 5 MC 10 > MR 4.
const village: Schedule = { prices: [20, 18, 16, 14, 12, 10, 8, 6], costs: [10, 20, 26, 32, 39, 49, 62, 78, 97] };

describe('Rival Pricing: market structures', () => {
  it('orders the structures from no market power to the most', () => {
    expect(STRUCTURES).toEqual(['perfect', 'monopolistic', 'oligopoly', 'monopoly']);
    expect(powerRank('perfect')).toBe(0);
    expect(powerRank('monopoly')).toBe(3);
  });
  it('only a perfectly competitive firm is a price taker', () => {
    expect(priceTaker('perfect')).toBe(true);
    for (const s of ['monopolistic', 'oligopoly', 'monopoly'] as Structure[]) expect(priceTaker(s)).toBe(false);
  });
  it('the concentration ratio adds the shares of the largest firms', () => {
    const shares = [14, 27, 8, 21, 16, 6];
    expect(concentrationRatio(shares, 4)).toBe(27 + 21 + 16 + 14); // 78
    expect(concentrationRatio(shares, 3)).toBe(64);
    expect(concentrationRatio([3, 4, 2, 1, 2], 4)).toBe(11);
  });
  it('names the common slips in a concentration ratio', () => {
    const m = Object.fromEntries(crMistakes([14, 27, 8, 21, 16, 6], 4).map((x) => [x.kind, x.value]));
    expect(m.firstN).toBe(70); // 14 + 27 + 8 + 21: the first four listed
    expect(m.all).toBe(92);
    expect(m.whole).toBe(100);
    expect(m.tooFew).toBe(64);
    close(m.average, 19.5);
    // Already sorted: the first four are the biggest four, so that slip is left out.
    expect(crMistakes([40, 30, 20, 10], 4).some((x) => x.kind === 'firstN')).toBe(false);
  });
});

describe('Rival Pricing: profit from a schedule', () => {
  it('builds TR, MR, MC, AC and profit from the data', () => {
    const r = rows(village);
    expect(r.map((x) => x.tr)).toEqual([20, 36, 48, 56, 60, 60, 56, 48]);
    expect(r.map((x) => x.mr)).toEqual([20, 16, 12, 8, 4, 0, -4, -8]);
    expect(r.map((x) => x.mc)).toEqual([10, 6, 6, 7, 10, 13, 16, 19]);
    expect(r.map((x) => x.profit)).toEqual([0, 10, 16, 17, 11, -2, -22, -49]);
    close(rowAt(village, 4).ac, 39 / 4);
  });
  it('the MC = MR rule gives the same output as the biggest TR − TC', () => {
    expect(bestOutput(village)).toBe(4);
    expect(mcEqualsMrOutput(village)).toBe(4);
    expect(uniqueBest(village)).toBe(true);
    expect(trMaxOutputs(village)).toEqual([5, 6]);
  });
  it('classifies profit: AR > AC abnormal, AR = AC normal, AR < AC loss', () => {
    expect(profitKind(village)).toBe('abnormal');
    // Normal profit: TR = TC = 48 at Q = 4.
    expect(profitKind({ prices: [15, 14, 13, 12, 11, 10, 9, 8], costs: [20, 28, 34, 40, 48, 58, 70, 84, 100] })).toBe('normal');
    // Loss: at Q = 3, TR 42 and TC 64.
    expect(profitKind({ prices: [18, 16, 14, 12, 10, 8, 6, 4], costs: [40, 49, 56, 64, 73, 84, 97, 112, 129] })).toBe('loss');
  });
  it('names why an output is wrong', () => {
    expect(outputSlip(village, 4)).toBe('right');
    expect(outputSlip(village, 5)).toBe('trMax');
    expect(outputSlip(village, 6)).toBe('trMax');
    expect(outputSlip(village, 2)).toBe('before');
    expect(outputSlip(village, 7)).toBe('after');
  });
  it('names the common slips for the price and the profit', () => {
    const p = Object.fromEntries(priceMistakes(village).map((x) => [x.kind, x.value]));
    expect(p).toEqual({ mr: 8, mc: 7, tr: 56, ac: 9.75 });
    const f = Object.fromEntries(profitMistakes(village).map((x) => [x.kind, x.value]));
    expect(f.trOnly).toBe(56);
    expect(f.pMinusMc).toBe((14 - 7) * 4); // 28
    expect(f.trMaxRow).toBe(11);
    expect(f.sign).toBe(-17);
  });
  it('rejects a schedule without a cost at Q = 0', () => {
    expect(() => rows({ prices: [10, 9], costs: [5, 8] })).toThrow();
  });
});

const PD: Matrix = { 'high-high': [600, 600], 'high-low': [200, 800], 'low-high': [800, 200], 'low-low': [400, 400] };

describe('Rival Pricing: the payoff matrix', () => {
  it('finds the best reply, the dominant strategy and the equilibrium', () => {
    expect(bestReply(PD, 'high')).toBe('low'); // 800 > 600
    expect(bestReply(PD, 'low')).toBe('low'); // 400 > 200
    expect(rivalBestReply(PD, 'high')).toBe('low');
    expect(dominantStrategy(PD)).toBe('low');
    expect(rivalDominantStrategy(PD)).toBe('low');
    expect(equilibrium(PD)).toEqual(['low', 'low']);
  });
  it('collusion (both high) earns the most together, and cheating gains $200', () => {
    expect(jointBest(PD)).toEqual(['high', 'high']);
    expect(cheatGain(PD)).toBe(200);
    expect(isPrisonersDilemma(PD)).toBe(true);
  });
  it('a game where cooperation is already best is not a prisoner\'s dilemma', () => {
    const easy: Matrix = { 'high-high': [9, 9], 'high-low': [5, 4], 'low-high': [4, 5], 'low-low': [2, 2] };
    expect(dominantStrategy(easy)).toBe('high');
    expect(isPrisonersDilemma(easy)).toBe(false);
    const none: Matrix = { 'high-high': [5, 5], 'high-low': [1, 1], 'low-high': [1, 1], 'low-low': [5, 5] };
    expect(dominantStrategy(none)).toBe(null);
  });
  it('the rival plays tit-for-tat: high first, then your last price', () => {
    expect(titForTat([], 0)).toBe('high');
    expect(titForTat(['low'], 1)).toBe('low');
    expect(titForTat(['low', 'high'], 2)).toBe('high');
  });
  it('tallies profits over the weeks', () => {
    // Week 1: you low, rival high: 800 / 200. Week 2: you low, rival low: 400 / 400. Week 3: you high, rival low: 200 / 800.
    const r = tally(PD, ['low', 'low', 'high']);
    expect(r.weeks.map((w) => w.rival)).toEqual(['high', 'low', 'low']);
    expect(r.you).toBe(1400);
    expect(r.rival).toBe(1400);
    expect(tally(PD, ['high', 'high', 'high', 'high', 'high']).you).toBe(3000);
    expect(tally(PD, ['low', 'low', 'low', 'low', 'low']).you).toBe(800 + 4 * 400);
  });
  it('customers walk to the cheaper café', () => {
    expect(customersToYou('low', 'high')).toBe(5);
    expect(customersToYou('high', 'low')).toBe(1);
    expect(customersToYou('high', 'high')).toBe(3);
    expect(cell(PD, 'high', 'low')).toEqual([200, 800]);
  });
});

describe('Rival Pricing: numbers and goals', () => {
  it('reads typed numbers, including negatives', () => {
    expect(parseNumber('17')).toBe(17);
    expect(parseNumber('$17')).toBe(17);
    expect(parseNumber('-22')).toBe(-22);
    expect(parseNumber('−22')).toBe(-22);
    expect(parseNumber('78%')).toBe(78);
    expect(parseNumber('abc')).toBeNaN();
    expect(numberRight(26.67, 80 / 3)).toBe(true);
    expect(numberRight(27, 80 / 3)).toBe(false);
  });
  it('goals count first-try answers and can be reached with the content', () => {
    expect(mapWon(MAP_GOAL)).toBe(true);
    expect(mapWon(MAP_GOAL - 1)).toBe(false);
    expect(t.items.length).toBe(10);
    expect(MAP_GOAL).toBeLessThanOrEqual(t.items.length);
    expect(MAP_GOAL).toBeGreaterThan(t.items.length / 2);
    const profitMax = t.rounds.length * POINTS_PER_PROFIT_ROUND;
    expect(profitMax).toBe(20);
    expect(profitWon(PROFIT_GOAL)).toBe(true);
    expect(profitWon(PROFIT_GOAL - 1)).toBe(false);
    expect(PROFIT_GOAL).toBeGreaterThan(profitMax / 2);
    const duel = duelMax(t.weeks, t.judgements.length);
    expect(duel).toBe(4 + 5 * 2 + 4);
    expect(duelWon(DUEL_GOAL)).toBe(true);
    expect(duelWon(DUEL_GOAL - 1)).toBe(false);
    expect(DUEL_GOAL).toBeLessThanOrEqual(duel);
    expect(DUEL_GOAL).toBeGreaterThan(duel / 2);
  });
});

describe('Rival Pricing: content', () => {
  it('level 1 covers all four structures, with two concentration ratio rounds', () => {
    for (const s of STRUCTURES) expect(t.items.some((i) => i.structure === s), s).toBe(true);
    const crs = t.items.filter((i) => i.kind === 'cr');
    expect(crs.length).toBe(2);
    const by = Object.fromEntries(t.items.map((i) => [i.id, i.structure]));
    expect(by).toMatchObject({ water: 'monopoly', coffee: 'monopolistic', wheat: 'perfect', airlines: 'oligopoly', mobile: 'oligopoly' });
  });

  it('level 1 concentration ratios are hand-checked, listed out of order, and no slip gives the answer', () => {
    const expected: Record<string, number> = { grocers: 78, restaurants: 11 };
    for (const i of t.items) {
      if (i.kind !== 'cr' || !('firms' in i)) continue;
      const shares = i.firms!.map((f) => f.share);
      expect(concentrationRatio(shares, i.n!), i.id).toBe(expected[i.id]);
      expect(shares.reduce((a, b) => a + b, 0) + i.others!, i.id).toBe(100);
      expect(shares, i.id).not.toEqual([...shares].sort((a, b) => b - a));
      for (const s of crMistakes(shares, i.n)) expect(s.value, i.id).not.toBe(expected[i.id]);
    }
  });

  it('level 2 rounds: hand-checked output, price and profit, with exactly one best output', () => {
    const expected: Record<string, { q: number; p: number; profit: number; kind: string }> = {
      village: { q: 4, p: 14, profit: 17, kind: 'abnormal' },
      highstreet: { q: 4, p: 12, profit: 0, kind: 'normal' },
      park: { q: 3, p: 14, profit: -22, kind: 'loss' },
      station: { q: 3, p: 35, profit: 25, kind: 'abnormal' },
      campus: { q: 5, p: 20, profit: 24, kind: 'abnormal' },
    };
    for (const r of t.rounds) {
      const e = expected[r.id];
      expect(bestOutput(r), r.id).toBe(e.q);
      expect(mcEqualsMrOutput(r), r.id).toBe(e.q);
      expect(uniqueBest(r), r.id).toBe(true);
      expect(rowAt(r, e.q).p, r.id).toBe(e.p);
      expect(rowAt(r, e.q).profit, r.id).toBe(e.profit);
      expect(profitKind(r), r.id).toBe(e.kind);
      // The TR-max trap is a different row, and no slip gives the right number.
      expect(trMaxOutputs(r), r.id).not.toContain(e.q);
      for (const s of priceMistakes(r)) expect(s.value, r.id).not.toBe(e.p);
      for (const s of profitMistakes(r)) expect(s.value, r.id).not.toBe(e.profit);
      // MC is rising where MC crosses MR.
      expect(rowAt(r, e.q + 1).mc, r.id).toBeGreaterThan(rowAt(r, e.q + 1).mr);
    }
    const kinds = new Set(t.rounds.map((r) => profitKind(r)));
    expect(kinds).toEqual(new Set(['abnormal', 'normal', 'loss']));
  });

  it('level 3 uses a prisoner\'s dilemma, and each judgement has exactly one right answer', () => {
    const m = t.matrix as unknown as Matrix;
    expect(isPrisonersDilemma(m)).toBe(true);
    expect(dominantStrategy(m)).toBe('low');
    // The judgement texts quote the matrix numbers.
    expect(cell(m, 'high', 'high')[0] + cell(m, 'high', 'high')[1]).toBe(1200);
    expect(cell(m, 'low', 'low')[0] + cell(m, 'low', 'low')[1]).toBe(800);
    expect(cell(m, 'low', 'high')[0]).toBe(800);
    for (const j of t.judgements) {
      expect(j.options.filter((o) => 'correct' in o && o.correct).length, j.id).toBe(1);
      for (const o of j.options) expect(o.feedback.length, j.id).toBeGreaterThan(10);
    }
    expect(JSON.stringify(t.judgements)).toMatch(/illegal/);
  });

  it('check it: 8 or 9 questions with a label question, hand-checked numbers and slips', () => {
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
    // q3: the schedule in the table. Best output 4: profit 64 − 46 = 18.
    const q3 = nq('q3');
    const rowsQ3 = q3.table!.rows.slice(1) as number[][];
    const sched: Schedule = { prices: rowsQ3.map((r) => r[1]), costs: [12, ...rowsQ3.map((r) => r[3])] };
    expect(bestOutput(sched)).toBe(4);
    expect(rowAt(sched, 4).profit).toBe(q3.answer);
    expect(q3.answer).toBe(18);
    // The MR and MC columns in the table match the TR and TC columns.
    for (const r of rows(sched)) {
      expect(rowsQ3[r.q - 1][2]).toBe(r.tr);
      expect(rowsQ3[r.q - 1][4]).toBe(r.mr);
      expect(rowsQ3[r.q - 1][5]).toBe(r.mc);
    }
    expect(nq('q4').answer).toBe(99 - 84);
    const q5 = nq('q5');
    const shares = (q5.table!.rows as [string, number][]).filter((r) => r[0] !== 'All other firms').map((r) => r[1]);
    expect(concentrationRatio(shares, 4)).toBe(q5.answer);
    expect(q5.answer).toBe(80);
    expect(checkNumber(q5, 69).feedback).toMatch(/first four/);
    expect(checkNumber(q3, 72).feedback).toMatch(/highest TR/);
    for (const id of ['q3', 'q4', 'q5']) for (const m of nq(id).mistakes!) expect(checkNumber(nq(id), m.value).ok, `${id} ${m.value}`).toBe(false);
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
