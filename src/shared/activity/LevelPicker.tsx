/**
 * Level 1, 2 and 3 of a game. Each level is harder than the one before, and opens when the
 * student earns the stamp for the level before it. Teacher view opens every level.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { StepNo } from '../design/components';
import { ANSWER_EVENT, earnLevel, GO_LEVEL_EVENT, goToLevel, nextStreak, STREAK_GOAL } from './levelEvents';
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
  const latest = useRef(props);
  latest.current = props;
  const box = useRef<HTMLDivElement>(null);
  // Streak fast track: answers right first time in a row, in the level being played.
  const [streak, setStreak] = useState(0);
  const [seen, setSeen] = useState(false);
  const [fast, setFast] = useState(0);
  useEffect(() => {
    setStreak(0);
    setSeen(false);
    setFast(0);
  }, [props.level]);
  useEffect(() => {
    const onAnswer = (e: Event) => {
      const firstTry = !!(e as CustomEvent<{ firstTry: boolean }>).detail?.firstTry;
      const p = latest.current;
      setSeen(true);
      setStreak((s) => {
        const next = nextStreak(s, firstTry);
        if (next === STREAK_GOAL && (p.stamps & levelFlag(p.level)) === 0) {
          setFast(p.level);
          // Award outside this state update.
          setTimeout(() => earnLevel(p.level), 0);
        }
        return next;
      });
    };
    window.addEventListener(ANSWER_EVENT, onAnswer);
    return () => window.removeEventListener(ANSWER_EVENT, onAnswer);
  }, []);
  // "Go to Level 2" on the stamp pop-up: switch level, then bring the level tiles into view.
  useEffect(() => {
    const go = (e: Event) => {
      const n = (e as CustomEvent<{ level: number }>).detail?.level;
      const p = latest.current;
      // The pop-up only offers a level that its stamp has just opened.
      if (!n || n < 1 || n > p.levels.length) return;
      p.onPick(n);
      requestAnimationFrame(() => {
        const tile = box.current?.querySelectorAll<HTMLButtonElement>('.level-tile')[n - 1];
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        box.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        tile?.focus({ preventScroll: true });
      });
    };
    window.addEventListener(GO_LEVEL_EVENT, go);
    return () => window.removeEventListener(GO_LEVEL_EVENT, go);
  }, []);
  return (
    <div class="stack" style={{ gap: 6 }} ref={box}>
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
    {fast === props.level ? (
      <div class="streak-banner" role="status">
        <span aria-hidden="true">🔥</span>
        <span>
          <strong>{STREAK_GOAL} in a row!</strong> You earned the {props.stampNames[props.level - 1]} stamp early.{' '}
          {props.level < props.levels.length ? 'Move up, or keep going for practice.' : 'Try Check it next, or keep going for practice.'}
        </span>
        {props.level < props.levels.length ? (
          <button type="button" class="btn" onClick={() => goToLevel(props.level + 1)}>
            Go to Level {props.level + 1} →
          </button>
        ) : (
          <a class="btn" href={location.hash.replace(/\/try$/, '') + '/check'}>
            Next: Check it →
          </a>
        )}
        <button type="button" class="btn btn-secondary" onClick={() => setFast(0)}>
          Keep going
        </button>
      </div>
    ) : (
      seen &&
      (props.stamps & levelFlag(props.level)) === 0 && (
        <p class="streak-meter small" role="status">
          <span aria-hidden="true">🔥</span> Streak: <strong>{Math.min(streak, STREAK_GOAL)} of {STREAK_GOAL}</strong> right first time in a row.
          {' '}Get {STREAK_GOAL} in a row to earn this level's stamp early.
        </p>
      )
    )}
    </div>
  );
}
