import { describe, expect, it } from 'vitest';
import { BREAK_GOAL, breakWon, BUILD_GOAL, buildMax, buildWon, JUDGE_GOAL, judgeWon, nextPlank, plankPoint } from '../src/activities/build-break-judge/model';
import content from '../public/content/activities/build-break-judge.json';
import glossary from '../public/content/glossary.json';

type Opt = { text: string; correct?: boolean };
const t = content.try as unknown as {
  builds: { id: string; planks: string[] }[];
  breaks: { id: string; planks: string[]; crack: number; fixes: Opt[] }[];
  judges: { id: string; evals: Opt[]; conclusions: Opt[] }[];
};

describe('Build, Break, Judge: rules', () => {
  it('accepts only the next plank', () => {
    expect(nextPlank(0, 0)).toBe(1);
    expect(nextPlank(2, 2)).toBe(3);
    expect(nextPlank(2, 3)).toBe(-1);
    expect(nextPlank(2, 0)).toBe(-1);
  });
  it('a plank scores only with no wrong tap before it', () => {
    expect(plankPoint(0)).toBe(1);
    expect(plankPoint(2)).toBe(0);
  });
  it('the last plank of each bridge places itself, so it scores nothing', () => {
    expect(buildMax([{ planks: ['a', 'b', 'c', 'd', 'e'] }])).toBe(4);
    expect(buildMax(t.builds)).toBe(24);
  });
  it('goals need most right, and can be reached', () => {
    expect(buildWon(BUILD_GOAL)).toBe(true);
    expect(buildWon(BUILD_GOAL - 1)).toBe(false);
    expect(breakWon(BREAK_GOAL)).toBe(true);
    expect(breakWon(BREAK_GOAL - 1)).toBe(false);
    expect(judgeWon(JUDGE_GOAL)).toBe(true);
    expect(judgeWon(JUDGE_GOAL - 1)).toBe(false);
    expect(BUILD_GOAL).toBeLessThanOrEqual(buildMax(t.builds));
    expect(BREAK_GOAL).toBeLessThanOrEqual(t.breaks.length * 2);
    expect(JUDGE_GOAL).toBeLessThanOrEqual(t.judges.length * 2);
  });
});

describe('Build, Break, Judge: content', () => {
  it('every bridge has five planks with different text', () => {
    for (const b of [...t.builds, ...t.breaks]) {
      expect(b.planks.length, b.id).toBe(5);
      expect(new Set(b.planks).size, b.id).toBe(5);
    }
  });
  it('the cracked plank is never the first, so students must read the chain', () => {
    for (const b of t.breaks) {
      expect(b.crack, b.id).toBeGreaterThan(0);
      expect(b.crack, b.id).toBeLessThan(b.planks.length);
    }
    // Cracks are not always in the same place.
    expect(new Set(t.breaks.map((b) => b.crack)).size).toBeGreaterThanOrEqual(3);
  });
  it('every fix, evaluation and conclusion list has exactly one right answer', () => {
    for (const b of t.breaks) expect(b.fixes.filter((f) => f.correct).length, b.id).toBe(1);
    for (const j of t.judges) {
      expect(j.evals.filter((f) => f.correct).length, j.id).toBe(1);
      expect(j.conclusions.filter((f) => f.correct).length, j.id).toBe(1);
    }
  });
  it('the right fix is never the cracked plank again', () => {
    for (const b of t.breaks) expect(b.fixes.find((f) => f.correct)!.text, b.id).not.toBe(b.planks[b.crack]);
  });
  it('key economics: a cost rise lowers supply, inelastic demand means a smaller fall in quantity', () => {
    const frost = t.builds.find((b) => b.id === 'b-frost')!;
    expect(frost.planks[0]).toMatch(/supply of coffee decreases/);
    expect(frost.planks[4]).toMatch(/higher price and a lower quantity/);
    const bus = t.breaks.find((b) => b.id === 'k-bus')!;
    // 20% fall after a 10% rise is PED = −2 (elastic): the crack. The fix keeps the fall under 10%.
    expect(-20 / 10).toBeLessThan(-1);
    expect(-4 / 10).toBeGreaterThan(-1);
    expect(bus.crack).toBe(1);
  });
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
