/**
 * Four seasons on Pinewood Island. Each season starts with an event that changes the island
 * (better nets, lost jobs, a storm), then sets a need for fish and timber. The student
 * chooses how many workers fish. Effects add up from one season to the next.
 */
import { INCREASING, Island, output, scale, Worker } from './model';

export interface SeasonEffect {
  /** Productivity factors, multiplied onto every worker. */
  fish?: number;
  timber?: number;
  /** Change in the number of workers with jobs. */
  jobs?: number;
}

export interface Season {
  id: string;
  name: string;
  icon: string;
  story: string;
  event: null | { title: string; text: string; effect: SeasonEffect; correct: string; explain: string };
  need: { fish: number; timber: number };
}

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

export function meetsNeed(out: { fish: number; timber: number }, need: { fish: number; timber: number }): boolean {
  return out.fish >= need.fish - 1e-9 && out.timber >= need.timber - 1e-9;
}

/** Every number of fishers that meets a season's need. */
export function workingPlans(seasons: Season[], index: number): number[] {
  const { workers, employed } = islandAt(seasons, index);
  const plans: number[] = [];
  for (let k = 0; k <= employed; k++) {
    const island: Island = { workers, employed, fishers: k };
    if (meetsNeed(output(island), seasons[index].need)) plans.push(k);
  }
  return plans;
}
