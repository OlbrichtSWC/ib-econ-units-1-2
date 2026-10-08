/**
 * Market Shock, Level 3: double shocks. Two events hit Riverton's coffee market at once, one for
 * demand and one for supply. The student predicts both shifts, then what happens to equilibrium
 * price and quantity. With two shifts, one of them cannot be told without knowing the sizes,
 * so "cannot tell" is often the right answer. The diagram then shows one example, and the
 * student can swap the sizes to see the other case.
 */
import { useMemo, useState } from 'preact/hooks';
import { equilibrium, round } from '../../econ/calc';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon } from '../../shared/design/components';
import { Curve, Diagram, Dot, Guide } from '../../shared/diagrams/Diagram';
import type { TryProps } from '../../shared/activity/types';
import { celebrate } from '../../shared/fun/celebrate';
import { play } from '../../shared/fun/sound';
import { BASE_D, BASE_S, buildPairs, Dir, doubleMarket, DoubleChange, doubleOutcome, parseShift, segment, Shift, X_MAX, Y_MAX } from './model';

interface ShiftCard { id: string; determinant: string; title: string; text: string; market?: string; answer: Shift; explain: string }

export const DOUBLE_ROUND = 6;
export const DOUBLE_GOAL = 4;

const money = (p: number) => `$${round(p, 2).toFixed(2)}`;
const bags = (q: number) => `${round(q, 1)} bags`;
const word = (c: DoubleChange) => (c === 'cannot tell' ? 'cannot be told without the sizes' : c);

export function DoubleShock({ content, onGoal, onComplete }: TryProps) {
  const cards = (content.try as unknown as { cards: ShiftCard[] }).cards.filter((c) => !c.market);
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const dIds = cards.filter((c) => c.answer[0] === 'D').map((c) => c.id);
  const sIds = cards.filter((c) => c.answer[0] === 'S').map((c) => c.id);
  const [seed, setSeed] = useState(0);
  const pairs = useMemo(() => buildPairs(dIds, sIds, seed), [seed, dIds.join(), sIds.join()]);
  const [pos, setPos] = useState(0);
  const [dPred, setDPred] = useState<Dir | null>(null);
  const [sPred, setSPred] = useState<Dir | null>(null);
  const [pPred, setPPred] = useState<DoubleChange | null>(null);
  const [qPred, setQPred] = useState<DoubleChange | null>(null);
  const [locked, setLocked] = useState(false);
  /** Which example the diagram shows: demand shifting more, or supply shifting more. */
  const [bigger, setBigger] = useState<'demand' | 'supply'>('demand');
  const [results, setResults] = useState<boolean[]>([]);
  const [announce, setAnnounce] = useState('');

  const [dId, sId] = pairs[pos % pairs.length];
  const dCard = byId.get(dId)!;
  const sCard = byId.get(sId)!;
  const dDir = parseShift(dCard.answer).dir;
  const sDir = parseShift(sCard.answer).dir;
  const theory = doubleOutcome(dDir, sDir);
  const allRight = dPred === dDir && sPred === sDir && pPred === theory.price && qPred === theory.quantity;
  const roundDone = results.length >= DOUBLE_ROUND;
  const roundRight = results.filter(Boolean).length;

  // Example sizes: the bigger shift is 28 bags, the smaller 12.
  const dSize = bigger === 'demand' ? 28 : 12;
  const sSize = bigger === 'demand' ? 12 : 28;
  const dq = locked ? (dDir === 'right' ? dSize : -dSize) : 0;
  const sq = locked ? (sDir === 'right' ? sSize : -sSize) : 0;
  const m = doubleMarket(dq, sq);
  const e1 = equilibrium(BASE_D, BASE_S);
  const e2 = equilibrium(m.demand, m.supply);

  const lockIn = () => {
    setLocked(true);
    const next = [...results, allRight];
    setResults(next);
    play(allRight ? 'correct' : 'wrong');
    setAnnounce(allRight ? 'All four predictions right.' : 'Not quite. Read the explanation.');
    if (next.length === 2) onComplete();
    if (next.length === DOUBLE_ROUND && next.filter(Boolean).length >= DOUBLE_GOAL) {
      setTimeout(() => {
        play('win');
        celebrate({ size: 'big' });
        onGoal(3);
      }, 400);
    }
  };

  const nextCard = () => {
    if (roundDone) {
      setResults([]);
      setSeed((x) => x + 1);
      setPos(0);
    } else setPos(pos + 1);
    setDPred(null);
    setSPred(null);
    setPPred(null);
    setQPred(null);
    setLocked(false);
    setBigger('demand');
    play('tap');
    setAnnounce('Two new events.');
  };

  const pick = <T,>(label: string, value: T | null, set: (v: T) => void, opts: { v: T; text: string }[], answer: T) => (
    <div class="stack" style={{ gap: 4 }}>
      <p style={{ margin: 0 }}><strong>{label}</strong></p>
      <div class="choice-grid" role="group" aria-label={label}>
        {opts.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            class={`choice-btn ${locked && o.v === answer ? 'choice-right' : ''}`}
            aria-pressed={value === o.v}
            disabled={locked}
            onClick={() => {
              play('tap');
              set(o.v);
            }}
          >
            {o.text}
            {locked && o.v === answer && <span class="sr-only"> (right answer)</span>}
          </button>
        ))}
      </div>
    </div>
  );
  const dirs = [{ v: 'left' as Dir, text: 'Shifts left' }, { v: 'right' as Dir, text: 'Shifts right' }];
  const changes = [
    { v: 'rises' as DoubleChange, text: 'Rises' },
    { v: 'falls' as DoubleChange, text: 'Falls' },
    { v: 'cannot tell' as DoubleChange, text: 'Cannot tell' },
  ];

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <div class="play play-card-first">
        <div class="stack">
          <Diagram
            xMax={X_MAX}
            yMax={Y_MAX}
            xLabel="Quantity (bags)"
            yLabel="Price ($)"
            title="Riverton coffee beans: two shifts at once"
            description={
              locked
                ? `Demand shifts ${dDir} ${dSize} bags and supply shifts ${sDir} ${sSize} bags. Equilibrium moves from ${money(e1.p)} and ${bags(e1.q)} to ${money(e2.p)} and ${bags(e2.q)}.`
                : `Demand and supply cross at ${money(e1.p)} and ${bags(e1.q)}.`
            }
            yTicks={[0, 2, 4, 6, 8, 10]}
            formatY={(v) => `${v}`}
          >
            <Guide at={e1} xText="Q₁" yText="P₁" />
            {locked && <Guide at={e2} xText="Q₂" yText="P₂" tone="red" />}
            {locked && <Curve points={segment(BASE_D) as never} label="D₁" tone="navy" ghost />}
            {locked && <Curve points={segment(BASE_S) as never} label="S₁" tone="green" ghost />}
            <Curve points={segment(m.supply) as never} label={locked ? 'S₂' : 'S₁'} tone="green" />
            <Curve points={segment(m.demand) as never} label={locked ? 'D₂' : 'D₁'} tone="navy" />
            <Dot at={e1} hollow={locked} />
            {locked && <Dot at={e2} tone="red" />}
          </Diagram>
          {locked && (
            <div class="panel stack">
              <h3>Market report: one example</h3>
              <div class="stat"><span>Demand shift</span><b>{dDir} by {dSize} bags</b></div>
              <div class="stat"><span>Supply shift</span><b>{sDir} by {sSize} bags</b></div>
              <div class="stat"><span>Price</span><b>{money(e1.p)} to {money(e2.p)}</b></div>
              <div class="stat"><span>Quantity</span><b>{bags(e1.q)} to {bags(e2.q)}</b></div>
              <div>
                <button class="btn btn-secondary btn-sm" onClick={() => setBigger(bigger === 'demand' ? 'supply' : 'demand')}>
                  Make the {bigger === 'demand' ? 'supply' : 'demand'} shift the bigger one
                </button>
              </div>
              <p class="small muted" style={{ margin: 0 }}>
                Swap the sizes and watch which result changes. The one that changes is the one you cannot tell from the events alone.
              </p>
            </div>
          )}
        </div>

        <section key={`${seed}-${pos}`} class="event-card stack card-deal" aria-labelledby="ds-h">
          <div class="row" style={{ justifyContent: 'space-between', gap: 8 }}>
            <p class="small muted" style={{ margin: 0 }}>
              Level 3: card {Math.min(results.length + (locked ? 0 : 1), DOUBLE_ROUND)} of {DOUBLE_ROUND}
            </p>
            <ol class="round-track" aria-label={`This round: ${roundRight} right out of ${results.length} played`}>
              {Array.from({ length: DOUBLE_ROUND }, (_, i) => (
                <li key={i} class={`round-slot ${i < results.length ? (results[i] ? 'right' : 'miss') : i === results.length ? 'now' : ''}`} aria-hidden="true">
                  {i < results.length ? (results[i] ? <MarkIcon size={14} /> : '•') : i + 1}
                </li>
              ))}
            </ol>
          </div>
          <h3 id="ds-h">Double shock</h3>
          <div class="double-events">
            <div class="callout">
              <p style={{ margin: 0 }}><strong>Event 1: {dCard.title}</strong></p>
              <Md text={dCard.text} />
            </div>
            <div class="callout">
              <p style={{ margin: 0 }}><strong>Event 2: {sCard.title}</strong></p>
              <Md text={sCard.text} />
            </div>
          </div>
          <p style={{ margin: 0 }}>Both happen in the same week. <strong>Predict first.</strong></p>
          {pick('What happens to demand?', dPred, setDPred, dirs, dDir)}
          {pick('What happens to supply?', sPred, setSPred, dirs, sDir)}
          {pick('Equilibrium price', pPred, setPPred, changes, theory.price)}
          {pick('Equilibrium quantity', qPred, setQPred, changes, theory.quantity)}
          {!locked ? (
            <div>
              <button class="btn" disabled={!dPred || !sPred || !pPred || !qPred} onClick={lockIn}>
                Lock in my predictions
              </button>
            </div>
          ) : (
            <div class={`callout ${allRight ? 'callout-ok' : 'callout-try'} stack`} role="status">
              <p style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}>
                {allRight ? <MarkIcon /> : <CrossIcon />}
                {allRight ? 'All four right.' : 'Not quite, and that is how we learn.'}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Demand shifts {dDir}.</strong> <Md inline text={dCard.explain} />
              </p>
              <p style={{ margin: 0 }}>
                <strong>Supply shifts {sDir}.</strong> <Md inline text={sCard.explain} />
              </p>
              <p style={{ margin: 0 }}>
                <strong>Together:</strong> equilibrium price {word(theory.price)}, and equilibrium quantity {word(theory.quantity)}.{' '}
                {theory.price === 'cannot tell'
                  ? 'Both shifts push quantity the same way, but they push price in opposite directions. Which wins depends on which shift is bigger.'
                  : 'Both shifts push price the same way, but they push quantity in opposite directions. Which wins depends on which shift is bigger.'}
              </p>
              {roundDone ? (
                <>
                  <h4 style={{ margin: 0 }}>Round complete: {roundRight} of {DOUBLE_ROUND} right</h4>
                  <p style={{ margin: 0 }}>
                    {roundRight >= DOUBLE_GOAL
                      ? 'Expert reading of the market. You earned the Double Shock stamp.'
                      : `Get ${DOUBLE_GOAL} or more right in a round to earn the Double Shock stamp.`}
                  </p>
                  <div><button class="btn" onClick={nextCard}>Start a new round</button></div>
                </>
              ) : (
                <div><button class="btn" onClick={nextCard}>Draw the next pair</button></div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
