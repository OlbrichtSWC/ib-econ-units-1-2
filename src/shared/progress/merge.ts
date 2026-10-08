import { ActivityProgress, Progress } from './types';

function bitCount(n: number): number {
  let c = 0;
  for (let v = n; v; v >>= 1) c += v & 1;
  return c;
}

/** True if `a` should be kept over `b`: newer day first, then more steps done, then more questions tried. */
export function isNewer(a: ActivityProgress, b: ActivityProgress): boolean {
  if (a.updated !== b.updated) return a.updated > b.updated;
  if (bitCount(a.steps) !== bitCount(b.steps)) return bitCount(a.steps) > bitCount(b.steps);
  return a.total > b.total;
}

function same(a: ActivityProgress, b: ActivityProgress): boolean {
  return (Object.keys(a) as (keyof ActivityProgress)[]).every((k) => a[k] === b[k]);
}

/** Activities saved on both sides with different progress. */
export function conflicts(current: Progress, incoming: Progress): string[] {
  return Object.keys(incoming.activities).filter(
    (id) => current.activities[id] && !same(current.activities[id], incoming.activities[id]),
  );
}

export type MergeChoice = 'replace' | 'keep-newer';

/**
 * replace: the code's progress replaces everything on this device.
 * keep-newer: for each activity, keep whichever side changed more recently.
 */
export function mergeProgress(current: Progress, incoming: Progress, choice: MergeChoice): Progress {
  if (choice === 'replace') return structuredCloneSafe(incoming);
  const out: Progress = structuredCloneSafe(current);
  for (const [id, inc] of Object.entries(incoming.activities)) {
    const cur = out.activities[id];
    if (!cur || isNewer(inc, cur)) out.activities[id] = { ...inc };
    // Stamps are never lost: keep every stamp earned on either device.
    if (cur) out.activities[id].stamps = (cur.stamps ?? 0) | (inc.stamps ?? 0);
  }
  return out;
}

function structuredCloneSafe(p: Progress): Progress {
  return JSON.parse(JSON.stringify(p));
}
