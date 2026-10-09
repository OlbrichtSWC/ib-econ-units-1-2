import { describe, expect, it } from 'vitest';
import {
  closeness, EXTS, FIX_GOAL, fixWon, gapAt, gapFor, GAPS, JUDGE_GOAL, judgeWon, lossAt, lossMistakes, lossTriangle, marketPoint, Market, msbLine,
  mscLine, numberRight, optimum, outcome, parseNumber, POINTS_PER_JUDGE_ROUND, rightSize, shiftedCurve, sizeRight, sizeVerdict, SPOT_GOAL, SPOTS,
  spotWon, sunshine, Tool, toolFits, TOOLS, welfareLoss,
} from '../src/activities/externality-fixer/model';
import type { Ext } from '../src/activities/externality-fixer/model';
import { renderInline } from '../src/shared/content/markdown';
import content from '../public/content/activities/externality-fixer.json';

const t = content.try;
const L = (a: [number, number], b: [number, number]) => ({ a: { q: a[0], p: a[1] }, b: { q: b[0], p: b[1] } });
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

// A hand-checked negative production externality: MPB = 20 − 0.2Q, MPC = 2 + 0.1Q, MSC = 8 + 0.1Q.
// Market: 20 − 0.2Q = 2 + 0.1Q, so Qm = 60, P = 8. Optimum: 20 − 0.2Q = 8 + 0.1Q, so Q* = 40, P* = 12.
const negProd: Market = { ext: 'neg-prod', mpb: L([0, 20], [100, 0]), mpc: L([0, 2], [100, 12]), social: L([0, 8], [100, 18]) };
// A positive consumption externality: MPB = 16 − 0.2Q, MSB = 22 − 0.2Q, MPC = 4 + 0.1Q. Qm = 40, Q* = 60, P* = 10.
const posCons: Market = { ext: 'pos-cons', mpb: L([0, 16], [80, 0]), mpc: L([0, 4], [100, 14]), social: L([0, 22], [100, 2]) };
// Diverging curves: MSC = 2 + 0.2Q, so the gap grows with output. Qm = 60, Q* = 45, gap at Q* = 4.5, gap at Qm = 6.
const diverging: Market = { ext: 'neg-prod', mpb: L([0, 20], [100, 0]), mpc: L([0, 2], [100, 12]), social: L([0, 2], [100, 22]) };

describe('Smoke and Sunshine: externality types', () => {
  it('each externality has its own diagram gap', () => {
    expect(gapFor('neg-prod')).toBe('msc-above');
    expect(gapFor('pos-prod')).toBe('msc-below');
    expect(gapFor('neg-cons')).toBe('msb-below');
    expect(gapFor('pos-cons')).toBe('msb-above');
    expect(new Set(EXTS.map(gapFor)).size).toBe(GAPS.length);
  });
  it('a production externality moves the cost curve; a consumption one moves the benefit curve', () => {
    expect(mscLine(negProd)).toBe(negProd.social);
    expect(msbLine(negProd)).toBe(negProd.mpb);
    expect(msbLine(posCons)).toBe(posCons.social);
    expect(mscLine(posCons)).toBe(posCons.mpc);
  });
});

describe('Smoke and Sunshine: market, optimum and welfare loss', () => {
  it('finds Qm where MPB = MPC and Q* where MSB = MSC', () => {
    close(marketPoint(negProd).q, 60);
    close(marketPoint(negProd).p, 8);
    close(optimum(negProd).q, 40);
    close(optimum(negProd).p, 12);
    close(marketPoint(posCons).q, 40);
    close(optimum(posCons).q, 60);
    close(optimum(posCons).p, 10);
  });
  it('measures the external cost or benefit as the vertical gap', () => {
    close(gapAt(negProd, 60), 6);
    close(gapAt(posCons, 40), 6);
    close(gapAt(diverging, 45), 4.5);
    close(gapAt(diverging, 60), 6);
  });
  it('welfare loss = 1/2 × base × height', () => {
    close(welfareLoss(negProd), 0.5 * 20 * 6); // 60
    close(welfareLoss(posCons), 0.5 * 20 * 6); // 60
    close(welfareLoss(diverging), 0.5 * 15 * 6); // 45
    close(lossAt(negProd, 40), 0);
    close(lossAt(negProd, 50), 0.5 * 10 * 3); // halfway there, the triangle is a quarter
  });
  it('the welfare loss triangle has corners at Q*, and at MSB and MSC above Qm', () => {
    const tri = lossTriangle(negProd, 60);
    close(tri[1].q, 60);
    close(tri[1].p, 8); // MSB = MPB at Qm
    close(tri[2].p, 14); // MSC at Qm
    close(tri[0].q, 40);
    close(tri[0].p, 12);
  });
  it('names the common slips in the calculation', () => {
    const m = Object.fromEntries(lossMistakes(diverging).map((x) => [x.kind, x.value]));
    close(m.noHalf, 90);
    close(m.gapAtOptimum, 0.5 * 15 * 4.5);
    close(m.usedQm, 0.5 * 60 * 6);
    close(m.priceBase, 0.5 * 15 * 3); // P* = 11, P = 8
    // With parallel curves the gap is the same at Q* and Qm, so that slip is left out.
    expect(lossMistakes(negProd).some((x) => x.kind === 'gapAtOptimum')).toBe(false);
  });
});

describe('Smoke and Sunshine: policies', () => {
  it('taxes and caps cut output; subsidies and provision raise it; a campaign can do either', () => {
    expect(toolFits('neg-prod', 'tax')).toBe(true);
    expect(toolFits('neg-prod', 'subsidy')).toBe(false);
    expect(toolFits('pos-cons', 'subsidy')).toBe(true);
    expect(toolFits('pos-cons', 'tax')).toBe(false);
    expect(toolFits('pos-prod', 'provision')).toBe(true);
    expect(toolFits('neg-cons', 'regulation')).toBe(true);
    expect(toolFits('neg-cons', 'awareness')).toBe(true);
  });
  it('a tax equal to the external cost at Q* moves output to Q*', () => {
    close(rightSize(negProd, 'tax'), 6);
    close(outcome(negProd, 'tax', 6).q, 40);
    close(outcome(negProd, 'tax', 0).q, 60);
    close(rightSize(diverging, 'tax'), 4.5);
    close(outcome(diverging, 'tax', 4.5).q, 45);
    // The gap at Qm is too big a tax when the curves diverge: output falls below Q*.
    close(outcome(diverging, 'tax', 6).q, 40);
    expect(sizeVerdict(diverging, 'tax', 6, 0.5)).toBe('big');
    expect(sizeVerdict(diverging, 'tax', 3, 0.5)).toBe('small');
    expect(sizeVerdict(diverging, 'tax', 4.5, 0.5)).toBe('right');
  });
  it('a subsidy and a campaign equal to the external benefit at Q* move output to Q*', () => {
    close(rightSize(posCons, 'subsidy'), 6);
    close(outcome(posCons, 'subsidy', 6).q, 60);
    close(rightSize(posCons, 'awareness'), 6);
    close(outcome(posCons, 'awareness', 6).q, 60);
    expect(shiftedCurve(posCons, 'awareness', 6)?.which).toBe('mpb');
  });
  it('a campaign against a demerit good shifts demand down', () => {
    const negCons: Market = { ext: 'neg-cons', mpb: L([0, 20], [100, 0]), mpc: L([0, 2], [100, 12]), social: L([0, 14], [70, 0]) };
    close(rightSize(negCons, 'awareness'), 6); // MPB(40) = 12, MPC(40) = 6
    close(outcome(negCons, 'awareness', 6).q, 40);
    close(shiftedCurve(negCons, 'awareness', 6)!.line.a.p, 14);
  });
  it('regulation and permits set a limit of Q* units; a limit above Qm does nothing', () => {
    close(rightSize(negProd, 'regulation'), 40);
    close(rightSize(negProd, 'permits'), 40);
    close(outcome(negProd, 'regulation', 40).q, 40);
    close(outcome(negProd, 'permits', 90).q, 60);
  });
  it('government provision shifts supply right until it meets MPB at Q*', () => {
    // MPB(60) = 4; MPC reaches $4 at Q = 0. So supply must shift right by 60 − 0 = 60.
    close(rightSize(posCons, 'provision'), 60);
    close(outcome(posCons, 'provision', 60).q, 60);
  });
  it('closeness runs from 0 at Qm to 1 at Q*', () => {
    close(closeness(negProd, 60), 0);
    close(closeness(negProd, 50), 0.5);
    close(closeness(negProd, 40), 1);
    close(closeness(negProd, 20), 0);
    close(closeness(negProd, 70), 0);
  });
  it('the size must match to within half a slider step', () => {
    expect(sizeRight(negProd, 'tax', 6, 0.5)).toBe(true);
    expect(sizeRight(negProd, 'tax', 6.5, 0.5)).toBe(false);
  });
});

describe('Smoke and Sunshine: numbers and goals', () => {
  it('reads typed numbers', () => {
    expect(parseNumber('45')).toBe(45);
    expect(parseNumber('$22.5')).toBe(22.5);
    expect(parseNumber('1,200')).toBe(1200);
    expect(parseNumber('abc')).toBeNaN();
    expect(numberRight(45.004, 45)).toBe(true);
    expect(numberRight(46, 45)).toBe(false);
  });
  it('the sun shines as the town is fixed', () => {
    expect(sunshine({})).toBe(0);
    expect(sunshine(Object.fromEntries(SPOTS.map((s) => [s, 1])))).toBe(1);
    close(sunshine({ factory: 1, bees: 0.5 }), 1.5 / 6);
  });
  it('goals count first-try answers and can be reached with the content', () => {
    expect(spotWon(SPOT_GOAL)).toBe(true);
    expect(spotWon(SPOT_GOAL - 1)).toBe(false);
    expect(fixWon(FIX_GOAL)).toBe(true);
    expect(fixWon(FIX_GOAL - 1)).toBe(false);
    expect(judgeWon(JUDGE_GOAL)).toBe(true);
    expect(judgeWon(JUDGE_GOAL - 1)).toBe(false);
    expect(t.scenarios.length).toBe(10);
    expect(SPOT_GOAL).toBeGreaterThan(t.scenarios.length / 2);
    expect(t.markets.length).toBe(6);
    expect(FIX_GOAL).toBeLessThanOrEqual(t.markets.length);
    const maxPoints = t.rounds.length * POINTS_PER_JUDGE_ROUND;
    expect(maxPoints).toBe(18);
    expect(JUDGE_GOAL).toBeLessThanOrEqual(maxPoints);
    expect(JUDGE_GOAL).toBeGreaterThan(maxPoints / 2);
  });
});

const asMarket = (x: { ext: string; mpb: unknown; mpc: unknown; social: unknown }) => x as unknown as Market;

describe('Smoke and Sunshine: content', () => {
  it('level 1 uses all four externality types', () => {
    for (const e of EXTS) expect(t.scenarios.some((s) => s.ext === e), e).toBe(true);
  });

  it('level 2 markets: hand-checked Qm, Q* and policy size, and the right size lands on Q*', () => {
    const expected: Record<string, { qm: number; qs: number; size: number }> = {
      cement: { qm: 60, qs: 45, size: 4.5 },
      honey: { qm: 40, qs: 50, size: 4 },
      music: { qm: 60, qs: 40, size: 40 },
      vaccines: { qm: 40, qs: 60, size: 6 },
      cigarettes: { qm: 50, qs: 40, size: 3 },
      college: { qm: 45, qs: 60, size: 30 },
    };
    for (const k of t.markets) {
      const m = asMarket(k);
      const tool = k.tool as Tool;
      const e = expected[k.id];
      close(marketPoint(m).q, e.qm);
      close(optimum(m).q, e.qs);
      close(rightSize(m, tool), e.size);
      close(outcome(m, tool, rightSize(m, tool)).q, e.qs);
      // The right size is on the slider, and the slider starts away from it.
      const { min, max, step } = k.slider;
      expect(e.size, k.id).toBeGreaterThanOrEqual(min);
      expect(e.size, k.id).toBeLessThanOrEqual(max);
      expect(Number.isInteger((e.size - min) / step), k.id).toBe(true);
      expect(toolFits(k.ext as Ext, tool), k.id).toBe(true);
      // Curves stay inside the drawing at the market and the optimum.
      expect(optimum(m).p).toBeLessThan(k.yMax);
      expect(marketPoint(m).q).toBeLessThan(k.xMax);
    }
  });

  it('level 2: every market offers exactly one right policy, and the wrong ones do not fit', () => {
    for (const k of t.markets) {
      const tools = k.options.map((o) => o.tool);
      expect(tools.filter((x) => x === k.tool).length, k.id).toBe(1);
      expect(new Set(tools).size, k.id).toBe(tools.length);
      for (const x of tools) expect(TOOLS).toContain(x);
      // Every wrong option pushes output the wrong way, except where the brief rules it out (college: run it, not pay others).
      const wrongThatFit = tools.filter((x) => x !== k.tool && toolFits(k.ext as Ext, x as Tool));
      expect(wrongThatFit, k.id).toEqual(k.id === 'college' ? ['subsidy'] : []);
    }
  });

  it('level 2 covers taxes, subsidies, regulation, education and government provision; level 3 adds permits', () => {
    const used = new Set(t.markets.map((k) => k.tool));
    for (const x of ['tax', 'subsidy', 'regulation', 'awareness', 'provision']) expect(used.has(x), x).toBe(true);
    expect(t.rounds.map((r) => r.policy)).toContain('Tradable permits');
    expect(t.rounds.map((r) => r.policy)).toContain('Carbon tax');
  });

  it('level 3 rounds: hand-checked welfare loss, and every judgement has exactly one right answer', () => {
    const expected: Record<string, number> = { steel: 60, power: 25, orchard: 15, noise: 45, smokers: 30, schools: 80 };
    for (const r of t.rounds) {
      close(welfareLoss(asMarket(r)), expected[r.id]);
      expect(r.strengths.filter((o) => 'correct' in o && o.correct).length, r.id).toBe(1);
      expect(r.limits.filter((o) => 'correct' in o && o.correct).length, r.id).toBe(1);
      for (const o of [...r.strengths, ...r.limits]) expect(o.feedback.length, r.id).toBeGreaterThan(10);
      // No slip gives the right answer.
      for (const s of lossMistakes(asMarket(r))) expect(Math.abs(s.value - expected[r.id]), r.id).toBeGreaterThan(0.01);
      expect(optimum(asMarket(r)).p).toBeLessThan(r.yMax);
    }
    const kinds = new Set(t.rounds.map((r) => r.ext));
    expect(kinds.size).toBe(4);
  });

  it('level 1 externality types match the hand-made scenarios', () => {
    const by = Object.fromEntries(t.scenarios.map((s) => [s.id, s.ext]));
    expect(by.factory).toBe('neg-prod');
    expect(by.bees).toBe('pos-prod');
    expect(by.party).toBe('neg-cons');
    expect(by.vaccine).toBe('pos-cons');
    expect(by.smoking).toBe('neg-cons');
    expect(by.college).toBe('pos-cons');
  });

  it('check it: the welfare loss and subsidy questions match the model', () => {
    const q8 = content.check.find((q) => q.id === 'q8')!;
    const m: Market = { ext: 'neg-cons', mpb: L([0, 20], [100, 0]), mpc: L([0, 0], [100, 20]), social: L([0, 14], [70, 0]) };
    close(marketPoint(m).q, 50);
    close(optimum(m).q, 35);
    close(welfareLoss(m), 45);
    expect(q8.answer).toBe(45);
    expect(content.check.find((q) => q.id === 'q9')!.answer).toBe(6 * 60);
    expect(content.check.length).toBeGreaterThanOrEqual(8);
    expect(content.check.length).toBeLessThanOrEqual(9);
    expect(content.check.filter((q) => 'hl' in q && q.hl).every((q) => q.type === 'number')).toBe(true);
  });

  it('on-screen text follows the house style', () => {
    const text = JSON.stringify(content);
    expect(text).not.toMatch(/—|genuinely|honestly|actually|\btick\b|\bcards?\b/i);
  });
});

describe('Markdown: a star after a letter is not italics', () => {
  it('keeps "Q*" as plain text even when it appears twice', () => {
    const out = renderInline('from Q* to Qm, and back to Q* again') as unknown[];
    // One plain text part, no <em>.
    expect(JSON.stringify(out)).not.toContain('"type":"em"');
    const em = renderInline('a *word* here') as { type: unknown }[];
    expect(em.some((p) => p && p.type === 'em')).toBe(true);
  });
});
