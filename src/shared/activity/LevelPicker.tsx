/**
 * Level 1, 2 and 3 of a game. Each level is harder than the one before, and opens when the
 * student earns the stamp for the level before it. Teacher view opens every level.
 */
import { StepNo } from '../design/components';
import { Stamp, StampIcon } from '../fun/Stamp';
import { levelFlag, levelUnlocked } from '../progress/stamps';

export interface LevelInfo {
  /** Short name, for example "A calm year". */
  title: string;
  /** One sentence on what is new or harder. */
  blurb: string;
}

export function LevelPicker(props: {
  levels: LevelInfo[];
  level: number;
  onPick: (level: number) => void;
  stamps: number;
  teacher: boolean;
  icon: StampIcon;
  /** Name of each level's stamp, for the "how to open" line. */
  stampNames: string[];
}) {
  return (
    <div class="stack" style={{ gap: 6 }}>
    <p class="step-head">
      <StepNo n={1} /> Choose a level
    </p>
    <div class="level-picker" role="group" aria-label="Choose a level">
      {props.levels.map((l, i) => {
        const n = i + 1;
        const open = props.teacher || levelUnlocked(props.stamps, n);
        const earned = (props.stamps & levelFlag(n)) !== 0;
        return (
          <button
            key={n}
            type="button"
            class={`level-tile ${props.level === n ? 'on' : ''}`}
            aria-pressed={props.level === n}
            disabled={!open}
            onClick={() => props.onPick(n)}
          >
            <Stamp icon={props.icon} level={n} earned={earned} size={40} />
            <span>
              <strong>Level {n}: {l.title}</strong>
              <span class="small" style={{ display: 'block' }}>
                {open ? l.blurb : `Locked. Earn the ${props.stampNames[i - 1]} stamp in Level ${n - 1} to open it.`}
              </span>
            </span>
          </button>
        );
      })}
    </div>
    </div>
  );
}
