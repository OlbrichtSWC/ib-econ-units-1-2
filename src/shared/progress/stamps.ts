/**
 * Stamp rules. Stamps are personal rewards saved with progress.
 * They are never taken away, and they are never compared with anyone else's.
 */
import { ActivityProgress, STAMP, STEP } from './types';

const ALL_STEPS = STEP.learn | STEP.try | STEP.check | STEP.rated;

/**
 * The stamps an activity should have after a change.
 * @param checkJustFinished true when this change is the end of a Check it attempt.
 */
export function autoStamps(a: ActivityProgress, checkJustFinished: boolean): number {
  let s = a.stamps ?? 0;
  if (checkJustFinished && a.total > 0 && a.correct === a.total && a.hints === 0) s |= STAMP.sharp;
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
