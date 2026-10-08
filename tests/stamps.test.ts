import { describe, expect, it } from 'vitest';
import { autoStamps, countStamps, newStampFlags } from '../src/shared/progress/stamps';
import { ActivityProgress, STAMP, STEP } from '../src/shared/progress/types';

const act = (over: Partial<ActivityProgress> = {}): ActivityProgress => ({
  steps: 0, correct: 0, total: 0, hints: 0, applyCorrect: 0, applyTotal: 0, rating: 0, stamps: 0, updated: 700, ...over,
});

describe('Stamps', () => {
  it('First-Try Star: every question right on the first try with no hints', () => {
    expect(autoStamps(act({ correct: 6, total: 6, hints: 0 }), true) & STAMP.sharp).toBeTruthy();
  });

  it('no First-Try Star with a hint or a miss', () => {
    expect(autoStamps(act({ correct: 6, total: 6, hints: 1 }), true) & STAMP.sharp).toBe(0);
    expect(autoStamps(act({ correct: 5, total: 6, hints: 0 }), true) & STAMP.sharp).toBe(0);
    expect(autoStamps(act({ correct: 0, total: 0, hints: 0 }), true) & STAMP.sharp).toBe(0);
  });

  it('First-Try Star is only judged when Check it has just finished', () => {
    expect(autoStamps(act({ correct: 6, total: 6, hints: 0 }), false) & STAMP.sharp).toBe(0);
  });

  it('Full Circle: all four steps done', () => {
    expect(autoStamps(act({ steps: STEP.learn | STEP.try | STEP.check }), false) & STAMP.complete).toBe(0);
    expect(autoStamps(act({ steps: 15 }), false) & STAMP.complete).toBeTruthy();
  });

  it('stamps are never taken away by a weaker attempt', () => {
    const s = autoStamps(act({ correct: 2, total: 6, hints: 4, stamps: STAMP.sharp | STAMP.play }), true);
    expect(s).toBe(STAMP.sharp | STAMP.play);
  });

  it('reports only newly earned stamps, and counts them', () => {
    expect(newStampFlags(STAMP.play, STAMP.play | STAMP.complete)).toEqual([STAMP.complete]);
    expect(newStampFlags(STAMP.play, STAMP.play)).toEqual([]);
    expect(countStamps(STAMP.play | STAMP.sharp | STAMP.complete)).toBe(3);
  });
});
