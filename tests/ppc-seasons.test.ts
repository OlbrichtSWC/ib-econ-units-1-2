import { describe, expect, it } from 'vitest';
import { output } from '../src/activities/ppc-explorer/model';
import { islandAt, meetsNeed, needImpossible, SeasonLevel, workingPlans, yearWon } from '../src/activities/ppc-explorer/seasons';
import content from '../public/content/activities/ppc-explorer.json';

const levels = (content.try as unknown as { seasonLevels: SeasonLevel[] }).seasonLevels;
const seasons = levels[0].seasons;
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
    for (const l of levels) for (const s of l.seasons) if (s.event) expect(outcomes, s.id).toContain(s.event.correct);
  });
});

describe('PPC Explorer: season levels get harder', () => {
  it('has three levels that ask for more correct predictions each time', () => {
    expect(levels).toHaveLength(3);
    expect(levels.map((l) => l.minPredictions)).toEqual([2, 3, 4]);
    expect(levels[2].impossibleOption).toBe(true);
  });

  it('Spring is never already solved by the starting plan', () => {
    for (const l of levels) {
      const plans = workingPlans(l.seasons, 0);
      expect(plans, l.title).not.toContain(l.startFishers);
    }
  });

  it('Level 2: every season has exactly one plan that works', () => {
    levels[1].seasons.forEach((s, i) => expect(workingPlans(levels[1].seasons, i), s.id).toHaveLength(1));
  });

  it('Level 3: exactly one season need lies outside the PPC, and every other season can be met', () => {
    const l = levels[2];
    const impossible = l.seasons.map((_, i) => needImpossible(l.seasons, i));
    expect(impossible.filter(Boolean)).toHaveLength(1);
    l.seasons.forEach((s, i) => {
      if (!impossible[i]) expect(workingPlans(l.seasons, i).length, s.id).toBeGreaterThan(0);
    });
  });

  it('Levels 1 and 2 have no impossible season', () => {
    for (const l of levels.slice(0, 2)) l.seasons.forEach((s, i) => expect(needImpossible(l.seasons, i), s.id).toBe(false));
  });

  it('a year is won only with every need met AND enough predictions right', () => {
    const l = levels[0];
    expect(yearWon(l, [true, true, true, true], 2)).toBe(true);
    expect(yearWon(l, [true, true, true, true], 1)).toBe(false);
    expect(yearWon(l, [true, false, true, true], 3)).toBe(false);
    expect(yearWon(l, [true, true, true], 3)).toBe(false);
  });
});
