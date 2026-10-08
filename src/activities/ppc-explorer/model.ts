/**
 * The island economy behind PPC Explorer (invented numbers).
 * Each worker can catch some fish or cut some timber. Workers differ, so moving the
 * best timber cutters into fishing costs more timber per fish: increasing opportunity cost.
 * In "constant" mode every worker is identical, so the PPC is a straight line.
 */
import { PpcSchedule } from '../../econ/calc';

export interface Worker {
  fish: number;
  timber: number;
}

export interface Island {
  workers: Worker[];
  /** Workers with jobs (the rest are unemployed). */
  employed: number;
  /** Workers who fish. The other employed workers cut timber. */
  fishers: number;
}

export const INCREASING: Worker[] = [
  { fish: 10, timber: 1 }, { fish: 9, timber: 2 }, { fish: 8, timber: 3 }, { fish: 7, timber: 4 }, { fish: 6, timber: 5 },
  { fish: 5, timber: 6 }, { fish: 4, timber: 7 }, { fish: 3, timber: 8 }, { fish: 2, timber: 9 }, { fish: 1, timber: 10 },
];

export const CONSTANT: Worker[] = Array.from({ length: 10 }, () => ({ fish: 5.5, timber: 5.5 }));

/** Workers ordered from best at fishing (relative to timber) to best at timber. */
export function ordered(workers: Worker[]): Worker[] {
  return [...workers].sort((a, b) => b.fish / b.timber - a.fish / a.timber);
}

/**
 * Output when the first `fishers` workers (best at fishing) fish, the next ones cut timber,
 * and the workers best at timber are the ones without jobs.
 */
export function output(island: Island): { fish: number; timber: number } {
  const w = ordered(island.workers);
  const employed = Math.min(island.employed, w.length);
  const fishers = Math.min(island.fishers, employed);
  let fish = 0, timber = 0;
  w.forEach((wk, i) => {
    if (i < fishers) fish += wk.fish;
    else if (i < employed) timber += wk.timber;
  });
  return { fish, timber };
}

/** The PPC: output with every worker employed, for 0, 1, 2 ... all workers fishing. */
export function ppc(workers: Worker[]): PpcSchedule {
  const out: PpcSchedule = [];
  for (let k = 0; k <= workers.length; k++) {
    const o = output({ workers, employed: workers.length, fishers: k });
    out.push({ x: o.fish, y: o.timber });
  }
  return out;
}

export function scale(workers: Worker[], fishFactor: number, timberFactor: number): Worker[] {
  return workers.map((w) => ({ fish: w.fish * fishFactor, timber: w.timber * timberFactor }));
}
