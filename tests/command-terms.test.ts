import { describe, expect, it } from 'vitest';
import { aoOf, AOS, BOX_GOAL, boxMax, boxWon, PLAN_GOAL, planWon, RUNWAY_GOAL, runwayWon, termInQuestion, Term } from '../src/activities/command-terms/model';
import content from '../public/content/activities/command-terms.json';
import glossary from '../public/content/glossary.json';

const t = content.try as unknown as {
  terms: Term[];
  planes: { id: string; term: string; question: string }[];
  plans: { id: string; question: string; options: { correct?: boolean }[] }[];
  verdicts: Record<string, string>;
  boxes: { id: string; question: string; verdict: string; fixes?: { correct?: boolean }[] }[];
};

describe('Control Tower: command terms match the IB guide', () => {
  it('uses the AO levels from the IB guide, including the traps', () => {
    const want: Record<string, string> = {
      Define: 'AO1', Describe: 'AO1', List: 'AO1', Outline: 'AO1', State: 'AO1',
      Analyse: 'AO2', Apply: 'AO2', Comment: 'AO2', Distinguish: 'AO2', Explain: 'AO2', Suggest: 'AO2',
      Compare: 'AO3', 'Compare and contrast': 'AO3', Contrast: 'AO3', Discuss: 'AO3', Evaluate: 'AO3', Examine: 'AO3', Justify: 'AO3', Recommend: 'AO3', 'To what extent': 'AO3',
      Calculate: 'AO4', Construct: 'AO4', Draw: 'AO4', Identify: 'AO4', Label: 'AO4', Sketch: 'AO4',
    };
    for (const [term, ao] of Object.entries(want)) expect(aoOf(t.terms, term), term).toBe(ao);
    expect(t.terms.length).toBe(Object.keys(want).length);
  });
  it('uses the IB guide wording for key definitions', () => {
    const m = (x: string) => t.terms.find((y) => y.term === x)!.meaning;
    expect(m('Explain')).toBe('Give a detailed account including reasons or causes.');
    expect(m('Evaluate')).toBe('Make an appraisal by weighing up the strengths and limitations.');
    expect(m('Calculate')).toBe('Obtain a numerical answer showing the relevant stages in the working.');
    expect(m('Comment')).toBe('Give a judgment based on a given statement or result of a calculation.');
  });
  it('finds a term without caring about capitals', () => {
    expect(aoOf(t.terms, 'to what extent')).toBe('AO3');
    expect(aoOf(t.terms, 'Shout')).toBeUndefined();
  });
});

describe('Control Tower: planes, plans and black boxes', () => {
  it('every plane carries a known command term, in bold in its question', () => {
    for (const p of t.planes) {
      expect(aoOf(t.terms, p.term), p.id).toBeDefined();
      expect(termInQuestion(p.question, p.term), p.id).toBe(true);
    }
  });
  it('every runway gets at least three planes, and both traps fly', () => {
    for (const a of AOS) expect(t.planes.filter((p) => aoOf(t.terms, p.term) === a).length, a).toBeGreaterThanOrEqual(3);
    expect(t.planes.some((p) => p.term === 'Comment')).toBe(true);
    expect(t.planes.some((p) => p.term === 'Examine')).toBe(true);
  });
  it('every flight plan and fix has exactly one right answer, and every question shows a bold command term', () => {
    for (const p of t.plans) {
      expect(p.options.filter((o) => o.correct).length, p.id).toBe(1);
      expect(t.terms.some((x) => termInQuestion(p.question, x.term)), p.id).toBe(true);
    }
    for (const b of t.boxes) {
      expect(Object.keys(t.verdicts), b.id).toContain(b.verdict);
      expect(t.terms.some((x) => termInQuestion(b.question, x.term)), b.id).toBe(true);
      if (b.verdict === 'ok') expect(b.fixes, b.id).toBeUndefined();
      else expect(b.fixes!.filter((f) => f.correct).length, b.id).toBe(1);
    }
  });
  it('the black box has answers that are fine as well as ones to fix', () => {
    expect(t.boxes.filter((b) => b.verdict === 'ok').length).toBeGreaterThanOrEqual(2);
    expect(new Set(t.boxes.map((b) => b.verdict)).size).toBe(Object.keys(t.verdicts).length);
  });
  it('the worked numbers are right: PED of −1 and YED of 2', () => {
    const pct = (a: number, b: number) => ((b - a) / a) * 100;
    expect(pct(200, 150) / pct(4, 5)).toBe(-1);
    expect(pct(50, 60) / pct(1000, 1100)).toBeCloseTo(2);
    expect(15 * 120).toBe(1800);
  });
});

describe('Control Tower: goals', () => {
  it('each goal needs most right, and can be reached', () => {
    expect(runwayWon(RUNWAY_GOAL)).toBe(true);
    expect(runwayWon(RUNWAY_GOAL - 1)).toBe(false);
    expect(planWon(PLAN_GOAL)).toBe(true);
    expect(planWon(PLAN_GOAL - 1)).toBe(false);
    expect(boxWon(BOX_GOAL)).toBe(true);
    expect(boxWon(BOX_GOAL - 1)).toBe(false);
    expect(t.planes.length).toBe(14);
    expect(t.plans.length).toBe(8);
    expect(boxMax(t.boxes)).toBe(14);
    expect(RUNWAY_GOAL).toBeGreaterThan(t.planes.length / 2);
  });
  it('a black box point comes from each verdict, plus each fix', () => {
    expect(boxMax([{ verdict: 'ok' }, { verdict: 'reasons' }])).toBe(3);
  });
});

describe('Control Tower: content', () => {
  it('every glossary term used exists in the glossary', () => {
    const names = new Set<string>();
    for (const g of glossary.terms as { term: string; aliases?: string[] }[]) {
      names.add(g.term.toLowerCase());
      for (const a of g.aliases ?? []) names.add(a.toLowerCase());
    }
    for (const m of JSON.stringify(content).matchAll(/\[\[([^\]]+)\]\]/g)) {
      const term = m[1].includes('|') ? m[1].split('|')[1] : m[1];
      expect(names.has(term.trim().toLowerCase()), term).toBe(true);
    }
  });
  it('on-screen text follows the house style', () => {
    expect(JSON.stringify(content)).not.toMatch(/—|genuinely|honestly|actually|\btick\b|\bcards?\b/i);
  });
});
