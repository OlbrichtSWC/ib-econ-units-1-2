/**
 * Stamp rules. Stamps are personal rewards saved with progress.
 * They are never taken away, and they are never compared with anyone else's.
 */
import { ActivityProgress, STAMP, STEP } from './types';

const ALL_STEPS = STEP.learn | STEP.try | STEP.check | STEP.rated;

/**
 * The stamps an activity should have after a change.
 * @param checkJustFinished true when this change is the end of a Check it attempt.
 * @param sharp true when that attempt had every question right on the first try with at most
 *   one hint on each question (Check it works this out, because progress keeps only the total hints).
 */
export function autoStamps(a: ActivityProgress, checkJustFinished: boolean, sharp = false): number {
  let s = a.stamps ?? 0;
  if (checkJustFinished && sharp && a.total > 0 && a.correct === a.total) s |= STAMP.sharp;
  if ((a.steps & ALL_STEPS) === ALL_STEPS) s |= STAMP.complete;
  return s;
}

/** The stamp flags in `after` that were not in `before`. */
export function newStampFlags(before: number, after: number): number[] {
  return Object.values(STAMP).filter((f) => (after & f) !== 0 && (before & f) === 0);
}

export function countStamps(stamps: number): number {
  return Object.values(STAMP).filter((f) => (stamps & f) !== 0).length;
}

/** The stamp flag for reaching the goal of a game level (1, 2 or 3). */
export function levelFlag(level: number): number {
  return level >= 3 ? STAMP.level3 : level === 2 ? STAMP.level2 : STAMP.play;
}

/**
 * Whether a game level is open. Level 1 is always open. Level 2 opens with the Level 1 stamp,
 * and Level 3 with the Level 2 stamp, so each level builds on the one before.
 */
export function levelUnlocked(stamps: number, level: number): boolean {
  if (level <= 1) return true;
  return (stamps & levelFlag(level - 1)) !== 0;
}
