import { describe, expect, it } from 'vitest';
import {
  FAIRNESS, FLOW_GOAL, flowMax, flowWidth, flowWon, incomeShare, isEfficient, isEquitable, JUDGE_GOAL, judgeWon, numberRight,
  parseNumber, round2, SORT_GOAL, sortWon, tilt, total, VERDICTS, verdictOf, verdictTilt,
} from '../src/activities/fair-efficient/model';
import content from '../public/content/activities/fair-efficient.json';
import glossary from '../public/content/glossary.json';

const t = content.try;
const incomes = t.households.map((h) => h.income);

describe('Fair or Efficient?: verdicts', () => {
  it('splits each verdict into efficiency and equity, and builds it back', () => {
    expect(isEfficient('efficient')).toBe(true);
    expect(isEquitable('efficient')).toBe(false);
    expect(isEfficient('equitable')).toBe(false);
    expect(isEquitable('equitable')).toBe(true);
    expect(isEfficient('both') && isEquitable('both')).toBe(true);
    expect(isEfficient('neither') || isEquitable('neither')).toBe(false);
    for (const v of VERDICTS) expect(verdictOf(isEfficient(v), isEquitable(v))).toBe(v);
  });
  it('the scale tips toward the heavier pan and never past its limit', () => {
    expect(tilt(3, 1)).toBe(-12);
    expect(tilt(1, 3)).toBe(12);
    expect(tilt(2, 2)).toBe(0);
    expect(tilt(10, 0)).toBe(-18);
    expect(tilt(0, 10)).toBe(18);
    expect(tilt(10, 3, 2.5)).toBe(-17.5);
    expect(tilt(10, 10, 2.5)).toBe(0);
  });
  it('efficiency tips left, equity tips right, both and neither stay level', () => {
    expect(verdictTilt('efficient')).toBe(-14);
    expect(verdictTilt('equitable')).toBe(14);
    expect(verdictTilt('both')).toBe(0);
    expect(verdictTilt('neither')).toBe(0);
  });
});

describe('Fair or Efficient?: income shares', () => {
  it('adds incomes and finds shares (hand-checked)', () => {
    expect(total(incomes)).toBe(200);
    expect(incomeShare(incomes, [0])).toBe(45);
    expect(incomeShare(incomes, [3, 4])).toBe(12.5);
    expect(incomeShare(incomes, [0, 1])).toBe(70);
    expect(incomeShare(incomes, [0, 1, 2, 3, 4])).toBe(100);
    expect(incomeShare([0, 0], [0])).toBe(0);
    expect(round2(incomeShare([12, 18, 24, 36, 60], [4]))).toBe(40);
    expect(round2(incomeShare([1, 2], [0]))).toBe(33.33);
  });
  it('reads typed answers and accepts small slips', () => {
    expect(parseNumber('45')).toBe(45);
    expect(parseNumber(' 12.5% ')).toBe(12.5);
    expect(parseNumber('$90')).toBe(90);
    expect(Number.isNaN(parseNumber('about 40'))).toBe(true);
    expect(numberRight(12.5, 12.5)).toBe(true);
    expect(numberRight(12.55, 12.5)).toBe(true);
    expect(numberRight(13, 12.5)).toBe(false);
    expect(numberRight(NaN, 12.5)).toBe(false);
  });
  it('wider flows for bigger incomes', () => {
    expect(flowWidth(90, 90)).toBe(16);
    expect(flowWidth(0, 90)).toBe(2);
    expect(flowWidth(45, 90)).toBe(9);
    expect(flowWidth(10, 0)).toBe(2);
  });
  it('the calculations in the game match the model and the stated answers', () => {
    for (const c of t.calcs) {
      expect(round2(incomeShare(incomes, c.group)), c.id).toBe(c.answer);
      for (const m of c.mistakes) expect(numberRight(m.value, c.answer), `${c.id} ${m.value}`).toBe(false);
    }
  });
  it('the Check it number question matches the model', () => {
    const q = content.check.find((x) => x.type === 'number')!;
    const rows = (q.table!.rows as (string | number)[][]).map((r) => r[1] as number);
    expect(round2(incomeShare(rows, [4]))).toBe(q.answer);
  });
});

describe('Fair or Efficient?: goals', () => {
  it('each goal counts first-try answers', () => {
    expect(sortWon(SORT_GOAL)).toBe(true);
    expect(sortWon(SORT_GOAL - 1)).toBe(false);
    expect(judgeWon(JUDGE_GOAL)).toBe(true);
    expect(judgeWon(JUDGE_GOAL - 1)).toBe(false);
    expect(flowWon(FLOW_GOAL)).toBe(true);
    expect(flowWon(FLOW_GOAL - 1)).toBe(false);
  });
  it('every goal can be reached with the content, but needs more than half right', () => {
    expect(t.cases.length).toBe(12);
    expect(SORT_GOAL).toBeLessThanOrEqual(t.cases.length);
    expect(SORT_GOAL).toBeGreaterThan(t.cases.length / 2);
    expect(t.outcomes.length).toBe(8);
    expect(JUDGE_GOAL).toBeLessThanOrEqual(t.outcomes.length);
    const max = flowMax(t.households.length, t.calcs.length, t.responses.length);
    expect(max).toBe(14);
    expect(FLOW_GOAL).toBeLessThanOrEqual(max);
    expect(FLOW_GOAL).toBeGreaterThan(max / 2);
  });
  it('the level blurbs state the same goals as the code', () => {
    expect(t.levels[0].blurb).toContain(`${SORT_GOAL} right`);
    expect(t.levels[1].blurb).toContain(`${JUDGE_GOAL} right`);
    expect(t.levels[2].blurb).toContain(`${FLOW_GOAL} of 14`);
  });
});

describe('Fair or Efficient?: content', () => {
  it('level 1 has both kinds, at least 5 of each', () => {
    for (const c of t.cases) expect(FAIRNESS).toContain(c.kind);
    expect(t.cases.filter((c) => c.kind === 'equity').length).toBeGreaterThanOrEqual(5);
    expect(t.cases.filter((c) => c.kind === 'equality').length).toBeGreaterThanOrEqual(5);
  });
  it('level 2 uses every verdict twice and each round has exactly one right reason', () => {
    for (const v of VERDICTS) expect(t.outcomes.filter((o) => o.verdict === v).length, v).toBe(2);
    for (const o of t.outcomes) expect(o.reasons.filter((r) => 'correct' in r && r.correct).length, o.id).toBe(1);
  });
  it('level 3: each household has a different cause, and each response round has exactly one right answer', () => {
    const causes = t.households.map((h) => h.cause);
    expect(new Set(causes).size).toBe(causes.length);
    for (const c of causes) expect(t.causeOrder).toContain(c);
    for (const k of t.causeOrder) expect(Object.keys(t.causes)).toContain(k);
    for (const r of t.responses) {
      expect(r.options.filter((o) => 'correct' in o && o.correct).length, r.id).toBe(1);
      expect(r.options.length, r.id).toBe(4);
    }
    // The cause question says high or low: the three richest are "high".
    const sorted = [...incomes].sort((a, b) => b - a);
    expect(sorted[2]).toBeGreaterThanOrEqual(35);
    expect(sorted[3]).toBeLessThan(35);
  });
  it('every Check it question is HL, has two hints, and choice questions have one right answer', () => {
    expect(content.check.length).toBeGreaterThanOrEqual(8);
    expect(content.check.length).toBeLessThanOrEqual(9);
    expect(content.check.some((q) => q.type === 'label')).toBe(true);
    expect(content.check.some((q) => q.type === 'number')).toBe(true);
    for (const q of content.check) {
      expect(q.hl, q.id).toBe(true);
      expect(q.hints.length, q.id).toBe(2);
      if (q.type === 'choice') expect((q.options ?? []).filter((o) => 'correct' in o && o.correct).length, q.id).toBe(1);
      if (q.type === 'label') {
        for (const s of q.slots!) expect(q.choices).toContain(s.answer);
        expect(q.slots!.map((s) => s.letter)).toEqual(q.diagram!.tags!.map((g) => g.letter));
      }
    }
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
