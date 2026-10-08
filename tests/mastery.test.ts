import { describe, expect, it } from 'vitest';
import { suggestLevel } from '../src/shared/activity/mastery';

const ev = (correct: number, total: number, hints = 0, applyCorrect = 0, applyTotal = 0) => ({ correct, total, hints, applyCorrect, applyTotal });

describe('Suggested proficiency level (honest thresholds)', () => {
  it('no suggestion with fewer than 3 questions', () => expect(suggestLevel(ev(2, 2))).toBeNull());
  it('a perfect score on easy core questions alone is only Proficient, never Exemplary', () => {
    expect(suggestLevel(ev(6, 6, 0, 0, 0))).toBe(6);
  });
  it('Exemplary needs all apply questions right without hints', () => {
    expect(suggestLevel(ev(8, 8, 0, 3, 3))).toBe(8);
    expect(suggestLevel(ev(8, 8, 1, 3, 3))).toBe(7);
    expect(suggestLevel(ev(8, 8, 0, 2, 3))).toBeLessThan(7);
  });
  it('one apply question is not enough evidence for Exemplary', () => {
    expect(suggestLevel(ev(5, 5, 0, 1, 1))).toBe(6);
  });
  it('lots of hints keep a high score at Proficient 1', () => {
    expect(suggestLevel(ev(9, 10, 6, 1, 2))).toBe(5);
  });
  it('maps low scores to Beginning and Developing', () => {
    expect(suggestLevel(ev(1, 6))).toBe(1);
    expect(suggestLevel(ev(2, 6))).toBe(2);
    expect(suggestLevel(ev(3, 6))).toBe(3);
    expect(suggestLevel(ev(4, 6))).toBe(4);
    expect(suggestLevel(ev(5, 6))).toBe(5);
  });
});
