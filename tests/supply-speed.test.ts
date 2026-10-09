import { describe, expect, it } from 'vitest';
import {
  classifyPes, DETERMINANTS, diagnosePes, diagnoseReverse, gaugeAngle, isNextInRank, MEASURE_GOAL, measureWon, newQuantity, outputIn,
  pctQFromPes, PERIODS, PES_CLASSES, pesFromData, pesIn, pivotQ, RACE_GOAL, raceShare, raceWon, rankByPes, round2, TIME_GOAL, timeWon,
} from '../src/activities/supply-speed/model';
import { checkNumber } from '../src/shared/activity/CheckIt';
import type { NumberQuestion } from '../src/shared/activity/types';
import content from '../public/content/activities/supply-speed.json';
import glossary from '../public/content/glossary.json';

const t = content.try;

describe('Supply Speed: PES calculations', () => {
  it('PES = % change in quantity supplied / % change in price (hand-checked)', () => {
    expect(pesFromData(4, 5, 200, 200)).toBe(0); // 0% / 25%
    expect(pesFromData(4, 5, 1000, 1050)).toBeCloseTo(0.2, 9); // 5% / 25%
    expect(pesFromData(2, 2.5, 400, 500)).toBeCloseTo(1, 9); // 25% / 25%
    expect(pesFromData(20000, 22000, 1000, 1300)).toBeCloseTo(3, 9); // 30% / 10%
    expect(pesFromData(10, 12, 100, 130)).toBeCloseTo(1.5, 9); // 30% / 20%
    expect(pesFromData(4, 5, 200, 220)).toBeCloseTo(0.4, 9); // 10% / 25%
    expect(pesFromData(4, 5, 200, 300)).toBeCloseTo(2, 9); // 50% / 25%
  });
  it('rearranges the formula for quantity', () => {
    expect(pctQFromPes(2.5, 8)).toBeCloseTo(20, 9);
    expect(pctQFromPes(0.5, 8)).toBeCloseTo(4, 9);
    expect(newQuantity(400, 2, 10)).toBeCloseTo(480, 9);
    expect(newQuantity(200, 1.5, 10)).toBeCloseTo(230, 9);
  });
  it('rounds to 2 decimal places', () => {
    expect(round2(0.6666)).toBe(0.67);
    expect(round2(2)).toBe(2);
  });
  it('classifies the whole range of PES values', () => {
    expect(classifyPes(0)).toBe('perfectly-inelastic');
    expect(classifyPes(0.2)).toBe('inelastic');
    expect(classifyPes(0.99)).toBe('inelastic');
    expect(classifyPes(1)).toBe('unit');
    expect(classifyPes(1.5)).toBe('elastic');
    expect(classifyPes(Infinity)).toBe('perfectly-elastic');
    expect(PES_CLASSES).toHaveLength(5);
  });
  it('spots common slips in a typed PES', () => {
    const honey = { p0: 10, p1: 12, q0: 100, q1: 130 };
    expect(diagnosePes(1.5, honey)).toBe('right');
    expect(diagnosePes(0.67, honey)).toBe('inverted');
    expect(diagnosePes(15, honey)).toBe('absolute');
    expect(diagnosePes(30, honey)).toBe('pctQ');
    expect(diagnosePes(20, honey)).toBe('pctP');
    expect(diagnosePes(-1.5, honey)).toBe('negative');
    expect(diagnosePes(7, honey)).toBe('other');
    const cars = { p0: 20000, p1: 22000, q0: 1000, q1: 1300 };
    expect(diagnosePes(3, cars)).toBe('right');
    expect(diagnosePes(0.33, cars)).toBe('inverted');
    expect(diagnosePes(0.15, cars)).toBe('absolute');
    // Zero change in quantity: PES = 0 is right, and dividing by zero never crashes.
    expect(diagnosePes(0, { p0: 4, p1: 5, q0: 200, q1: 200 })).toBe('right');
    expect(diagnosePes(25, { p0: 4, p1: 5, q0: 200, q1: 200 })).toBe('pctP');
  });
  it('spots slips when finding the % change in quantity', () => {
    expect(diagnoseReverse(20, 2.5, 8)).toBe('right');
    expect(diagnoseReverse(3.2, 2.5, 8)).toBe('divided');
    expect(diagnoseReverse(0.31, 2.5, 8)).toBe('flipped');
    expect(diagnoseReverse(10, 2.5, 8)).toBe('other');
  });
});

describe('Supply Speed: level 1 race', () => {
  const producers = [
    { id: 'a', pes: 1.5 },
    { id: 'b', pes: 0.2 },
    { id: 'c', pes: 5 },
  ];
  it('ranks producers from least to most elastic', () => {
    expect(rankByPes(producers)).toEqual(['b', 'a', 'c']);
    expect(isNextInRank(producers, [], 'b')).toBe(true);
    expect(isNextInRank(producers, [], 'a')).toBe(false);
    expect(isNextInRank(producers, ['b'], 'a')).toBe(true);
    expect(isNextInRank(producers, ['b'], 'c')).toBe(false);
  });
  it('race lanes stay between the start and the finish', () => {
    expect(raceShare(4, 100)).toBeCloseTo(0.04, 9);
    expect(raceShare(100, 100)).toBe(1);
    expect(raceShare(150, 100)).toBe(1);
    expect(raceShare(5, 0)).toBe(0);
  });
  it('every round has three producers with different PES, so exactly one ranking is right', () => {
    for (const r of t.raceRounds) {
      expect(r.producers).toHaveLength(3);
      expect(new Set(r.producers.map((p) => p.pes)).size, r.id).toBe(3);
      expect(DETERMINANTS).toContain(r.determinant);
    }
  });
  it('each round tests a different determinant, and every determinant from the guide is used', () => {
    expect(new Set(t.raceRounds.map((r) => r.determinant)).size).toBe(t.raceRounds.length);
    for (const d of DETERMINANTS) expect(t.raceRounds.some((r) => r.determinant === d), d).toBe(true);
    for (const d of DETERMINANTS) expect(t.determinantNames[d]).toBeTruthy();
  });
  it('the first round has the bakery, the strawberry farm and the app studio, ranked farm, bakery, app', () => {
    const r = t.raceRounds.find((x) => x.determinant === 'time')!;
    expect(rankByPes(r.producers)).toEqual(['farm', 'bakery', 'app']);
  });
});

describe('Supply Speed: level 2 time machine', () => {
  it('output never falls and grows with time; PES rises from 0', () => {
    for (const p of t.timeProducers) {
      expect(outputIn(p, 'momentary')).toBe(p.q0);
      expect(p.qShort).toBeGreaterThan(p.q0);
      expect(p.qLong).toBeGreaterThan(p.qShort);
      expect(pesIn(p, 'momentary')).toBe(0);
      expect(pesIn(p, 'short')).toBeLessThan(pesIn(p, 'long'));
      expect(pesIn(p, 'long')).toBeGreaterThan(1);
    }
  });
  it('hand-checked PES for each producer', () => {
    const by = (id: string) => t.timeProducers.find((p) => p.id === id)!;
    expect(round2(pesIn(by('t-farm'), 'short'))).toBe(0.4);
    expect(round2(pesIn(by('t-farm'), 'long'))).toBe(2);
    expect(round2(pesIn(by('t-cars'), 'short'))).toBe(0.5);
    expect(round2(pesIn(by('t-cars'), 'long'))).toBe(3);
    expect(round2(pesIn(by('t-bakery'), 'short'))).toBe(1);
    expect(round2(pesIn(by('t-bakery'), 'long'))).toBe(4);
    expect(round2(pesIn(by('t-coffee'), 'short'))).toBe(0.2);
    expect(round2(pesIn(by('t-coffee'), 'long'))).toBe(2);
  });
  it('the diagram curves keep the PES: pivot point (35, 30), price up 50%', () => {
    expect(pivotQ(0)).toBe(35);
    expect(pivotQ(1)).toBeCloseTo(52.5, 9);
    expect(pivotQ(4)).toBeCloseTo(105, 9);
    // Unit elastic curve passes through the origin.
    const q = pivotQ(1);
    const slope = (45 - 30) / (q - 35);
    expect(30 - slope * 35).toBeCloseTo(0, 9);
    // All curves fit on the diagram (xMax 110).
    for (const p of t.timeProducers) for (const per of PERIODS) expect(pivotQ(round2(pesIn(p, per)))).toBeLessThanOrEqual(110);
  });
  it('every period of every producer has exactly one right option', () => {
    for (const p of t.timeProducers) {
      for (const per of PERIODS) {
        const opts = p.options[per as keyof typeof p.options] as { correct?: boolean }[];
        expect(opts.filter((o) => o.correct).length, `${p.id} ${per}`).toBe(1);
      }
    }
  });
});

describe('Supply Speed: level 3 measure it', () => {
  it('the gauge points left at 0, up at 1 and towards the right for large PES', () => {
    expect(gaugeAngle(0)).toBe(-90);
    expect(gaugeAngle(1)).toBe(0);
    expect(gaugeAngle(3)).toBeCloseTo(45, 9);
    expect(gaugeAngle(Infinity)).toBe(90);
  });
  it('rounds use the producers’ own Level 2 results', () => {
    for (const r of t.measureRounds) {
      if (r.kind !== 'calc') continue;
      const p = t.timeProducers.find((x) => x.name === r.name)!;
      expect(p, r.id).toBeTruthy();
      expect([p.q0]).toContain(r.q0);
      expect([p.q0, p.qShort, p.qLong]).toContain(r.q1);
      expect([r.p0, r.p1]).toEqual([p.p0, p.p1]);
    }
  });
  it('calculation rounds cover perfectly inelastic, inelastic, unit and elastic supply', () => {
    const classes = t.measureRounds.filter((r) => r.kind === 'calc').map((r) => classifyPes(round2(pesFromData(r.p0!, r.p1!, r.q0!, r.q1!))));
    expect(new Set(classes)).toEqual(new Set(['perfectly-inelastic', 'inelastic', 'unit', 'elastic']));
  });
  it('choice rounds have exactly one right option per question, and the HL round is marked HL', () => {
    for (const r of t.measureRounds) {
      if (r.kind !== 'choice') continue;
      expect(r.hl).toBe(true);
      for (const s of r.steps!) expect(s.options.filter((o) => 'correct' in o && o.correct).length).toBe(1);
    }
    expect(t.measureRounds.filter((r) => r.hl)).toHaveLength(1);
  });
});

describe('Supply Speed: goals', () => {
  it('each goal can be reached and needs most items right', () => {
    const raceMax = t.raceRounds.length * 2;
    expect(raceWon(RACE_GOAL)).toBe(true);
    expect(raceWon(RACE_GOAL - 1)).toBe(false);
    expect(RACE_GOAL).toBeLessThanOrEqual(raceMax);
    expect(RACE_GOAL).toBeGreaterThan(raceMax / 2);
    const timeMax = t.timeProducers.length * PERIODS.length;
    expect(timeWon(TIME_GOAL)).toBe(true);
    expect(timeWon(TIME_GOAL - 1)).toBe(false);
    expect(TIME_GOAL).toBeLessThanOrEqual(timeMax);
    expect(TIME_GOAL).toBeGreaterThan(timeMax / 2);
    expect(measureWon(MEASURE_GOAL)).toBe(true);
    expect(measureWon(MEASURE_GOAL - 1)).toBe(false);
    expect(t.measureRounds.length).toBe(6);
    expect(MEASURE_GOAL).toBeLessThanOrEqual(t.measureRounds.length);
  });
});

describe('Supply Speed: content', () => {
  it('check has 8 or 9 questions with a label question, number questions and an HL question', () => {
    expect(content.check.length).toBeGreaterThanOrEqual(8);
    expect(content.check.length).toBeLessThanOrEqual(9);
    expect(content.check.some((q) => q.type === 'label')).toBe(true);
    expect(content.check.filter((q) => q.type === 'number').length).toBeGreaterThanOrEqual(2);
    expect(content.check.some((q) => 'hl' in q && q.hl)).toBe(true);
    for (const q of content.check) {
      expect(q.hints).toHaveLength(2);
      expect(q.worked.length).toBeGreaterThan(10);
      expect(q.explanation.length).toBeGreaterThan(10);
      if (q.type === 'choice') expect(q.options!.filter((o) => 'correct' in o && o.correct).length, q.id).toBe(1);
    }
  });
  it('number questions: answers are hand-checked and the common slips get their own feedback', () => {
    const nq = (id: string) => content.check.find((q) => q.id === id) as unknown as NumberQuestion;
    expect(nq('q2').answer).toBeCloseTo(pesFromData(10, 12, 100, 130), 9);
    expect(nq('q5').answer).toBeCloseTo(pctQFromPes(0.5, 8), 9);
    expect(nq('q6').answer).toBeCloseTo(newQuantity(400, 2, 10), 9);
    // Inverted formula: (20 / 30) typed as 0.67 or 0.667.
    expect(checkNumber(nq('q2'), 0.667).feedback).toMatch(/upside down/);
    expect(checkNumber(nq('q2'), 15).feedback).toMatch(/% changes/);
    expect(checkNumber(nq('q5'), 16).feedback).toMatch(/divided/);
    expect(checkNumber(nq('q6'), 80).feedback).toMatch(/change/);
    for (const id of ['q2', 'q5', 'q6']) for (const m of nq(id).mistakes!) expect(checkNumber(nq(id), m.value).ok, `${id} ${m.value}`).toBe(false);
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
