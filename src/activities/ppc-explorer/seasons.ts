/**
 * Four seasons on Pinewood Island. Each season starts with an event that changes the island
 * (better tools, lost jobs, a storm), then sets a need for fish and timber. The student
 * places each islander in a job: fishing, cutting timber or at home. Islanders differ in skill,
 * so who does which job matters: the wrong people in the wrong jobs put the island inside its PPC.
 * Effects add up from one season to the next.
 */
import { INCREASING, ordered, scale, Worker } from './model';

export interface SeasonEffect {
  /** Productivity factors, multiplied onto every worker. */
  fish?: number;
  timber?: number;
  /** Change in the number of jobs. */
  jobs?: number;
}

/** A short opportunity cost question asked at the end of a season. */
export interface CostCheck {
  q: string;
  choices: string[];
  /** Index of the right choice. */
  correct: number;
  explain: string;
}

export interface Season {
  id: string;
  name: string;
  icon: string;
  story: string;
  event: null | { title: string; text: string; effect: SeasonEffect; correct: string; explain: string };
  need: { fish: number; timber: number };
  check: CostCheck;
}

/** One letter per islander, in model order (best at fishing first): F fishing, T timber, H at home. */
export type Job = 'F' | 'T' | 'H';

/** Names of the ten islanders, in model order (best at fishing first). */
export const ISLANDERS = ['Ana', 'Ben', 'Chen', 'Dara', 'Eli', 'Femi', 'Gus', 'Hana', 'Ivo', 'Jaya'];

/** The island's workers and jobs at the start of a season, after its event. */
export function islandAt(seasons: Season[], index: number): { workers: Worker[]; employed: number } {
  let workers: Worker[] = INCREASING;
  let employed = INCREASING.length;
  for (let i = 0; i <= index && i < seasons.length; i++) {
    const e = seasons[i].event?.effect;
    if (!e) continue;
    workers = scale(workers, e.fish ?? 1, e.timber ?? 1);
    employed = Math.max(0, Math.min(workers.length, employed + (e.jobs ?? 0)));
  }
  return { workers, employed };
}

/** Output when each islander does the job given. */
export function outputOf(workers: Worker[], jobs: Job[]): { fish: number; timber: number } {
  const w = ordered(workers);
  let fish = 0, timber = 0;
  jobs.forEach((j, i) => {
    if (!w[i]) return;
    if (j === 'F') fish += w[i].fish;
    else if (j === 'T') timber += w[i].timber;
  });
  return { fish, timber };
}

export const working = (jobs: Job[]) => jobs.filter((j) => j !== 'H').length;

export function meetsNeed(out: { fish: number; timber: number }, need: { fish: number; timber: number }): boolean {
  return out.fish >= need.fish - 1e-9 && out.timber >= need.timber - 1e-9;
}

/** Every job plan (no more islanders working than there are jobs) that meets a season's need. */
export function workingPlans(seasons: Season[], index: number): Job[][] {
  const { workers, employed } = islandAt(seasons, index);
  const n = workers.length;
  const plans: Job[][] = [];
  const jobs: Job[] = new Array(n).fill('H');
  const walk = (i: number, used: number) => {
    if (i === n) {
      if (meetsNeed(outputOf(workers, jobs), seasons[index].need)) plans.push([...jobs]);
      return;
    }
    for (const j of ['F', 'T', 'H'] as Job[]) {
      if (j !== 'H' && used >= employed) continue;
      jobs[i] = j;
      walk(i + 1, used + (j === 'H' ? 0 : 1));
    }
    jobs[i] = 'H';
  };
  walk(0, 0);
  return plans;
}

/**
 * After a change in the number of jobs: islanders lose jobs from the end of the list,
 * and islanders sent home by an earlier event get their old job back when jobs return.
 */
export function applyJobs(jobs: Job[], laidOff: { i: number; job: Job }[], employed: number): { jobs: Job[]; laidOff: { i: number; job: Job }[] } {
  const next = [...jobs];
  const off = [...laidOff];
  for (let i = next.length - 1; i >= 0 && working(next) > employed; i--) {
    if (next[i] !== 'H') {
      off.push({ i, job: next[i] });
      next[i] = 'H';
    }
  }
  while (off.length && working(next) < employed) {
    const back = off.pop()!;
    if (next[back.i] === 'H') next[back.i] = back.job;
  }
  return { jobs: next, laidOff: off };
}

/** One level of the Four seasons game. */
export interface SeasonLevel {
  title: string;
  blurb: string;
  /** Jobs when the year starts, one letter per islander. Chosen so Spring is not already solved. */
  start: string;
  /** Stars needed for the stamp: right predictions plus right cost checks, first try. */
  minStars: number;
  /** Prediction choices offered at this level (outcome ids). */
  choices: string[];
  /** Show islanders in a mixed order, so students read their skills instead of the list position. */
  mixed?: boolean;
  /** Level 3: some needs lie outside what the island can make, and the student can say so. */
  impossibleOption?: boolean;
  seasons: Season[];
}

/** True when no plan can meet a season's need. */
export function needImpossible(seasons: Season[], index: number): boolean {
  return workingPlans(seasons, index).length === 0;
}

/** Stars on offer in a level: one per event prediction and one per cost check. */
export function starsOnOffer(level: SeasonLevel): number {
  return level.seasons.filter((s) => s.event).length + level.seasons.length;
}

/** Whether a finished year earns the level's stamp. */
export function yearWon(level: SeasonLevel, seasonsMet: boolean[], stars: number): boolean {
  return seasonsMet.length === level.seasons.length && seasonsMet.every(Boolean) && stars >= level.minStars;
}

/** The order islanders are shown in (indexes into the model order). */
export function displayOrder(level: SeasonLevel): number[] {
  return level.mixed ? [3, 8, 0, 6, 4, 9, 1, 7, 5, 2] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
}
