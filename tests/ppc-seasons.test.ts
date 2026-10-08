import { describe, expect, it } from 'vitest';
import { output } from '../src/activities/ppc-explorer/model';
import { islandAt, meetsNeed, Season, workingPlans } from '../src/activities/ppc-explorer/seasons';
import content from '../public/content/activities/ppc-explorer.json';

const seasons = (content.try as unknown as { seasons: Season[] }).seasons;
const outcomes = (content.try as unknown as { outcomes: { id: string }[] }).outcomes.map((o) => o.id);

describe('PPC Explorer: four seasons', () => {
  it('has four seasons', () => {
    expect(seasons.map((s) => s.id)).toEqual(['spring', 'summer', 'autumn', 'winter']);
  });

  it('every season can be won, but not with every plan (the student has to think)', () => {
    seasons.forEach((s, i) => {
      const plans = workingPlans(seasons, i);
      const { employed } = islandAt(seasons, i);
      expect(plans.length, s.id).toBeGreaterThan(0);
      expect(plans.length, s.id).toBeLessThan(employed + 1);
    });
  });

  it('summer’s need is only possible because of the new nets', () => {
    const before = islandAt(seasons, 0);
    for (let k = 0; k <= 10; k++) {
      expect(meetsNeed(output({ workers: before.workers, employed: 10, fishers: k }), seasons[1].need)).toBe(false);
    }
  });

  it('autumn: 3 workers lose their jobs, so the island produces inside its PPC', () => {
    const a = islandAt(seasons, 2);
    expect(a.employed).toBe(7);
    const plan = workingPlans(seasons, 2)[0];
    const inside = output({ workers: a.workers, employed: 7, fishers: plan });
    const full = output({ workers: a.workers, employed: 10, fishers: plan });
    expect(full.timber).toBeGreaterThan(inside.timber);
  });

  it('winter: jobs come back and timber productivity falls to 60%', () => {
    const w = islandAt(seasons, 3);
    expect(w.employed).toBe(10);
    expect(w.workers[9].timber).toBeCloseTo(10 * 0.6);
    expect(w.workers[0].fish).toBeCloseTo(10 * 1.5);
  });

  it('each event card answer is one of the outcomes students can pick', () => {
    for (const s of seasons) if (s.event) expect(outcomes).toContain(s.event.correct);
  });
});
