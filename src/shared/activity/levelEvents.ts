/**
 * The stamp pop-up can send the student straight to the next game level.
 * The pop-up lives in the app shell, and the level lives inside the game, so they talk
 * through one browser event. The game's LevelPicker listens and switches level.
 */
export const GO_LEVEL_EVENT = 'econ:go-level';

export function goToLevel(level: number): void {
  window.dispatchEvent(new CustomEvent(GO_LEVEL_EVENT, { detail: { level } }));
}

/**
 * Streak fast track. Each game reports every answer it marks: right first time, or not.
 * The LevelPicker counts the streak for the level being played, and 5 in a row earns that
 * level's stamp early (the app shell awards it), so the student can move up straight away.
 */
export const ANSWER_EVENT = 'econ:answer';
export const STREAK_GOAL = 5;

export function reportAnswer(firstTry: boolean): void {
  window.dispatchEvent(new CustomEvent(ANSWER_EVENT, { detail: { firstTry } }));
}

/** The next streak after one answer. */
export function nextStreak(streak: number, firstTry: boolean): number {
  return firstTry ? streak + 1 : 0;
}

/** The LevelPicker asks the app shell to award a level's stamp (streak fast track). */
export const EARN_LEVEL_EVENT = 'econ:earn-level';

export function earnLevel(level: number): void {
  window.dispatchEvent(new CustomEvent(EARN_LEVEL_EVENT, { detail: { level } }));
}

/**
 * What the stamp pop-up offers next, for a stamp flag: the next game level, or Check it after
 * Level 3. Only on the last pop-up of a queue (queued 1), so a second new stamp is not skipped.
 * Flags: Level 1 = 1 (STAMP.play), Level 2 = 8 (STAMP.level2), Level 3 = 16 (STAMP.level3).
 */
export function nextAfterStamp(
  flag: number,
  queued: number,
  stamp: { play: number; level2: number; level3: number },
): { level: number } | { check: true } | undefined {
  if (queued > 1) return undefined;
  if (flag === stamp.play) return { level: 2 };
  if (flag === stamp.level2) return { level: 3 };
  if (flag === stamp.level3) return { check: true };
  return undefined;
}
