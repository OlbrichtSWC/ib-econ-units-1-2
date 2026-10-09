import { describe, expect, it } from 'vitest';
import { ordered, ppc } from '../src/activities/ppc-explorer/model';
import { ppcPosition } from '../src/econ/calc';
import {
  applyJobs, displayOrder, islandAt, ISLANDERS, Job, needImpossible, outputOf, SeasonLevel, starsOnOffer, workingPlans, yearWon,
} from '../src/activities/ppc-explorer/seasons';
import content from '../public/content/activities/ppc-explorer.json';

const levels = (content.try as unknown as { seasonLevels: SeasonLevel[] }).seasonLevels;
const outcomes = (content.try as unknown as { outcomes: { id: string }[] }).outcomes.map((o) => o.id);
const PIVOTS = ['pivot-fish', 'pivot-fish-in', 'pivot-timber-out', 'pivot-timber-in'];
/** 3 jobs (fishing, timber, home) for 10 islanders. */
const ALL_PLANS = 3 ** 10;

/** What an event's effect does to the PPC, worked out from the numbers. */
function outcomeOf(e: { fish?: number; timber?: number; jobs?: number }): string {
  const f = e.fish ?? 1, t = e.timber ?? 1;
  if (e.jobs) return e.jobs < 0 ? 'move-inside' : 'move-toward';
  if (f === t) return f > 1 ? 'shift-out' : 'shift-in';
  if (t === 1) return f > 1 ? 'pivot-fish' : 'pivot-fish-in';
  return t > 1 ? 'pivot-timber-out' : 'pivot-timber-in';
}

describe('PPC Explorer: four seasons', () => {
  it('has three levels of four seasons', () => {
    expect(levels).toHaveLength(3);
    for (const l of levels) expect(l.seasons).toHaveLength(4);
  });

  it('each event answer matches what its numbers do to the PPC', () => {
    for (const l of levels) for (const s of l.seasons) if (s.event) expect(s.event.correct, s.id).toBe(outcomeOf(s.event.effect));
  });

  it('Levels 1 and 2 only shift the whole PPC or change jobs; one-axis pivots wait for Level 3', () => {
    for (const l of levels.slice(0, 2)) {
      for (const s of l.seasons) if (s.event) expect(PIVOTS, s.id).not.toContain(s.event.correct);
      for (const c of l.choices) expect(PIVOTS).not.toContain(c);
    }
    const l3 = levels[2].seasons.filter((s) => s.event && PIVOTS.includes(s.event.correct));
    expect(l3.length).toBeGreaterThanOrEqual(2);
    expect(levels[2].choices).toEqual(expect.arrayContaining(PIVOTS));
  });

  it("every event's answer is one of the choices at its level", () => {
    for (const l of levels) {
      for (const c of l.choices) expect(outcomes).toContain(c);
      for (const s of l.seasons) if (s.event) expect(l.choices, s.id).toContain(s.event.correct);
    }
  });

  it('every season that can be met needs thought: under 0.1% of job plans work', () => {
    for (const l of levels) {
      l.seasons.forEach((s, i) => {
        const n = workingPlans(l.seasons, i).length;
        if (needImpossible(l.seasons, i)) return;
        expect(n, s.id).toBeGreaterThan(0);
        expect(n / ALL_PLANS, s.id).toBeLessThan(0.001);
      });
    }
  });

  it('Level 2 needs are tighter: at most 12 plans work in any season', () => {
    levels[1].seasons.forEach((s, i) => expect(workingPlans(levels[1].seasons, i).length, s.id).toBeLessThanOrEqual(12));
  });

  it('Levels 1 and 2 have no impossible season; Level 3 has exactly one', () => {
    for (const l of levels.slice(0, 2)) l.seasons.forEach((s, i) => expect(needImpossible(l.seasons, i), s.id).toBe(false));
    const l = levels[2];
    expect(l.impossibleOption).toBe(true);
    expect(l.seasons.filter((_, i) => needImpossible(l.seasons, i))).toHaveLength(1);
  });

  it("the impossible need lies clearly outside the PPC, not just between two plans", () => {
    const l = levels[2];
    const i = l.seasons.findIndex((_, k) => needImpossible(l.seasons, k));
    const sched = ppc(islandAt(l.seasons, i).workers);
    expect(ppcPosition(sched, l.seasons[i].need.fish, l.seasons[i].need.timber, 3)).toBe('outside');
  });

  it('Spring is never already solved by the starting jobs, and the start is inside the PPC', () => {
    for (const l of levels) {
      const plans = workingPlans(l.seasons, 0).map((p) => p.join(''));
      expect(plans, l.title).not.toContain(l.start);
      const isl = islandAt(l.seasons, -1);
      const o = outputOf(isl.workers, l.start.split('') as Job[]);
      expect(ppcPosition(ppc(isl.workers), o.fish, o.timber), l.title).toBe('inside');
    }
  });

  it('the wrong people in the wrong jobs put the island inside its PPC', () => {
    const w = islandAt(levels[0].seasons, -1).workers;
    const swapped = outputOf(w, 'TTTTTFFFFF'.split('') as Job[]);
    const right = outputOf(w, 'FFFFFTTTTT'.split('') as Job[]);
    expect(swapped).toEqual({ fish: 15, timber: 15 });
    expect(right).toEqual({ fish: 40, timber: 40 });
    expect(ppcPosition(ppc(w), right.fish, right.timber)).toBe('on');
  });

  it('jobs lost send islanders home from the end of the list, and they get their job back', () => {
    const start = 'FFFFFTTTTT'.split('') as Job[];
    const lost = applyJobs(start, [], 7);
    expect(lost.jobs.join('')).toBe('FFFFFTTHHH');
    const back = applyJobs(lost.jobs, lost.laidOff, 10);
    expect(back.jobs.join('')).toBe('FFFFFTTTTT');
    expect(back.laidOff).toEqual([]);
  });

  it('stars on offer and the stamp rule', () => {
    expect(levels.map(starsOnOffer)).toEqual([7, 8, 8]);
    expect(levels.map((l) => l.minStars)).toEqual([5, 6, 7]);
    const l = levels[0];
    expect(yearWon(l, [true, true, true, true], 5)).toBe(true);
    expect(yearWon(l, [true, true, true, true], 4)).toBe(false);
    expect(yearWon(l, [true, false, true, true], 7)).toBe(false);
    expect(yearWon(l, [true, true, true], 7)).toBe(false);
  });

  it('Level 3 shows the islanders in a mixed order; every order lists each islander once', () => {
    expect(displayOrder(levels[2])).not.toEqual([...Array(10).keys()]);
    for (const l of levels) expect([...displayOrder(l)].sort((a, b) => a - b)).toEqual([...Array(10).keys()]);
  });
});

describe('PPC Explorer: cost questions', () => {
  const at = (lv: number, season: number, name: string) => {
    const w = ordered(islandAt(levels[lv].seasons, season).workers)[ISLANDERS.indexOf(name)];
    return { fish: Math.round(w.fish * 100) / 100, timber: Math.round(w.timber * 100) / 100 };
  };

  it('every season has a question with four choices and one right answer', () => {
    for (const l of levels) for (const s of l.seasons) {
      expect(s.check.choices, s.id).toHaveLength(4);
      expect(s.check.correct, s.id).toBeGreaterThanOrEqual(0);
      expect(s.check.correct, s.id).toBeLessThan(4);
      expect(s.check.explain, s.id).toBeTruthy();
    }
  });

  it("Level 1: Dara's numbers and opportunity cost, before and after the 30% rise", () => {
    expect(at(0, 0, 'Dara')).toEqual({ fish: 7, timber: 4 });
    expect(at(0, 1, 'Dara')).toEqual({ fish: 9.1, timber: 5.2 });
    expect(4 / 7).toBeCloseTo(0.57, 2);
    expect(5.2 / 9.1).toBeCloseTo(4 / 7, 9);
  });

  it("Level 1: Ana's fish costs 0.1 timber each and Hana's 2.67", () => {
    const ana = at(0, 2, 'Ana'), hana = at(0, 2, 'Hana');
    expect(ana.timber / ana.fish).toBeCloseTo(0.1, 5);
    expect(hana.timber / hana.fish).toBeCloseTo(2.67, 2);
  });

  it('Level 2: the cost of moving from 4 to 5 islanders fishing', () => {
    const s = ppc(islandAt(levels[1].seasons, 2).workers);
    expect(s[4].x).toBeCloseTo(40.8, 5);
    expect(s[4].y).toBeCloseTo(54, 5);
    expect(s[5].x).toBeCloseTo(48, 5);
    expect(s[5].y).toBeCloseTo(48, 5);
    expect((s[4].y - s[5].y) / (s[5].x - s[4].x)).toBeCloseTo(0.83, 2);
  });

  it("Level 2 summer: Ana's and Gus's numbers and opportunity costs", () => {
    expect(at(1, 1, 'Ana')).toEqual({ fish: 12, timber: 1.2 });
    expect(at(1, 1, 'Gus')).toEqual({ fish: 4.8, timber: 8.4 });
    expect(1.2 / 12).toBeCloseTo(0.1, 9);
    expect(8.4 / 4.8).toBeCloseTo(1.75, 9);
  });

  it("Level 3: Ana's opportunity cost after the reef closes", () => {
    const ana = at(2, 0, 'Ana');
    expect(ana).toEqual({ fish: 6, timber: 1 });
    expect(ana.timber / ana.fish).toBeCloseTo(0.17, 2);
  });

  it('Level 3: Island B costs rise 0.3, 0.7, 2 and Island A stays at 1', () => {
    const a = [30, 20, 10, 0], b = [30, 27, 20, 0];
    const cost = (t: number[]) => t.slice(1).map((v, i) => (t[i] - v) / 10);
    expect(cost(a)).toEqual([1, 1, 1]);
    expect(cost(b)).toEqual([0.3, 0.7, 2]);
  });

  it("Level 3 winter: Pinewood's last fisher (Jaya) costs more timber per fish than anyone on Flat Rock", () => {
    const j = at(2, 3, 'Jaya');
    expect(ordered(islandAt(levels[2].seasons, 3).workers)[9]).toEqual({ fish: j.fish, timber: j.timber });
    expect(j.timber / j.fish).toBeGreaterThan(1);
  });
});

describe('PPC Explorer: missions', () => {
  const missions = (content.try as unknown as { missions: { id: string; title: string; text: string; how: string[]; done: string }[] }).missions;
  it('every mission says what to do, how to do it, and why it matters', () => {
    expect(missions).toHaveLength(6);
    missions.forEach((m) => {
      expect(m.title, m.id).toBeTruthy();
      expect(m.how.length, m.id).toBeGreaterThanOrEqual(2);
      expect(m.done, m.id).toBeTruthy();
    });
  });

  it('the rising-cost mission can be done: one move into fishing costs more than 2 tonnes of timber per fish', () => {
    const w = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    const costs = w.map((f) => (11 - f) / f);
    expect(costs.some((c) => c > 2)).toBe(true);
    expect(costs[7]).toBeCloseTo(8 / 3, 5);
  });
});

describe('PPC Explorer: cost question answers are not always in the same place', () => {
  it('uses every answer position', () => {
    const places = new Set(levels.flatMap((l) => l.seasons.map((s) => s.check.correct)));
    expect(places.size).toBe(4);
  });
});
