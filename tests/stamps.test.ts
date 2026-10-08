import { describe, expect, it } from 'vitest';
import { autoStamps, countStamps, levelFlag, levelUnlocked, newStampFlags } from '../src/shared/progress/stamps';
import { attemptEvidence, FREE_HINTS } from '../src/shared/activity/CheckIt';
import type { Question } from '../src/shared/activity/types';
import { stampsFor } from '../src/shared/fun/stampDefs';
import { ACTIVITIES } from '../src/app/registry';
import { ActivityProgress, STAMP, STEP } from '../src/shared/progress/types';

const act = (over: Partial<ActivityProgress> = {}): ActivityProgress => ({
  steps: 0, correct: 0, total: 0, hints: 0, applyCorrect: 0, applyTotal: 0, rating: 0, stamps: 0, updated: 700, ...over,
});

describe('Stamps', () => {
  it('First-Try Star: every question right on the first try (Check it decides, and passes sharp = true)', () => {
    expect(autoStamps(act({ correct: 6, total: 6, hints: 3 }), true, true) & STAMP.sharp).toBeTruthy();
  });

  it('no First-Try Star after a miss, or when the attempt was not sharp', () => {
    expect(autoStamps(act({ correct: 6, total: 6 }), true, false) & STAMP.sharp).toBe(0);
    expect(autoStamps(act({ correct: 5, total: 6 }), true, true) & STAMP.sharp).toBe(0);
    expect(autoStamps(act({ correct: 0, total: 0 }), true, true) & STAMP.sharp).toBe(0);
  });

  it('First-Try Star is only judged when Check it has just finished', () => {
    expect(autoStamps(act({ correct: 6, total: 6, hints: 0 }), false, true) & STAMP.sharp).toBe(0);
  });

  it('Full Circle: all four steps done', () => {
    expect(autoStamps(act({ steps: STEP.learn | STEP.try | STEP.check }), false) & STAMP.complete).toBe(0);
    expect(autoStamps(act({ steps: 15 }), false) & STAMP.complete).toBeTruthy();
  });

  it('stamps are never taken away by a weaker attempt', () => {
    const s = autoStamps(act({ correct: 2, total: 6, hints: 4, stamps: STAMP.sharp | STAMP.play }), true, false);
    expect(s).toBe(STAMP.sharp | STAMP.play);
  });

  it('reports only newly earned stamps, and counts them', () => {
    expect(newStampFlags(STAMP.play, STAMP.play | STAMP.complete)).toEqual([STAMP.complete]);
    expect(newStampFlags(STAMP.play, STAMP.play)).toEqual([]);
    expect(countStamps(STAMP.play | STAMP.sharp | STAMP.complete)).toBe(3);
  });
});

describe('Check it: one hint per question still counts as a first try', () => {
  const q = (level: 'core' | 'apply'): Question => ({
    id: 'q', type: 'choice', level, prompt: '', hints: ['', ''], worked: '', explanation: '', options: [{ text: 'a', correct: true, feedback: '' }],
  });
  const st = (attempts: number, hints: number, revealed = false) => ({ attempts, hints, revealed, solved: true });
  const qs = [q('core'), q('core'), q('apply')];

  it('allows exactly one free hint', () => {
    expect(FREE_HINTS).toBe(1);
  });

  it('one hint on each question keeps the First-Try Star', () => {
    const e = attemptEvidence(qs, [st(1, 1), st(1, 1), st(1, 0)]);
    expect(e.sharp).toBe(true);
    expect(e.correct).toBe(3);
    expect(e.applyCorrect).toBe(1);
  });

  it('a second hint on any question loses the star, but the answer still counts as correct', () => {
    const e = attemptEvidence(qs, [st(1, 2), st(1, 0), st(1, 0)]);
    expect(e.sharp).toBe(false);
    expect(e.correct).toBe(3);
  });

  it('a second try, or a revealed answer, is not a first-try answer', () => {
    expect(attemptEvidence(qs, [st(2, 0), st(1, 0), st(1, 0)])).toMatchObject({ sharp: false, correct: 2 });
    expect(attemptEvidence(qs, [st(1, 0, true), st(1, 0), st(1, 0)])).toMatchObject({ sharp: false, correct: 2 });
  });

  it('an apply question needs the first try with at most one hint', () => {
    expect(attemptEvidence(qs, [st(1, 0), st(1, 0), st(1, 2)]).applyCorrect).toBe(0);
    expect(attemptEvidence(qs, [st(1, 0), st(1, 0), st(1, 1)]).applyCorrect).toBe(1);
  });
});

describe('Game levels', () => {
  it('Level 2 opens with the Level 1 stamp, Level 3 with the Level 2 stamp', () => {
    expect(levelUnlocked(0, 1)).toBe(true);
    expect(levelUnlocked(0, 2)).toBe(false);
    expect(levelUnlocked(STAMP.play, 2)).toBe(true);
    expect(levelUnlocked(STAMP.play, 3)).toBe(false);
    expect(levelUnlocked(STAMP.play | STAMP.level2, 3)).toBe(true);
    // Other stamps do not open levels.
    expect(levelUnlocked(STAMP.sharp | STAMP.complete, 2)).toBe(false);
  });

  it('each level has its own stamp flag', () => {
    expect([levelFlag(1), levelFlag(2), levelFlag(3)]).toEqual([STAMP.play, STAMP.level2, STAMP.level3]);
  });

  it('every built activity offers five stamps: three levels and the two shared ones', () => {
    for (const a of ACTIVITIES.filter((x) => x.load)) {
      const defs = stampsFor(a);
      expect(defs.map((d) => d.flag), a.id).toEqual([STAMP.play, STAMP.level2, STAMP.level3, STAMP.sharp, STAMP.complete]);
      expect(new Set(defs.map((d) => d.name)).size, a.id).toBe(5);
    }
  });
});

