import { shuffled } from '../../activities/island-economy/model';
/**
 * A fresh random starting point for a game, so each time a student opens it, the scenarios
 * come in a different order (and, where a game has a bigger pool, a different mix).
 * Games still pass the seed to a repeatable shuffle, so tests can fix it.
 */
export function newSeed(): number {
  return 1 + Math.floor(Math.random() * 100000);
}

/**
 * Take `n` items from a bigger pool, in a repeatable random order for this seed.
 * Items that pass `keep` are always in the round (for example the ones that light up a map).
 */
export function drawRound<T>(pool: readonly T[], n: number, seed: number, keep?: (item: T) => boolean): T[] {
  const kept = keep ? pool.filter(keep) : [];
  const rest = keep ? pool.filter((x) => !keep(x)) : [...pool];
  const extra = shuffled(rest, seed + 101).slice(0, Math.max(0, Math.min(n, pool.length) - kept.length));
  return shuffled([...kept, ...extra], seed);
}
