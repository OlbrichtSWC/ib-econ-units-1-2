/**
 * Market Shock Simulator (2.1 to 2.3): a prediction card game in Riverton's coffee bean market.
 * Draw an event card, predict which curve shifts and which way, drag the curve,
 * then watch the shortage or surplus at the old price push the market to a new equilibrium.
 * Trap mode deals cards where the answer is a movement along a curve, not a shift.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { equilibrium, Line, Pt, quantityAt, round } from '../../econ/calc';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, HlBadge, LiveRegion, MarkIcon } from '../../shared/design/components';
import { Arrow, Curve, Diagram, Dot, Guide, Handle, Label, Tone } from '../../shared/diagrams/Diagram';
import type { TryProps } from '../../shared/activity/types';
import {
  Answer, BASE_D, BASE_S, buildDeck, checkPrediction, dragDirection, gapAtPrice, HANDLE_P, marketOutcome, Mechanism,
  outcomeWords, parseShift, PredictionResult, priceStep, segment, Shift, shiftedMarket, SHIFT_SIZE, Side, snapDrag, X_MAX, Y_MAX,
} from './model';

interface Option { id: Answer; text: string }
interface ShiftCard {
  id: string; determinant: string; title: string; text: string; market?: string; answer: Shift; explain: string;
  mechanism: { sentence: string; answer: Mechanism };
}
interface TrapCard {
  id: string; determinant: string; title: string; text: string; focus: Side; question: string; answer: 'none';
  move: { along: Side; price?: number; cause?: Shift }; explain: string;
}
type Card = ShiftCard | TrapCard;
interface TryContent {
  intro: string;
  marketName: string;
  options: Option[];
  focusOptions: Record<Side, Option[]>;
  feedback: Record<PredictionResult, string>;
  mechanismInfo: Record<Mechanism, string>;
  hlQuestion: { prompt: string; options: { text: string; correct?: boolean; feedback: string }[] };
  cards: ShiftCard[];
  traps: TrapCard[];
}

type Phase = 'predict' | 'drag' | 'gap' | 'adjust' | 'settled' | 'trap-done';

const isTrap = (c: Card): c is TrapCard => c.answer === 'none';
const TONE_OF: Record<Side, Tone> = { demand: 'navy', supply: 'green' };
const money = (p: number) => `$${round(p, 2).toFixed(2)}`;
const bags = (q: number) => `${round(q, 1)} bags`;
const seg = (l: Line) => segment(l) as Pt[];

/** Learn it: demand shifts right from D₁ to D₂, with both equilibria marked. */
function LearnDiagram() {
  const d2 = shiftedMarket('demand', SHIFT_SIZE).demand;
  const e1 = equilibrium(BASE_D, BASE_S);
  const e2 = equilibrium(d2, BASE_S);
  return (
    <Diagram xMax={X_MAX} yMax={Y_MAX} xLabel="Quantity" yLabel="Price ($)" title="Demand and supply diagram: demand shifts right from D₁ to D₂, so price and quantity rise">
      <Guide at={e1} xText="Q₁" yText="P₁" />
      <Guide at={e2} xText="Q₂" yText="P₂" />
      <Curve points={seg(BASE_S)} label="S" tone="green" />
      <Curve points={seg(BASE_D)} label="D₁" tone="navy" ghost />
      <Curve points={seg(d2)} label="D₂" tone="navy" />
      <Arrow from={{ q: 76, p: 2.4 }} to={{ q: 94, p: 2.4 }} tone="red" />
      <Dot at={e1} />
      <Dot at={e2} tone="red" />
    </Diagram>
  );
}

function Try({ content, onComplete }: TryProps) {
  const data = content.try as unknown as TryContent;
  const byId = useMemo(() => {
    const m = new Map<string, Card>();
    [...data.cards, ...data.traps].forEach((c) => m.set(c.id, c));
    return m;
  }, [data]);

  const [trapMode, setTrapMode] = useState(false);
  const [seed, setSeed] = useState(0);
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>('predict');
  const [prediction, setPrediction] = useState<Answer | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [dq, setDq] = useState(0);
  const dqRef = useRef(0);
  const [dragMsg, setDragMsg] = useState<string | null>(null);
  const [animP, setAnimP] = useState<number | null>(null);
  const [mech, setMech] = useState<Mechanism | null>(null);
  const [played, setPlayed] = useState(0);
  const [correct, setCorrect] = useState(0);
  const completed = useRef(false);
  const [hlPick, setHlPick] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');

  const deck = useMemo(() => buildDeck(data.cards.map((c) => c.id), data.traps.map((c) => c.id), trapMode, seed), [data, trapMode, seed]);
  const card = byId.get(deck[pos % deck.length])!;
  const trap = isTrap(card);
  const move = isTrap(card) ? card.move : null;

  // The curve that shifts on this card (for a trap card with a cause, the other curve).
  const mover: Shift | null = trap ? card.move.cause ?? null : card.answer;
  const moverSide = mover ? parseShift(mover).side : null;
  const shownDq = phase === 'drag' ? dq : phase === 'predict' ? 0 : mover ? (parseShift(mover).dir === 'right' ? SHIFT_SIZE : -SHIFT_SIZE) : 0;
  const market = moverSide && (!trap || phase === 'trap-done') ? shiftedMarket(moverSide, shownDq) : { demand: BASE_D, supply: BASE_S };
  const out = marketOutcome(BASE_D, BASE_S, market.demand, market.supply);
  const e1 = out.e1;

  const finishCard = (wasRight: boolean) => {
    setPlayed((n) => {
      const next = n + 1;
      if (next >= 5 && !completed.current) {
        completed.current = true;
        onComplete();
      }
      return next;
    });
    if (wasRight) setCorrect((n) => n + 1);
  };

  const resetCard = () => {
    setPhase('predict');
    setPrediction(null);
    setResult(null);
    setDq(0);
    dqRef.current = 0;
    setDragMsg(null);
    setAnimP(null);
    setMech(null);
  };

  const nextCard = () => {
    resetCard();
    if (pos + 1 >= deck.length) {
      setSeed((s) => s + 1);
      setPos(0);
    } else setPos(pos + 1);
    setAnnounce('New event card drawn.');
  };

  const toggleTrap = () => {
    setTrapMode(!trapMode);
    setPos(0);
    resetCard();
    setAnnounce(!trapMode ? 'Trap mode on. Watch out for movements along a curve.' : 'Trap mode off.');
  };

  const submitPrediction = () => {
    if (!prediction) return;
    const r = checkPrediction(prediction, card.answer);
    setResult(r);
    const right = r === 'right';
    if (trap) {
      setPhase('trap-done');
      finishCard(right);
    } else {
      setPhase('drag');
      if (right) setCorrect((n) => n + 1);
    }
    setAnnounce(right ? 'Your prediction was right.' : 'Not quite. Read the explanation, then carry on.');
  };

  // ----- Dragging the curve -----
  const side = moverSide ?? 'demand';
  const baseLine = side === 'demand' ? BASE_D : BASE_S;
  const handleQ0 = quantityAt(baseLine, HANDLE_P);
  const correctDir = mover ? parseShift(mover).dir : 'right';
  const curveName = side === 'demand' ? 'demand curve' : 'supply curve';

  const acceptShift = () => {
    const final = correctDir === 'right' ? SHIFT_SIZE : -SHIFT_SIZE;
    dqRef.current = final;
    setDq(final);
    setDragMsg(null);
    setPhase('gap');
    const after = shiftedMarket(side, final);
    const gap = gapAtPrice(after.demand, after.supply, e1.p);
    setAnnounce(`The ${curveName} shifted ${correctDir}. At the old price of ${money(e1.p)} there is a ${gap.kind} of ${bags(gap.size)}.`);
  };

  const onRelease = () => {
    const dir = dragDirection(dqRef.current);
    if (!dir) return;
    if (dir === correctDir) acceptShift();
    else {
      const who = side === 'demand' ? 'buyers want to buy' : 'firms want to sell';
      setDragMsg(
        `You dragged the ${curveName} to the ${dir}. A shift ${dir} means ${who} ${dir === 'left' ? 'less' : 'more'} at every price. On this card, ${who} ${dir === 'left' ? 'more' : 'less'}. Try dragging it the other way.`,
      );
      dqRef.current = 0;
      setDq(0);
      setAnnounce('That is the other direction. Read the hint and try again.');
    }
  };

  // ----- Price adjusting from the old price to the new equilibrium -----
  useEffect(() => {
    if (phase !== 'adjust') return;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setAnimP(out.e2.p);
      setPhase('settled');
      return;
    }
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1600;
      setAnimP(priceStep(out.e1.p, out.e2.p, t));
      if (t < 1) raf = requestAnimationFrame(frame);
      else setPhase('settled');
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase === 'settled' && !trap) setAnnounce(`New equilibrium. ${outcomeWords(out)}`);
  }, [phase]);

  const answerMech = (m: Mechanism) => {
    if (mech || trap) return;
    setMech(m);
    finishCard(false);
    setAnnounce(m === card.mechanism.answer ? 'Right function.' : `Not quite. This sentence describes ${card.mechanism.answer}.`);
  };

  // ----- What the diagram shows -----
  const dTone = TONE_OF.demand, sTone = TONE_OF.supply;
  const shifted = shownDq !== 0;
  const moverIsD = moverSide === 'demand';
  const dLabel = shifted && moverIsD ? 'D₂' : shifted ? 'D' : 'D₁';
  const sLabel = shifted && !moverIsD ? 'S₂' : shifted ? 'S' : 'S₁';
  const gapPrice = phase === 'gap' ? e1.p : phase === 'adjust' && animP !== null ? animP : null;
  const gap = gapPrice !== null ? gapAtPrice(market.demand, market.supply, gapPrice) : null;
  const showNew = phase === 'settled' || (phase === 'trap-done' && !!mover);
  const trapPoint: Pt | null =
    trap && phase === 'trap-done'
      ? card.move.price !== undefined
        ? { q: quantityAt(card.move.along === 'demand' ? BASE_D : BASE_S, card.move.price), p: card.move.price }
        : out.e2
      : null;
  const arrowP = 2.4;
  const arrowFrom: Pt = { q: quantityAt(moverIsD ? BASE_D : BASE_S, arrowP), p: arrowP };

  const description = (() => {
    let s = `Demand and supply for coffee beans. Old equilibrium at ${money(e1.p)} and ${bags(e1.q)}.`;
    if (phase === 'drag' && dq) s += ` The ${curveName} is moved ${Math.abs(dq)} bags to the ${dq > 0 ? 'right' : 'left'}.`;
    if (gap && gapPrice !== null) s += ` At ${money(gapPrice)}, quantity demanded is ${bags(gap.qd)} and quantity supplied is ${bags(gap.qs)}: a ${gap.kind} of ${bags(gap.size)}.`;
    if (showNew) s += ` New equilibrium at ${money(out.e2.p)} and ${bags(out.e2.q)}.`;
    if (trapPoint && move!.price !== undefined) s += ` Movement along the ${move!.along} curve to ${money(trapPoint.p)} and ${bags(trapPoint.q)}.`;
    return s;
  })();

  const options = trap ? data.focusOptions[card.focus] : data.options;
  const pickedRight = result === 'right';

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <div class="row">
        <button class="btn btn-secondary btn-sm" aria-pressed={trapMode} onClick={toggleTrap}>
          Trap mode: {trapMode ? 'on' : 'off'}
        </button>
        <span class="small muted">Trap mode mixes in cards where nothing shifts: only a movement along a curve.</span>
      </div>
      <div class="play">
        <div class="stack">
          <Diagram
            xMax={X_MAX}
            yMax={Y_MAX}
            xLabel="Quantity (bags)"
            yLabel="Price ($)"
            title={data.marketName}
            description={description}
            yTicks={[0, 2, 4, 6, 8, 10]}
            formatY={(v) => `${v}`}
          >
            {/* Old equilibrium guides */}
            <Guide at={e1} xText="Q₁" yText="P₁" />
            {showNew && <Guide at={out.e2} xText="Q₂" yText="P₂" tone="red" />}
            {trapPoint && move!.price !== undefined && <Guide at={trapPoint} xText="Q₂" yText="P₂" tone="red" />}

            {/* Ghost of the curve that moved */}
            {shifted && moverIsD && <Curve points={seg(BASE_D)} label="D₁" tone={dTone} ghost />}
            {shifted && !moverIsD && <Curve points={seg(BASE_S)} label="S₁" tone={sTone} ghost />}
            <Curve points={seg(market.supply)} label={sLabel} tone={sTone} />
            <Curve points={seg(market.demand)} label={dLabel} tone={dTone} />

            {/* Shift arrow */}
            {shifted && phase !== 'drag' && (
              <Arrow from={arrowFrom} to={{ q: arrowFrom.q + shownDq, p: arrowP }} tone="red" />
            )}

            {/* Shortage or surplus at the old price, then as the price moves */}
            {gap && gapPrice !== null && gap.kind !== 'none' && (
              <>
                <Curve points={[{ q: gap.qs, p: gapPrice }, { q: gap.qd, p: gapPrice }]} tone="red" width={6} />
                <Label
                  at={{ q: (gap.qs + gap.qd) / 2, p: gapPrice }}
                  dy={-16}
                  anchor="middle"
                  bold
                  tone="red"
                  text={`${gap.kind === 'shortage' ? 'Shortage' : 'Surplus'}: ${round(gap.size, 0)}`}
                />
                <Label at={{ q: gap.qd, p: gapPrice }} dy={20} anchor="middle" size={13} text="Qd" />
                <Label at={{ q: gap.qs, p: gapPrice }} dy={20} anchor="middle" size={13} text="Qs" />
              </>
            )}

            {/* Movement along a curve (trap cards) */}
            {trapPoint && <Arrow from={e1} to={trapPoint} tone="red" width={4} />}
            {trapPoint && (
              <Label
                at={trapPoint}
                dx={move!.along === 'demand' ? -12 : 12}
                anchor={move!.along === 'demand' ? 'end' : 'start'}
                dy={trapPoint.p > e1.p ? -16 : 22}
                bold
                tone="red"
                size={13}
                text={`movement along ${move!.along === 'demand' ? dLabel : sLabel}`}
              />
            )}

            <Dot at={e1} hollow={showNew || !!trapPoint} />
            {showNew && <Dot at={out.e2} tone="red" />}
            {trapPoint && move!.price !== undefined && <Dot at={trapPoint} tone="red" />}

            {phase === 'drag' && (
              <Handle
                at={{ q: handleQ0 + dq, p: HANDLE_P }}
                look="ring"
                axis="q"
                tone={side === 'demand' ? 'navy' : 'green'}
                step={{ q: 2, p: 0 }}
                label={`Drag the ${curveName} left or right`}
                valueText={dq === 0 ? 'Not moved yet' : `Moved ${Math.abs(dq)} bags to the ${dq > 0 ? 'right' : 'left'}`}
                onMove={(pt) => {
                  const v = snapDrag(pt.q - handleQ0);
                  dqRef.current = v;
                  setDq(v);
                  if (v !== 0) setDragMsg(null);
                }}
                onRelease={onRelease}
              />
            )}
          </Diagram>
          {phase === 'drag' && (
            <div class="callout stack">
              <p>
                <strong>Now drag the {curveName}.</strong> Grab the ring on the {side === 'demand' ? 'D₁' : 'S₁'} line and drag it left or right. With a keyboard, press Tab to reach the ring, then use the arrow keys.
              </p>
              {dragMsg && (
                <p role="status" style={{ display: 'flex', gap: 6 }}>
                  <CrossIcon /> <span>{dragMsg}</span>
                </p>
              )}
              {dragMsg && (
                <div><button class="btn btn-secondary btn-sm" onClick={acceptShift}>Show me the shift</button></div>
              )}
            </div>
          )}

          <div class="legend" aria-hidden="true">
            <span><span class="swatch" style={{ background: '#1B3A6B' }} />D: demand</span>
            <span><span class="swatch" style={{ background: '#1e6b3a' }} />S: supply</span>
            <span><span class="swatch" style={{ background: '#1B3A6B', opacity: 0.45 }} />faded: old curve</span>
            <span><span class="swatch" style={{ background: '#C8102E' }} />red bar: shortage or surplus</span>
          </div>

          <div class="panel stack">
            <h3>Market report</h3>
            <div class="stat"><span>Old equilibrium (P₁, Q₁)</span><b>{money(e1.p)}, {bags(e1.q)}</b></div>
            {showNew && (
              <>
                <div class="stat"><span>New equilibrium (P₂, Q₂)</span><b>{money(out.e2.p)}, {bags(out.e2.q)}</b></div>
                <div class="stat"><span>Price</span><b>{out.price === 'rises' ? 'Up' : out.price === 'falls' ? 'Down' : 'Same'} ({out.price})</b></div>
                <div class="stat"><span>Quantity</span><b>{out.quantity === 'rises' ? 'Up' : out.quantity === 'falls' ? 'Down' : 'Same'} ({out.quantity})</b></div>
              </>
            )}
            {trapPoint && move!.price !== undefined && (
              <div class="stat">
                <span>{move!.along === 'demand' ? 'Quantity demanded' : 'Quantity supplied'} at {money(trapPoint.p)}</span>
                <b>{bags(trapPoint.q)}</b>
              </div>
            )}
            <div class="stat"><span>Cards played this session</span><b>{played}</b></div>
            <div class="stat"><span>Predictions right (only you see this)</span><b>{correct}</b></div>
            {played < 5 && <p class="small muted">Play {5 - played} more {5 - played === 1 ? 'card' : 'cards'} to finish this step.</p>}
          </div>
        </div>

        <section class="event-card stack" aria-labelledby="ms-card-h">
          <p class="small muted" style={{ margin: 0 }}>
            Event card {(pos % deck.length) + 1} of {deck.length}{trapMode ? ' (trap mode)' : ''}
          </p>
          <h3 id="ms-card-h">{card.title}</h3>
          {!trap && card.market && <Md text={card.market} />}
          <Md text={card.text} />
          <p><strong>Predict first:</strong> {trap ? <Md inline text={card.question} /> : 'which curve shifts, and which way?'}</p>
          <div class="choice-grid" role="group" aria-label="Your prediction">
            {options.map((o) => (
              <button key={o.id} type="button" class="choice-btn" aria-pressed={prediction === o.id} disabled={phase !== 'predict'} onClick={() => setPrediction(o.id)}>
                {o.text}
              </button>
            ))}
          </div>
          {phase === 'predict' ? (
            <div>
              <button class="btn" disabled={!prediction} onClick={submitPrediction}>Lock in my prediction</button>
            </div>
          ) : (
            <div class={`callout ${pickedRight ? 'callout-ok' : 'callout-try'}`} role="status">
              <p style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                {pickedRight ? <MarkIcon /> : <CrossIcon />}
                {pickedRight ? data.feedback.right : 'Not quite, and that is how we learn.'}
              </p>
              {!pickedRight && result && <Md text={data.feedback[result]} />}
              <p class="small"><strong>{card.determinant}</strong></p>
              <Md text={card.explain} />
            </div>
          )}

          {phase === 'drag' && <p class="callout"><strong>Now drag the {curveName}</strong> on the diagram.</p>}

          {phase === 'gap' && gap && (
            <div class="callout callout-red stack">
              <p>
                <strong>At the old price P₁ = {money(e1.p)}</strong>, quantity demanded is {bags(gap.qd)} but quantity supplied is {bags(gap.qs)}.
                There is {gap.kind === 'shortage' ? 'a shortage (excess demand)' : 'a surplus (excess supply)'} of {bags(gap.size)}.
              </p>
              <p>
                {gap.kind === 'shortage'
                  ? 'Buyers compete for the scarce bags, so the price is pushed up.'
                  : 'Roasters cannot sell all their bags, so they cut the price.'}
              </p>
              <div><button class="btn" onClick={() => setPhase('adjust')}>Let the price adjust</button></div>
            </div>
          )}

          {phase === 'adjust' && <p class="small muted">The price is moving towards the new equilibrium...</p>}

          {phase === 'settled' && !trap && (
            <div class="stack">
              <div class="callout callout-ok">
                <p><strong>New equilibrium.</strong> {outcomeWords(out)}</p>
                <p class="small">
                  Price {money(out.e1.p)} to {money(out.e2.p)}. Quantity {bags(out.e1.q)} to {bags(out.e2.q)}.
                </p>
              </div>
              <p><strong>Price mechanism:</strong> which function does this sentence describe?</p>
              <blockquote style={{ margin: 0, paddingLeft: 12, borderLeft: '4px solid var(--line)' }}>{card.mechanism.sentence}</blockquote>
              <div class="choice-grid" role="group" aria-label="Function of the price mechanism">
                {(['signalling', 'incentive', 'rationing'] as Mechanism[]).map((m) => (
                  <button key={m} type="button" class="choice-btn" aria-pressed={mech === m} disabled={!!mech} onClick={() => answerMech(m)}>
                    {m[0].toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              {mech && (
                <div class={`callout ${mech === card.mechanism.answer ? 'callout-ok' : 'callout-try'}`} role="status">
                  <p style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                    {mech === card.mechanism.answer ? <MarkIcon /> : <CrossIcon />}
                    {mech === card.mechanism.answer ? 'Yes, well spotted.' : `Not quite. This sentence describes ${card.mechanism.answer}.`}
                  </p>
                  <Md text={data.mechanismInfo[card.mechanism.answer]} />
                  {mech !== card.mechanism.answer && <Md text={data.mechanismInfo[mech]} />}
                </div>
              )}
            </div>
          )}

          {((phase === 'settled' && mech) || phase === 'trap-done') && (
            <div><button class="btn" onClick={nextCard}>Draw the next card</button></div>
          )}
        </section>
      </div>

      <section class="panel stack" aria-labelledby="ms-hl-h">
        <h3 id="ms-hl-h" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <HlBadge /> Why does demand slope down?
        </h3>
        <Md text={data.hlQuestion.prompt} />
        <div class="choice-grid" role="group" aria-label="HL challenge answer">
          {data.hlQuestion.options.map((o, i) => (
            <button key={i} type="button" class="choice-btn" aria-pressed={hlPick === i} onClick={() => setHlPick(i)}>
              {o.text}
            </button>
          ))}
        </div>
        {hlPick !== null && (
          <div class={`callout ${data.hlQuestion.options[hlPick].correct ? 'callout-ok' : 'callout-try'}`} role="status">
            <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              {data.hlQuestion.options[hlPick].correct ? <MarkIcon /> : <CrossIcon />}
              <span>{data.hlQuestion.options[hlPick].feedback}{!data.hlQuestion.options[hlPick].correct && ' Try another answer.'}</span>
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export { Try, LearnDiagram };
