/**
 * The "new stamp" celebration: a big pop-up with the stamp thumping down, confetti,
 * the student's stamp count and their economist title. It waits for the student to close it.
 * Screen readers get a dialog with the same words. Reduced motion: no animation.
 */
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { Stamp, StampIcon } from './Stamp';
import { nextTitle, titleFor } from './titles';

const CONFETTI_COLOURS = ['#1D4ED8', '#C8102E', '#FFD23F', '#FFFFFF', '#5B8DEF'];

export function StampCeremony(props: {
  name: string;
  icon: StampIcon;
  level?: number;
  activity: string;
  /** Stamps the student has now, including this one, and the most on offer. */
  earned: number;
  total: number;
  /** Stamps the student had before this one (for "new title"). */
  before: number;
  /** "2 of 3" when several stamps arrive together. */
  queue?: { at: number; of: number };
  bookHref: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    }
  }, []);
  const title = titleFor(props.earned);
  const newTitle = titleFor(props.before).name !== title.name;
  const next = nextTitle(props.earned);
  const tier = props.level === 3 ? 'Level 3 stamp: the top level!' : props.level === 2 ? 'Level 2 stamp' : null;
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 9) * 0.12,
        dur: 1.6 + ((i * 7) % 10) / 10,
        colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
        turn: (i % 2 ? 1 : -1) * (180 + ((i * 53) % 360)),
      })),
    [props.name, props.activity],
  );
  const more = props.queue && props.queue.at < props.queue.of;
  return (
    <dialog ref={ref} class="ceremony" aria-labelledby="ceremony-title" aria-describedby="ceremony-desc" onClose={props.onClose}>
      <div class="ceremony-top">
        <div class="ceremony-rays" aria-hidden="true" />
        <div class="ceremony-confetti" aria-hidden="true">
          {pieces.map((p, i) => (
            <i key={i} style={{ left: `${p.left}%`, background: p.colour, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, ['--turn' as string]: `${p.turn}deg` }} />
          ))}
        </div>
        <p class="ceremony-ribbon">{props.queue && props.queue.of > 1 ? `New stamp ${props.queue.at} of ${props.queue.of}!` : 'New stamp!'}</p>
        <div class="ceremony-stamp">
          <Stamp icon={props.icon} level={props.level} earned size={150} animate />
        </div>
      </div>
      <div class="ceremony-body">
        <h2 id="ceremony-title">{props.name}</h2>
        <p id="ceremony-desc" class="ceremony-sub">
          {props.activity}
          {tier && <span class="ceremony-tier">{tier}</span>}
        </p>
        <div class="ceremony-count">
          <p>
            <strong>{props.earned}</strong> of {props.total} stamps collected
          </p>
          <div class="ceremony-bar" aria-hidden="true">
            <span style={{ width: `${props.total ? Math.max(2, Math.round((props.earned / props.total) * 100)) : 0}%` }} />
          </div>
          {newTitle ? (
            <p class="ceremony-title-up">
              <span aria-hidden="true">{title.icon}</span> New title: <strong>{title.name}</strong>
            </p>
          ) : (
            <p class="small">
              Your title: <strong>{title.name}</strong>
              {next ? `. ${next.at - props.earned} more ${next.at - props.earned === 1 ? 'stamp' : 'stamps'} to ${next.name}.` : '.'}
            </p>
          )}
        </div>
        <div class="row" style={{ justifyContent: 'center' }}>
          <button class="btn" autofocus onClick={() => ref.current?.close()}>
            {more ? 'Next stamp' : 'Keep playing'}
          </button>
          <a class="btn btn-secondary" href={props.bookHref} onClick={() => ref.current?.close()}>
            Open my stamp book
          </a>
        </div>
      </div>
    </dialog>
  );
}
