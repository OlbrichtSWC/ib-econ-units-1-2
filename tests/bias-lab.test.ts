import { describe, expect, it } from 'vitest';
import {
  ALL_EFFECTS, anchorFor, anchorGap, ANCHORS, DESIGN_GOAL, designMax, designWon, EXPERIMENT_EFFECTS, fatPercent, habitCost, HUNT_GOAL, huntWon,
  isHighAnchor, OBJECTIVES, profit, SUBJECT_GOAL, subjectWon, TOOLS,
} from '../src/activities/bias-lab/model';
import content from '../public/content/activities/bias-lab.json';
import glossary from '../public/content/glossary.json';

const t = content.try;
type Opt = { correct?: boolean };
const rightCount = (opts: Opt[]) => opts.filter((o) => o.correct).length;

describe('Mind Tricks Lab: calculations', () => {
  it('the fat-free frame and the fat frame describe the same food', () => {
    expect(fatPercent(90)).toBe(10);
    expect(fatPercent(75)).toBe(25);
    expect(fatPercent(100)).toBe(0);
  });
  it('the cost of always buying the usual brand', () => {
    expect(habitCost(4.2, 2.7, 10)).toBe(15);
    expect(habitCost(4.2, 2.7, 1)).toBe(1.5);
    expect(habitCost(3, 2, 8)).toBe(8);
  });
  it('profit is total revenue minus total cost', () => {
    expect(profit(500, 320)).toBe(180);
    expect(profit(200, 250)).toBe(-50);
  });
  it('the anchor wheel gives a number from its list, the same each time for one seed, low and high both possible', () => {
    for (let s = 0; s < 20; s++) {
      expect(ANCHORS).toContain(anchorFor(s));
      expect(anchorFor(s)).toBe(anchorFor(s));
    }
    const seen = new Set(Array.from({ length: 16 }, (_, s) => anchorFor(s)));
    expect([...seen].some(isHighAnchor)).toBe(true);
    expect([...seen].some((a) => !isHighAnchor(a))).toBe(true);
    expect(anchorFor(-3)).toBeGreaterThan(0);
  });
  it('the reveal says where the estimate sits compared with the anchor', () => {
    expect(isHighAnchor(81)).toBe(true);
    expect(isHighAnchor(12)).toBe(false);
    expect(anchorGap(80, 70)).toBe('near');
    expect(anchorGap(80, 95)).toBe('near');
    expect(anchorGap(80, 40)).toBe('below');
    expect(anchorGap(12, 50)).toBe('above');
  });
  it('level 3 points: a tool and a reason per goal, plus one per firm', () => {
    expect(designMax(4, 5)).toBe(13);
    expect(designMax(t.designGoals.length, t.firms.length)).toBe(13);
  });
});

describe('Mind Tricks Lab: goals', () => {
  it('each goal counts first-try answers', () => {
    expect(subjectWon(SUBJECT_GOAL)).toBe(true);
    expect(subjectWon(SUBJECT_GOAL - 1)).toBe(false);
    expect(huntWon(HUNT_GOAL)).toBe(true);
    expect(huntWon(HUNT_GOAL - 1)).toBe(false);
    expect(designWon(DESIGN_GOAL)).toBe(true);
    expect(designWon(DESIGN_GOAL - 1)).toBe(false);
  });
  it('every goal can be reached with the content, and needs more than half right', () => {
    expect(t.experiments.length).toBeGreaterThanOrEqual(SUBJECT_GOAL);
    expect(SUBJECT_GOAL).toBeGreaterThan(t.experiments.length / 2);
    expect(t.huntScenarios.length).toBeGreaterThanOrEqual(HUNT_GOAL);
    expect(HUNT_GOAL).toBeGreaterThan(t.huntScenarios.length / 2);
    const max = designMax(t.designGoals.length, t.firms.length);
    expect(DESIGN_GOAL).toBeLessThanOrEqual(max);
    expect(DESIGN_GOAL).toBeGreaterThan(max / 2);
  });
});

describe('Mind Tricks Lab: content', () => {
  it('level 1 has 4 to 5 experiments, each with a different answer from the level 1 list', () => {
    expect(t.experiments.length).toBeGreaterThanOrEqual(4);
    expect(t.experiments.length).toBeLessThanOrEqual(5);
    for (const x of t.experiments) expect(EXPERIMENT_EFFECTS, x.id).toContain(x.effect);
    expect(new Set(t.experiments.map((x) => x.effect)).size).toBe(t.experiments.length);
    for (const e of ['anchoring', 'framing', 'availability', 'rule']) expect(t.experiments.some((x) => x.effect === e), e).toBe(true);
  });
  it('experiments that ask for a choice have options, and the anchor experiment has an item to price', () => {
    for (const x of t.experiments) {
      if (x.kind === 'anchor') expect(x.item).toBeTruthy();
      else expect((x.options ?? []).length, x.id).toBeGreaterThanOrEqual(2);
      if (x.kind === 'headlines') expect((x.headlines ?? []).length).toBeGreaterThanOrEqual(2);
    }
  });
  it('the framing experiment offers the same food in two frames', () => {
    const f = t.experiments.find((x) => x.effect === 'framing')!;
    const nums = f.options!.map((o) => Number(o.text.match(/(\d+)%/)![1]));
    expect(fatPercent(nums[0])).toBe(nums[1]);
  });
  it('the rule of thumb experiment and Check it agree with the habit cost', () => {
    const r = t.experiments.find((x) => x.effect === 'rule')!;
    const prices = r.options!.slice(0, 2).map((o) => Number(o.text.match(/\$(\d+\.\d+)/)![1]));
    expect(habitCost(prices[0], prices[1], 1)).toBe(1.5);
    expect(r.trick).toContain('$1.50');
  });
  it('every level 2 scenario has one answer from the guide list, and every bias or limit is used', () => {
    for (const s of t.huntScenarios) expect(ALL_EFFECTS, s.id).toContain(s.effect);
    for (const e of ALL_EFFECTS) expect(t.huntScenarios.some((s) => s.effect === e), e).toBe(true);
    expect(Object.keys(t.effectNames).sort()).toEqual([...ALL_EFFECTS].sort());
  });
  it('every level 3 goal has one right tool, feedback for each wrong tool and exactly one right reason', () => {
    for (const g of t.designGoals) {
      expect(TOOLS, g.id).toContain(g.tool);
      for (const tool of TOOLS.filter((x) => x !== g.tool)) expect((g.toolWrong as Record<string, string | undefined>)[tool], `${g.id} ${tool}`).toBeTruthy();
      expect(rightCount(g.reasons), g.id).toBe(1);
    }
    expect(new Set(t.designGoals.map((g) => g.tool)).size).toBe(TOOLS.length);
    expect(t.designGoals.map((g) => g.id).sort()).toEqual(['d-canteen', 'd-energy', 'd-organ', 'd-save']);
  });
  it('each business objective from the guide is matched by one firm', () => {
    for (const f of t.firms) expect(OBJECTIVES, f.id).toContain(f.objective);
    expect(t.firms.map((f) => f.objective).sort()).toEqual([...OBJECTIVES].sort());
  });
  it('every level is labelled HL', () => {
    for (const l of t.levels) expect(l.title).toContain('(HL)');
    expect(content.learn.text.startsWith('^HL^')).toBe(true);
    for (const q of content.check) expect(q.hl, q.id).toBe(true);
  });
});

describe('Mind Tricks Lab: Check it', () => {
  it('has 8 or 9 questions with a label question and number questions', () => {
    expect(content.check.length).toBeGreaterThanOrEqual(8);
    expect(content.check.length).toBeLessThanOrEqual(9);
    expect(content.check.some((q) => q.type === 'label')).toBe(true);
    expect(content.check.filter((q) => q.type === 'number').length).toBeGreaterThanOrEqual(1);
  });
  it('every choice question has exactly one right answer', () => {
    for (const q of content.check) if (q.type === 'choice') expect(rightCount(q.options as Opt[]), q.id).toBe(1);
  });
  it('number questions match the model', () => {
    const by = (id: string) => content.check.find((q) => q.id === id)! as { answer: number };
    expect(by('q4').answer).toBe(fatPercent(75));
    expect(by('q8').answer).toBe(habitCost(4.2, 2.7, 10));
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
  it('the reveal text describes effects in general terms, with no research figures', () => {
    for (const x of t.experiments) expect(x.trick, x.id).not.toMatch(/\d+\s?%\s+of\s+(people|participants|subjects)|studies show|research shows/i);
  });
  it('on-screen text follows the house style', () => {
    const text = JSON.stringify(content);
    expect(text).not.toMatch(/—|genuinely|honestly|actually|\btick\b|\bcards?\b/i);
  });
});
