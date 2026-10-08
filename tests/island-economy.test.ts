import { describe, expect, it } from 'vitest';
import {
  BEACH_GOAL, beachWon, DETECTIVE_GOAL, detectiveWon, FACTORS, opportunityCost, QUESTIONS, shuffled, SYSTEMS, VILLAGE_GOAL, villageWon,
} from '../src/activities/island-economy/model';
import content from '../public/content/activities/island-economy.json';

const t = content.try;

describe('Castaway Council: opportunity cost', () => {
  it('is the next best alternative given up, not every alternative', () => {
    expect(opportunityCost(['houses', 'well', 'clinic', 'boats'], 2)).toBe('clinic');
    expect(opportunityCost(['boats', 'clinic', 'well', 'houses'], 1)).toBe('clinic');
  });
  it('is nothing only when every option is affordable', () => {
    expect(opportunityCost(['a', 'b'], 2)).toBeNull();
  });
});

describe('Castaway Council: level goals', () => {
  it('level 1 needs enough first-try sorts AND the opportunity cost right', () => {
    expect(beachWon(BEACH_GOAL, true)).toBe(true);
    expect(beachWon(BEACH_GOAL, false)).toBe(false);
    expect(beachWon(BEACH_GOAL - 1, true)).toBe(false);
  });
  it('levels 2 and 3 count first-try answers', () => {
    expect(villageWon(VILLAGE_GOAL)).toBe(true);
    expect(villageWon(VILLAGE_GOAL - 1)).toBe(false);
    expect(detectiveWon(DETECTIVE_GOAL)).toBe(true);
    expect(detectiveWon(DETECTIVE_GOAL - 1)).toBe(false);
  });
  it('every goal can be reached with the content, but not without some right answers', () => {
    expect(t.items.length).toBeGreaterThanOrEqual(BEACH_GOAL);
    expect(BEACH_GOAL).toBeGreaterThan(t.items.length / 2);
    expect(VILLAGE_GOAL).toBeLessThanOrEqual(t.villages.length * QUESTIONS.length);
    expect(t.cases.length).toBeGreaterThanOrEqual(DETECTIVE_GOAL);
  });
});

describe('Castaway Council: content', () => {
  it('every find belongs to a real basket, and every basket gets at least two finds', () => {
    for (const i of t.items) expect(FACTORS, i.id).toContain(i.factor);
    for (const f of FACTORS) expect(t.items.filter((i) => i.factor === f).length, f).toBeGreaterThanOrEqual(2);
  });
  it('there is one village for each system, and an answer for each question and system', () => {
    expect(t.villages.map((v) => v.system).sort()).toEqual([...SYSTEMS].sort());
    for (const q of QUESTIONS) for (const s of SYSTEMS) expect((t.answers as Record<string, Record<string, string>>)[q][s], `${q} ${s}`).toBeTruthy();
  });
  it('detective cases cover every system and have three clues each', () => {
    for (const s of SYSTEMS) expect(t.cases.some((c) => c.answer === s), s).toBe(true);
    for (const c of t.cases) expect(c.clues).toHaveLength(3);
  });
  it('there are four projects, so ranking leaves two given up', () => {
    expect(t.projects).toHaveLength(4);
  });
});

describe('shuffled', () => {
  it('keeps every item, and the same seed gives the same order', () => {
    const a = shuffled([1, 2, 3, 4, 5, 6], 4);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(shuffled([1, 2, 3, 4, 5, 6], 4)).toEqual(a);
  });
});
