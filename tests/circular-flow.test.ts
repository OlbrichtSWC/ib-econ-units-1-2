import { describe, expect, it } from 'vitest';
import {
  applyChange, buildWon, FLOW_DIRECTION, FLOWS, FORECAST_GOAL, incomeChange, INJECTIONS, isLeakage, isMoney, LEAK_SPOT_GOAL, LEAKAGES, PIPE_SECTOR, PIPES,
  SPOT_GOAL, totalInjections, totalLeakages, Totals,
} from '../src/activities/circular-flow/model';
import content from '../public/content/activities/circular-flow.json';

const t = content.try;
const base: Totals = { savings: 40, taxes: 40, imports: 40, investment: 40, government: 40, exports: 40 };

describe('Money River: the two-sector flow', () => {
  it('money and real flows go in opposite directions in pairs', () => {
    expect(FLOW_DIRECTION.factors).toEqual(FLOW_DIRECTION.spending);
    expect(FLOW_DIRECTION.incomes).toEqual(FLOW_DIRECTION.goods);
    expect(isMoney('factors')).not.toBe(isMoney('spending'));
    expect(isMoney('incomes')).not.toBe(isMoney('goods'));
  });
});

describe('Money River: leakages and injections', () => {
  it('has three of each, in the right sectors', () => {
    expect(LEAKAGES).toEqual(['savings', 'taxes', 'imports']);
    expect(INJECTIONS).toEqual(['investment', 'government', 'exports']);
    expect(PIPE_SECTOR.savings).toBe(PIPE_SECTOR.investment);
    expect(PIPE_SECTOR.taxes).toBe(PIPE_SECTOR.government);
    expect(PIPE_SECTOR.imports).toBe(PIPE_SECTOR.exports);
    for (const p of LEAKAGES) expect(isLeakage(p)).toBe(true);
    for (const p of INJECTIONS) expect(isLeakage(p)).toBe(false);
  });
  it('adds up totals', () => {
    const x = { savings: 40, taxes: 60, imports: 30, investment: 50, government: 45, exports: 25 };
    expect(totalLeakages(x)).toBe(130);
    expect(totalInjections(x)).toBe(120);
  });
  it('national income rises, falls or stays the same', () => {
    expect(incomeChange(base)).toBe('same');
    expect(incomeChange(applyChange(base, 'investment', 20))).toBe('rise');
    expect(incomeChange(applyChange(base, 'savings', 15))).toBe('fall');
    expect(incomeChange(applyChange(applyChange(base, 'taxes', 10), 'government', 10))).toBe('same');
  });
});

describe('Money River: content', () => {
  it('scenarios use real flows and pipes', () => {
    for (const s of t.spots) expect(FLOWS, s.id).toContain(s.answer);
    for (const s of t.leakSpots) expect(PIPES, s.id).toContain(s.answer);
    expect(new Set(t.leakSpots.map((s) => s.answer)).size).toBe(6);
  });
  it('forecast rounds include every outcome', () => {
    const outcomes = t.rounds.map((r) => {
      let x = r.totals as Totals;
      const c = (r as { change?: { pipe: keyof Totals; by: number } }).change;
      const c2 = (r as { change2?: { pipe: keyof Totals; by: number } }).change2;
      if (c) x = applyChange(x, c.pipe, c.by);
      if (c2) x = applyChange(x, c2.pipe, c2.by);
      return incomeChange(x);
    });
    expect(new Set(outcomes)).toEqual(new Set(['rise', 'fall', 'same']));
  });
  it('goals fit the content', () => {
    expect(t.spots.length).toBeGreaterThanOrEqual(SPOT_GOAL);
    expect(t.leakSpots.length).toBeGreaterThanOrEqual(LEAK_SPOT_GOAL);
    expect(t.rounds.length).toBeGreaterThanOrEqual(FORECAST_GOAL);
    expect(buildWon(2, SPOT_GOAL)).toBe(true);
    expect(buildWon(3, 5)).toBe(false);
    expect(buildWon(0, SPOT_GOAL - 1)).toBe(false);
  });
});
