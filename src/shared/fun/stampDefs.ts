import { STAMP } from '../progress/types';
import type { StampIcon } from './Stamp';

export interface StampDef {
  flag: number;
  name: string;
  /** How to earn it, shown in the stamp book. */
  how: string;
  icon: StampIcon;
}

/** Each activity names its own game stamp; the other two are the same everywhere. */
export interface GoalStamp {
  name: string;
  how: string;
  icon: StampIcon;
}

export function stampsFor(goal: GoalStamp): StampDef[] {
  return [
    { flag: STAMP.play, ...goal },
    { flag: STAMP.sharp, name: 'First-Try Star', how: 'Get every Check it question right on the first try, with no hints.', icon: 'star' },
    { flag: STAMP.complete, name: 'Full Circle', how: 'Finish all four steps: Learn it, Try it, Check it and Self-rate.', icon: 'circle' },
  ];
}
