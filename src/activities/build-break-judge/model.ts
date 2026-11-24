/**
 * Build, Break, Judge (exam skills): the rules behind the bridge game, kept apart from the screen so they can be tested.
 */

/** Level 1: planks placed right first time. The last plank of each bridge places itself, so it scores nothing. */
export const BUILD_GOAL = 19;
/** Level 2: first-try points (find the crack, choose the fix). */
export const BREAK_GOAL = 13;
/** Level 3: first-try points (evaluation point, conclusion). */
export const JUDGE_GOAL = 10;

/** Planks are tapped in order. Returns the next plank index after a tap, or -1 when the tap is not the next plank. */
export function nextPlank(placed: number, tapped: number): number {
  return tapped === placed ? placed + 1 : -1;
}

/** Points on offer in Level 1: every plank but the last in each bridge. */
export function buildMax(builds: readonly { planks: readonly string[] }[]): number {
  return builds.reduce((n, b) => n + b.planks.length - 1, 0);
}

/** A plank placed with no wrong tap since the last one scores a point. */
export const plankPoint = (wrongTaps: number) => (wrongTaps === 0 ? 1 : 0);

export const buildWon = (points: number) => points >= BUILD_GOAL;
export const breakWon = (points: number) => points >= BREAK_GOAL;
export const judgeWon = (points: number) => points >= JUDGE_GOAL;
