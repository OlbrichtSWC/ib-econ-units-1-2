import { describe, expect, it } from 'vitest';
import {
  CHECKUP_GOAL, checkupWon, health, mistakePoint, PROBLEMS, sameDiagnosis, toggleProblem, TRIAGE_GOAL, triageWon, WARD_GOAL, wardWon,
} from '../src/activities/diagram-doctor/model';
import content from '../public/content/activities/diagram-doctor.json';
import glossary from '../public/content/glossary.json';

type Pt = { q: number; p: number };
type Spec = { curves?: { points?: Pt[]; label?: string }[]; guides?: { at: Pt; xText?: string; yText?: string }[]; tags?: { at: Pt; letter: string }[]; hlines?: { p: number; label?: string }[]; dots?: { at: Pt; label?: string }[]; description: string; xLabel: string; yLabel: string };
const t = content.try as unknown as {
  checkups: { id: string; sick: Spec; healed: Spec; mistakes: { letter: string; cures: { correct?: boolean }[] }[] }[];
  ward: { id: string; sick: Spec; healed: Spec; mistakes: { letter: string; cures: { correct?: boolean }[] }[] }[];
  triage: { id: string; problems: string[]; spec: Spec }[];
  problems: Record<string, string>;
};

/** Price on a straight curve drawn through two points, at quantity q. */
const priceOn = (c: Pt[], q: number) => c[0].p + ((c[1].p - c[0].p) * (q - c[0].q)) / (c[1].q - c[0].q);
const curve = (s: Spec, label: string) => s.curves!.find((c) => c.label === label)!.points!;
const onLine = (c: Pt[], pt: Pt) => Math.abs(priceOn(c, pt.q) - pt.p) < 1e-9;
const guide = (s: Spec, x: string) => s.guides!.find((g) => g.xText === x)!.at;

describe('Diagram Doctor: scoring', () => {
  it('a problem scores only with no healthy tag tapped and the right cure first time', () => {
    expect(mistakePoint(0, 0)).toBe(1);
    expect(mistakePoint(1, 0)).toBe(0);
    expect(mistakePoint(0, 1)).toBe(0);
  });
  it('a diagnosis must name exactly the problems, in any order', () => {
    expect(sameDiagnosis(['shift', 'marks'], ['marks', 'shift'])).toBe(true);
    expect(sameDiagnosis(['shift'], ['marks', 'shift'])).toBe(false);
    expect(sameDiagnosis(['shift', 'marks', 'axes'], ['marks', 'shift'])).toBe(false);
    expect(sameDiagnosis([], [])).toBe(true);
    expect(sameDiagnosis(['axes'], [])).toBe(false);
  });
  it('toggles problems on and off', () => {
    expect(toggleProblem([], 'axes')).toEqual(['axes']);
    expect(toggleProblem(['axes', 'area'], 'axes')).toEqual(['area']);
  });
  it('health grows as problems are cured', () => {
    expect(health(0, 2)).toBe(0);
    expect(health(1, 2)).toBe(0.5);
    expect(health(2, 2)).toBe(1);
  });
  it('goals need most answers right, and can be reached with the content', () => {
    expect(checkupWon(CHECKUP_GOAL)).toBe(true);
    expect(checkupWon(CHECKUP_GOAL - 1)).toBe(false);
    expect(wardWon(WARD_GOAL)).toBe(true);
    expect(wardWon(WARD_GOAL - 1)).toBe(false);
    expect(triageWon(TRIAGE_GOAL)).toBe(true);
    expect(triageWon(TRIAGE_GOAL - 1)).toBe(false);
    const wardMax = t.ward.reduce((n, w) => n + w.mistakes.length, 0);
    expect(t.checkups.length).toBe(10);
    expect(wardMax).toBe(12);
    expect(t.triage.length).toBe(9);
    expect(CHECKUP_GOAL).toBeGreaterThan(t.checkups.length / 2);
    expect(WARD_GOAL).toBeLessThanOrEqual(wardMax);
    expect(TRIAGE_GOAL).toBeLessThanOrEqual(t.triage.length);
  });
});

describe('Diagram Doctor: patients are well formed', () => {
  it('level 1 has one problem per patient and level 2 has two', () => {
    for (const p of t.checkups) expect(p.mistakes.length, p.id).toBe(1);
    for (const p of t.ward) expect(p.mistakes.length, p.id).toBe(2);
  });
  it('every problem is on a tag, there are healthy tags to rule out, and each cure list has exactly one right cure', () => {
    for (const p of [...t.checkups, ...t.ward]) {
      const letters = p.sick.tags!.map((x) => x.letter);
      expect(new Set(letters).size, p.id).toBe(letters.length);
      expect(letters.length - p.mistakes.length, p.id).toBeGreaterThanOrEqual(2);
      for (const m of p.mistakes) {
        expect(letters, p.id).toContain(m.letter);
        expect(m.cures.length).toBe(3);
        expect(m.cures.filter((c) => c.correct).length, `${p.id} ${m.letter}`).toBe(1);
      }
      expect(p.healed.tags, p.id).toBeUndefined();
      for (const x of letters) expect(p.sick.description, `${p.id} ${x}`).toContain(`Tag ${x}`);
    }
  });
  it('triage uses only the checklist problems, and some patients are healthy', () => {
    for (const x of t.triage) for (const pr of x.problems) expect(PROBLEMS, x.id).toContain(pr);
    expect(Object.keys(t.problems).sort()).toEqual([...PROBLEMS].sort());
    expect(t.triage.filter((x) => x.problems.length === 0).length).toBeGreaterThanOrEqual(2);
    expect(t.triage.filter((x) => x.problems.length === 2).length).toBeGreaterThanOrEqual(2);
    for (const x of t.triage) expect(x.spec.tags, x.id).toBeUndefined();
  });
  it('every fixed diagram has both axes labelled', () => {
    for (const p of [...t.checkups, ...t.ward]) {
      expect(p.healed.xLabel, p.id).not.toBe('');
      expect(p.healed.yLabel, p.id).not.toBe('');
    }
  });
});

describe('Diagram Doctor: the fixed diagrams are right economics', () => {
  const byId = (id: string) => [...t.checkups, ...t.ward].find((p) => p.id === id)!;
  it('every equilibrium mark in a fixed diagram sits on the curves it names', () => {
    // Demand and supply cross at the marked points.
    const c = byId('income-cinema').healed;
    expect(onLine(curve(c, 'D₂'), guide(c, 'Q₂')) && onLine(curve(c, 'S'), guide(c, 'Q₂'))).toBe(true);
    expect(onLine(curve(c, 'D₁'), guide(c, 'Q₁')) && onLine(curve(c, 'S'), guide(c, 'Q₁'))).toBe(true);
    const a = byId('off-equilibrium');
    expect(onLine(curve(a.healed, 'D'), guide(a.healed, 'Q*')) && onLine(curve(a.healed, 'S'), guide(a.healed, 'Q*'))).toBe(true);
    expect(onLine(curve(a.sick, 'S'), guide(a.sick, 'Q*'))).toBe(false);
  });
  it('a rise in income shifts demand for a normal good right: price and quantity rise', () => {
    const c = byId('income-cinema');
    expect(priceOn(curve(c.healed, 'D₂'), 5)).toBeGreaterThan(priceOn(curve(c.healed, 'D₁'), 5));
    expect(priceOn(curve(c.sick, 'D₂'), 5)).toBeLessThan(priceOn(curve(c.sick, 'D₁'), 5));
    expect(guide(c.healed, 'Q₂').q).toBeGreaterThan(guide(c.healed, 'Q₁').q);
  });
  it('a tax shifts supply up by the tax; a subsidy shifts it down', () => {
    const tax = byId('tax-down').healed;
    expect(priceOn(curve(tax, 'S + tax'), 4) - priceOn(curve(tax, 'S'), 4)).toBeCloseTo(2);
    const sub = byId('subsidy').healed;
    expect(priceOn(curve(sub, 'S + subsidy'), 5) - priceOn(curve(sub, 'S'), 5)).toBeCloseTo(-2);
    expect(guide(sub, 'Q₂').q).toBeGreaterThan(guide(sub, 'Q₁').q);
  });
  it('higher costs shift supply left, raising price and cutting quantity', () => {
    const c = byId('cost-rise').healed;
    expect(guide(c, 'Q₂').q).toBeLessThan(guide(c, 'Q₁').q);
    expect(guide(c, 'Q₂').p).toBeGreaterThan(guide(c, 'Q₁').p);
    expect(onLine(curve(c, 'S₂'), guide(c, 'Q₂')) && onLine(curve(c, 'D'), guide(c, 'Q₂'))).toBe(true);
  });
  it('a negative production externality: MSC above MPC, and Q* less than Qm where MSC meets MSB', () => {
    const c = byId('negative-externality').healed;
    expect(priceOn(curve(c, 'MSC'), 5)).toBeGreaterThan(priceOn(curve(c, 'MPC = S'), 5));
    const qs = guide(c, 'Q*'), qm = guide(c, 'Qm');
    expect(qs.q).toBeLessThan(qm.q);
    expect(onLine(curve(c, 'MSC'), qs) && onLine(curve(c, 'MPB = MSB'), qs)).toBe(true);
  });
  it('price controls bite: a maximum price below equilibrium, a minimum price and minimum wage above it', () => {
    const eq = 5;
    expect(byId('max-above').healed.hlines![0].p).toBeLessThan(eq);
    expect(byId('max-above').sick.hlines![0].p).toBeGreaterThan(eq);
    expect(byId('min-gap').healed.hlines![0].p).toBeGreaterThan(eq);
    expect(byId('minimum-wage').healed.hlines![0].p).toBeGreaterThan(eq);
    expect(byId('minimum-wage').sick.hlines![0].p).toBeLessThan(eq);
    // At the maximum price, quantity supplied is less than quantity demanded: a shortage.
    const m = byId('max-above').healed;
    expect(guide(m, 'Qs').q).toBeLessThan(guide(m, 'Qd').q);
    const w = byId('minimum-wage').healed;
    expect(guide(w, 'Qd').q).toBeLessThan(guide(w, 'Qs').q);
  });
  it('a change in the good\'s own price is a movement along one demand curve', () => {
    const c = byId('shift-not-move').healed;
    expect(c.curves!.length).toBe(1);
    expect(onLine(curve(c, 'D'), guide(c, 'Q₁')) && onLine(curve(c, 'D'), guide(c, 'Q₂'))).toBe(true);
    expect(guide(c, 'Q₂').p).toBeGreaterThan(guide(c, 'Q₁').p);
  });
  it('the fixed PPC is bowed out with U inside it; the sick one is bowed in with U outside', () => {
    const p = byId('ppc');
    const mid = (pts: Pt[]) => pts[Math.floor(pts.length / 2)];
    const r = (x: Pt) => Math.hypot(x.q, x.p);
    const healedPts = p.healed.curves![0].points!, sickPts = p.sick.curves![0].points!;
    // A bowed-out curve's middle is further from the origin than the straight line between its ends.
    expect(r(mid(healedPts))).toBeGreaterThan(r({ q: 4.25, p: 4.25 }));
    expect(r(mid(sickPts))).toBeLessThan(r({ q: 4.25, p: 4.25 }));
    expect(r(p.healed.dots!.find((d) => d.label === 'U')!.at)).toBeLessThan(8.5);
    expect(r(p.sick.dots!.find((d) => d.label === 'U')!.at)).toBeGreaterThan(8.5);
  });
  it('the inferior-good triage case needs demand to shift the other way', () => {
    const bus = t.triage.find((x) => x.id === 't-bus')!;
    expect(bus.problems).toContain('shift');
    const tea = t.triage.find((x) => x.id === 't-tea')!;
    expect(tea.problems).toEqual([]);
  });
});

describe('Diagram Doctor: content', () => {
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
