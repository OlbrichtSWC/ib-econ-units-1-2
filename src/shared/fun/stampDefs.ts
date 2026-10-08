import { STAMP } from '../progress/types';
import type { StampIcon } from './Stamp';

export interface StampDef {
  flag: number;
  name: string;
  /** How to earn it, shown in the stamp book. */
  how: string;
  icon: StampIcon;
  /** Game level the stamp belongs to (2 or 3). Shown as a small number on the stamp. */
  level?: number;
}

/** Each activity names its own game stamp; the other two are the same everywhere. */
export interface GoalStamp {
  name: string;
  how: string;
  icon: StampIcon;
}

/** What an activity declares about its stamps: one goal stamp per game level. */
export interface StampSource {
  /** Level 1 goal. */
  goal?: GoalStamp;
  /** Level 2 and Level 3 goals (same icon as Level 1, marked with the level number). */
  goals?: [GoalStamp, GoalStamp];
}

/** The stamps an activity offers, in stamp book order: three game levels, then the two shared stamps. */
export function stampsFor(a: StampSource): StampDef[] {
  const defs: StampDef[] = [];
  if (a.goal) defs.push({ flag: STAMP.play, ...a.goal });
  if (a.goals) {
    defs.push({ flag: STAMP.level2, ...a.goals[0], level: 2 });
    defs.push({ flag: STAMP.level3, ...a.goals[1], level: 3 });
  }
  defs.push({
    flag: STAMP.sharp,
    name: 'First-Try Star',
    how: 'Get every Check it question right on the first try. One hint on a question is fine.',
    icon: 'star',
  });
  defs.push({ flag: STAMP.complete, name: 'Full Circle', how: 'Finish all four steps: Learn it, Try it, Check it and Self-rate.', icon: 'circle' });
  return defs;
}
