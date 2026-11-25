import { describe, expect, it } from 'vitest';
import { nextAfterStamp, nextStreak, STREAK_GOAL } from '../src/shared/activity/levelEvents';
import { STAMP } from '../src/shared/progress/types';

describe('streak fast track', () => {
  it('counts answers right first time in a row', () => {
    let s = 0;
    for (const ok of [true, true, true]) s = nextStreak(s, ok);
    expect(s).toBe(3);
  });
  it('resets on a miss', () => {
    expect(nextStreak(4, false)).toBe(0);
  });
  it('needs five in a row', () => {
    expect(STREAK_GOAL).toBe(5);
    let s = 0;
    const answers = [true, true, false, true, true, true, true, true];
    const hits: number[] = [];
    answers.forEach((ok, i) => {
      s = nextStreak(s, ok);
      if (s === STREAK_GOAL) hits.push(i);
    });
    expect(hits).toEqual([7]);
  });
});

describe('stamp pop-up next step', () => {
  it('offers the next level after Level 1 and Level 2 stamps', () => {
    expect(nextAfterStamp(STAMP.play, 1, STAMP)).toEqual({ level: 2 });
    expect(nextAfterStamp(STAMP.level2, 1, STAMP)).toEqual({ level: 3 });
  });
  it('offers Check it after the Level 3 stamp', () => {
    expect(nextAfterStamp(STAMP.level3, 1, STAMP)).toEqual({ check: true });
  });
  it('offers nothing for other stamps or when more pop-ups are queued', () => {
    expect(nextAfterStamp(STAMP.sharp, 1, STAMP)).toBeUndefined();
    expect(nextAfterStamp(STAMP.complete, 1, STAMP)).toBeUndefined();
    expect(nextAfterStamp(STAMP.play, 2, STAMP)).toBeUndefined();
  });
});
