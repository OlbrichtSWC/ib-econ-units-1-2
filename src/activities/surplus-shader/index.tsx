/**
 * Surplus Shader (2.3): a price dial lab at an invented ski hill.
 * Drag the price of a day pass. Consumer surplus, producer surplus and welfare loss
 * shade live, with the shortage or surplus shown as a gap. HL students see the dollar
 * values with IB working and solve "Calculate it" cards before the app reveals the answer.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { equilibrium, priceAt, round, welfareAtPrice } from '../../econ/calc';
import type { Pt } from '../../econ/calc';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, HlBadge, LiveRegion, MarkIcon, StepNo } from '../../shared/design/components';
import { Area, Arrow, Curve, Diagram, Dot, Guide, Handle, HLine, Label } from '../../shared/diagrams/Diagram';
import type { TryProps } from '../../shared/activity/types';
import { parseNumber } from '../../shared/activity/CheckIt';
import { play } from '../../shared/fun/sound';
import { PaintGame } from './PaintGame';
import {
  Ask, checkAnswer, correctValue, DEMAND, Market, MAX_SHIFT, Piece, shiftedMarket, snapPrice, SUPPLY, sumPieces, surplusShapes, working,
} from './model';

const X_MAX = 900;
const Y_MAX = 110;
const START_PRICE = 60;
const BASE: Market = { demand: DEMAND, supply: SUPPLY };

interface Card {
  id: string;
  price: number;
  ask: Ask;
  prompt: string;
}

interface TryContent {
  intro: string;
  lossTarget: number;
  challenges: { id: string; text: string; hl?: boolean }[];
  cards: Card[];
  slips: Record<string, string>;
}

const num = (v: number) => round(v, 2).toLocaleString('en-US', { maximumFractionDigits: 2 });
const money = (v: number) => `$${num(v)}`;
const ASK_NAME: Record<Ask, string> = { cs: 'consumer surplus', ps: 'producer surplus', wl: 'welfare loss' };

/** One line of IB working, for example "½ × 160 × (90 − 74) = $1,280". */
function pieceText(p: Piece, wlBase?: { qe: number; q: number }) {
  const base = wlBase ? `(${num(wlBase.qe)} − ${num(wlBase.q)})` : num(p.base);
  const h = `(${num(p.top)} − ${num(p.bottom)})`;
  return p.kind === 'triangle' ? `½ × ${base} × ${h} = ${money(p.value)}` : `${base} × ${h} = ${money(p.value)}`;
}

function WorkingLines({ pieces, wlBase }: { pieces: Piece[]; wlBase?: { qe: number; q: number } }) {
  if (!pieces.length) return <span class="small muted">No area at this price.</span>;
  const two = pieces.length > 1;
  return (
    <span class="small muted" style={{ display: 'block' }}>
      {pieces.map((p, i) => (
        <span key={i} style={{ display: 'block' }}>
          {two ? (p.kind === 'triangle' ? 'Triangle: ' : 'Rectangle: ') : ''}
          {pieceText(p, wlBase)}
        </span>
      ))}
      {two && <span style={{ display: 'block' }}>Total: {pieces.map((p) => money(p.value)).join(' + ')} = {money(sumPieces(pieces))}</span>}
    </span>
  );
}

function marksWithout(all: number[], avoid: number[], gap: number) {
  return all.filter((t) => avoid.every((a) => Math.abs(a - t) >= gap));
}

/** Learn it: a competitive market with CS and PS shaded and labelled. */
function LearnDiagram() {
  const s = surplusShapes(BASE, 50);
  return (
    <Diagram xMax={X_MAX} yMax={Y_MAX} xLabel="Quantity" yLabel="Price ($)" title="Competitive equilibrium with consumer surplus above the price and producer surplus below it">
      <Area points={s.cs} tone="navy" pattern="hatch" label="CS" />
      <Area points={s.ps} tone="red" pattern="dots" label="PS" />
      <Curve line={DEMAND} label="D = MB" tone="navy" labelOffset={{ dx: -20, dy: -36 }} />
      <Curve line={SUPPLY} label="S = MC" tone="red" labelOffset={{ dx: -60, dy: -10 }} />
      <Guide at={s.eq} xText="Qₑ" yText="Pₑ" />
      <Dot at={s.eq} />
      <Label at={s.eq} text="MB = MC" dx={24} dy={8} bold />
    </Diagram>
  );
}

function Swatch({ kind }: { kind: 'cs' | 'ps' | 'wl' }) {
  const bg =
    kind === 'cs'
      ? 'repeating-linear-gradient(45deg, #c9d6ea 0 4px, #1B3A6B 4px 5.5px)'
      : kind === 'ps'
        ? 'radial-gradient(circle, #C8102E 1.4px, #f4c9d0 1.6px) 0 0 / 7px 7px'
        : 'linear-gradient(#5b6475, #5b6475) 50% 0 / 1.3px 100% no-repeat, linear-gradient(#5b6475, #5b6475) 0 50% / 100% 1.3px no-repeat, #dde1e8';
  return <span class="swatch" aria-hidden="true" style={{ background: bg }} />;
}

function Try(props: TryProps) {
  const [mode, setMode] = useState<'dial' | 'paint'>('dial');
  return (
    <div class="stack">
      <div class="mode-switch" role="group" aria-label="Choose a game">
        <button aria-pressed={mode === 'dial'} onClick={() => setMode('dial')}>Price dial lab</button>
        <button aria-pressed={mode === 'paint'} onClick={() => setMode('paint')}>Paint the surplus</button>
      </div>
      {mode === 'dial' ? <DialLab {...props} /> : <PaintGame onGoal={props.onGoal} stamps={props.stamps} teacher={props.teacher} />}
    </div>
  );
}

function DialLab({ content, onComplete }: TryProps) {
  const data = content.try as unknown as TryContent;
  const [dSteps, setDSteps] = useState(0);
  const [sSteps, setSSteps] = useState(0);
  const [price, setPrice] = useState(START_PRICE);
  const latest = useRef(START_PRICE);
  const diagramBox = useRef<HTMLDivElement>(null);
  // Workaround: the shared Handle sets "tabIndex", which SVG elements ignore. Make it keyboard-focusable.
  useEffect(() => {
    diagramBox.current?.querySelectorAll('g.handle').forEach((g) => g.setAttribute('tabindex', '0'));
  });
  const [done, setDone] = useState<Set<string>>(new Set());
  const [announce, setAnnounce] = useState('');
  const [cardIndex, setCardIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [cardTries, setCardTries] = useState(0);
  const [cardResult, setCardResult] = useState<null | { ok: boolean; text: string }>(null);
  const [cardOpen, setCardOpen] = useState(true); // unsolved: values at the card's price stay hidden

  const market = shiftedMarket(dSteps, sSteps);
  const shifted = dSteps !== 0 || sSteps !== 0;
  const s = surplusShapes(market, price);
  const w = welfareAtPrice(market.demand, market.supply, price);
  const wk = working(market, price);
  const eq = s.eq;
  const atEq = Math.abs(price - eq.p) < 1e-9;
  const gap = s.qd - s.qs; // + shortage, - surplus
  const card = data.cards[cardIndex % data.cards.length];
  const hideValues = cardOpen && !shifted && price === card.price;

  const complete = (id: string) => {
    setDone((d) => {
      if (d.has(id)) return d;
      const n = new Set(d);
      n.add(id);
      play('correct');
      if (n.size === 3) onComplete();
      setAnnounce(`Challenge complete. ${n.size} of ${data.challenges.length} done.`);
      return n;
    });
  };

  /** Checks the dial challenges after a move the student made. */
  const evaluate = (m: Market, p: number, isShifted: boolean) => {
    const ww = welfareAtPrice(m.demand, m.supply, p);
    if (ww.welfareLoss < 1e-6 && !isShifted) complete('max');
    if (ww.welfareLoss < 1e-6 && isShifted) complete('shift');
    if (ww.consumerSurplus > ww.producerSurplus + 1e-6) complete('csBigger');
    if (ww.welfareLoss >= data.lossTarget - 1e-6) complete('loss');
  };

  const settle = useRef<number | undefined>(undefined);
  const movePrice = (p: number) => {
    const np = snapPrice(market, p);
    latest.current = np;
    if (np !== price) setPrice(np);
  };

  /** After a drag or key press: check the challenges and announce the new state. */
  const release = () => {
    const p = latest.current;
    // Check challenges only once the price settles, so stepping past a target with the arrow keys does not count.
    clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      if (latest.current === p) evaluate(market, p, shifted);
    }, 700);
    const sh = surplusShapes(market, p);
    const g = sh.qd - sh.qs;
    setAnnounce(
      Math.abs(p - sh.eq.p) < 1e-9
        ? `Price $${num(p)}. This is the equilibrium. Community surplus is as big as it can be.`
        : `Price $${num(p)}. ${g > 0 ? 'Shortage' : 'Surplus'} of ${num(Math.abs(g))} passes. Quantity traded ${num(sh.q)}.`,
    );
  };

  /** A change from the slider or the − and + buttons. */
  const setFromControl = (p: number) => {
    movePrice(p);
    release();
  };

  const shift = (which: 'd' | 's', by: number) => {
    const nd = which === 'd' ? Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, dSteps + by)) : dSteps;
    const ns = which === 's' ? Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, sSteps + by)) : sSteps;
    const m = shiftedMarket(nd, ns);
    const np = snapPrice(m, price);
    setDSteps(nd);
    setSSteps(ns);
    setPrice(np);
    latest.current = np;
    const e = equilibrium(m.demand, m.supply);
    setAnnounce(`${which === 'd' ? 'Demand' : 'Supply'} shifted. The new equilibrium is ${num(e.q)} passes at $${num(e.p)}.`);
    evaluate(m, np, nd !== 0 || ns !== 0);
  };

  const resetCurves = () => {
    setDSteps(0);
    setSSteps(0);
    const np = snapPrice(BASE, price);
    setPrice(np);
    latest.current = np;
    setAnnounce('Curves back to D₁ and S₁.');
  };

  // ---------- Calculate it card ----------
  const cardShapes = surplusShapes(BASE, card.price);
  const goToCard = () => {
    setDSteps(0);
    setSSteps(0);
    setPrice(card.price);
    latest.current = card.price;
    setAnnounce(`Dial set to $${card.price}. The dollar values are hidden until you check your answer.`);
  };
  const checkCard = () => {
    const v = parseNumber(typed);
    if (v === null) {
      setCardResult({ ok: false, text: 'Type a number, for example 1500.' });
      return;
    }
    const r = checkAnswer(BASE, card.price, card.ask, v);
    if (r.ok) {
      setCardResult({ ok: true, text: `Correct: ${ASK_NAME[card.ask]} is ${money(correctValue(BASE, card.price, card.ask))}.` });
      setCardOpen(false);
      setAnnounce('Correct. The values are now shown in the panel.');
      complete('calc');
    } else {
      setCardTries((t) => t + 1);
      setCardResult({ ok: false, text: (r.slip && data.slips[r.slip]) || data.slips.other });
      setAnnounce('Not yet. Read the feedback and try again.');
    }
  };
  const revealCard = () => {
    setCardOpen(false);
    setCardResult({ ok: false, text: `The answer is ${money(correctValue(BASE, card.price, card.ask))}. Study the working, then try the next card.` });
  };
  const nextCard = () => {
    setCardIndex((i) => i + 1);
    setTyped('');
    setCardTries(0);
    setCardResult(null);
    setCardOpen(true);
  };
  const cardWork = working(BASE, card.price);

  // ---------- Diagram details ----------
  const narrow = typeof window !== 'undefined' && window.innerWidth < 600;
  const xTicks = marksWithout(narrow ? [200, 400, 600, 800] : [100, 200, 300, 400, 500, 600, 700, 800], [eq.q], narrow ? 90 : 60);
  const yTicks = marksWithout([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], [eq.p], 5);
  const wlCentre: Pt | null = s.wl.length ? { q: (s.wl[0].q * 2 + s.wl[1].q) / 3, p: (s.wl[0].p + s.wl[1].p + s.wl[2].p) / 3 } : null;
  const wlBig = s.wl.length > 0 && eq.q - s.q >= 140 && s.wl[0].p - s.wl[2].p >= 18;
  const gapY = gap > 0 ? price - 6 : price + 6;
  const lo = Math.min(s.qd, s.qs), hi = Math.max(s.qd, s.qs);
  const mid = (lo + hi) / 2;
  const handleQ = 820;
  const description = `Price $${num(price)}. Quantity demanded ${num(s.qd)}, quantity supplied ${num(s.qs)}, quantity traded ${num(s.q)}. ${
    atEq ? 'The market clears at equilibrium.' : gap > 0 ? `Shortage of ${num(gap)} passes.` : `Surplus of ${num(-gap)} passes.`
  } Consumer surplus is shaded above the price, producer surplus below it${s.wl.length ? ', and a welfare loss triangle lies between demand and supply' : ''}.`;

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <div class="play">
        <div class="stack" ref={diagramBox}>
          <Diagram
            xMax={X_MAX}
            yMax={Y_MAX}
            xLabel="Day passes"
            yLabel="Price ($)"
            title="Market for ski day passes"
            description={description}
            xTicks={xTicks}
            yTicks={yTicks}
          >
            <Area points={s.cs} tone="navy" pattern="hatch" label="CS" />
            <Area points={s.ps} tone="red" pattern="dots" label="PS" />
            {s.wl.length > 0 && <Area points={s.wl} tone="grey" pattern="cross" label={wlBig ? 'Welfare loss' : undefined} labelAt={wlCentre ?? undefined} />}
            {shifted && dSteps !== 0 && <Curve line={DEMAND} label="D₁" tone="navy" ghost labelOffset={{ dx: -6, dy: -24 }} />}
            {shifted && sSteps !== 0 && <Curve line={SUPPLY} label="S₁" tone="red" ghost labelOffset={{ dx: -30, dy: 18 }} />}
            <Curve line={market.demand} label={dSteps ? 'D₂ = MB' : 'D = MB'} tone="navy" labelOffset={{ dx: -20, dy: -36 }} />
            <Curve line={market.supply} label={sSteps ? 'S₂ = MC' : 'S = MC'} tone="red" labelOffset={{ dx: -66, dy: -10 }} />
            {dSteps !== 0 && <Arrow from={{ q: 600, p: priceAt(DEMAND, 600) }} to={{ q: 600 + dSteps * 150, p: priceAt(DEMAND, 600) }} tone="navy" />}
            {sSteps !== 0 && <Arrow from={{ q: 700, p: priceAt(SUPPLY, 700) }} to={{ q: 700 + sSteps * 150, p: priceAt(SUPPLY, 700) }} tone="red" />}
            <Guide at={eq} xText={`Qₑ ${num(eq.q)}`} yText={`Pₑ ${num(eq.p)}`} />
            {!atEq && s.wl.length > 0 && !wlBig && (
              <Label
                at={price > eq.p ? { q: (s.q + eq.q) / 2, p: s.wl[2].p } : { q: (s.q + eq.q) / 2, p: s.wl[0].p }}
                text="Welfare loss"
                dy={price > eq.p ? 20 : -10}
                anchor="middle"
                bold
                tone="ink"
              />
            )}
            <Dot at={eq} r={4} />
            {(atEq || Math.abs(price - eq.p) >= 4) && <Label at={eq} text="MB = MC" dx={40} dy={17} bold />}
            <HLine p={price} tone="ink" label={`$${num(price)}`} />
            {!atEq && (
              <>
                <Guide at={{ q: s.qd, p: price }} toY={false} tone="navy" />
                <Guide at={{ q: s.qs, p: price }} toY={false} tone="red" />
                <Dot at={{ q: s.qd, p: price }} tone="navy" r={5} />
                <Dot at={{ q: s.qs, p: price }} tone="red" r={5} />
                <Label at={{ q: s.qd, p: 0 }} text="Qd" dy={-6} dx={gap > 0 ? 5 : -5} anchor={gap > 0 ? 'start' : 'end'} bold tone="navy" />
                <Label at={{ q: s.qs, p: 0 }} text="Qs" dy={-6} dx={gap > 0 ? -5 : 5} anchor={gap > 0 ? 'end' : 'start'} bold tone="red" />
                {hi - lo > 40 && (
                  <>
                    <Arrow from={{ q: mid, p: gapY }} to={{ q: hi, p: gapY }} tone="ink" width={2} />
                    <Arrow from={{ q: mid, p: gapY }} to={{ q: lo, p: gapY }} tone="ink" width={2} />
                  </>
                )}
                <Label at={{ q: mid, p: gapY }} text={`${gap > 0 ? 'Shortage' : 'Surplus'} ${num(Math.abs(gap))}`} dy={gap > 0 ? 20 : -8} anchor="middle" bold />
              </>
            )}
            <Handle
              at={{ q: handleQ, p: price }}
              axis="p"
              step={{ q: 0, p: 1 }}
              onMove={(pt) => movePrice(pt.p)}
              onRelease={release}
              label="Price of a day pass. Use the up and down arrow keys."
              valueText={`$${num(price)}. ${atEq ? 'Equilibrium.' : gap > 0 ? `Shortage of ${num(gap)}.` : `Surplus of ${num(-gap)}.`} Quantity traded ${num(s.q)}.`}
            />
          </Diagram>
          <div class="legend" aria-label="Key">
            <span><Swatch kind="cs" />CS: consumer surplus (stripes)</span>
            <span><Swatch kind="ps" />PS: producer surplus (dots)</span>
            <span><Swatch kind="wl" />Welfare loss (grid)</span>
          </div>
          <p class="small muted">Drag the red knob up or down to set the price, or Tab to it and use the arrow keys (Shift + arrow moves $5).</p>
          <div class="row" role="group" aria-label="Shift the curves">
            <button class="btn btn-secondary btn-sm" disabled={dSteps <= -MAX_SHIFT} onClick={() => shift('d', -1)}>Demand left</button>
            <button class="btn btn-secondary btn-sm" disabled={dSteps >= MAX_SHIFT} onClick={() => shift('d', 1)}>Demand right</button>
            <button class="btn btn-secondary btn-sm" disabled={sSteps <= -MAX_SHIFT} onClick={() => shift('s', -1)}>Supply left</button>
            <button class="btn btn-secondary btn-sm" disabled={sSteps >= MAX_SHIFT} onClick={() => shift('s', 1)}>Supply right</button>
            <button class="btn btn-quiet btn-sm" disabled={!shifted} onClick={resetCurves}>Reset curves</button>
          </div>
        </div>

        <div class="stack">
          <div class="panel stack">
            <h3><StepNo n={1} /> Set the price</h3>
            <div>
              <label for="ss-price">Price of a day pass: ${num(price)}</label>
              <div class="row" style={{ flexWrap: 'nowrap' }}>
                <button class="btn btn-secondary btn-sm" aria-label="Lower the price by $1" onClick={() => setFromControl(price - 1)}>−</button>
                <input
                  id="ss-price"
                  type="range"
                  min={snapPrice(market, 0)}
                  max={snapPrice(market, 999)}
                  step={1}
                  value={price}
                  onInput={(e) => setFromControl(Number((e.target as HTMLInputElement).value))}
                />
                <button class="btn btn-secondary btn-sm" aria-label="Raise the price by $1" onClick={() => setFromControl(price + 1)}>+</button>
              </div>
            </div>
            <div class="stat"><span>Quantity demanded (Qd)</span><b>{num(s.qd)}</b></div>
            <div class="stat"><span>Quantity supplied (Qs)</span><b>{num(s.qs)}</b></div>
            <div class="stat"><span>Quantity traded (the smaller of Qd and Qs)</span><b>{num(s.q)}</b></div>
            <div class="stat">
              <span>Shortage or surplus</span>
              <b>{atEq ? 'None: the market clears' : gap > 0 ? `Shortage of ${num(gap)}` : `Surplus of ${num(-gap)}`}</b>
            </div>
            <div class="stat"><span>Equilibrium</span><b>{num(eq.q)} passes at ${num(eq.p)}</b></div>
          </div>

          <div class="panel stack" aria-labelledby="ss-values-h">
            <h3 id="ss-values-h" class="row" style={{ gap: 8 }}>Surplus in dollars <HlBadge /></h3>
            {hideValues ? (
              <p class="callout">The dollar values are hidden at ${card.price}. Solve the <strong>Calculate it</strong> card first.</p>
            ) : (
              <>
                <div>
                  <div class="stat"><span>Consumer surplus (CS)</span><b>{money(w.consumerSurplus)}</b></div>
                  <WorkingLines pieces={wk.cs} />
                </div>
                <div>
                  <div class="stat"><span>Producer surplus (PS)</span><b>{money(w.producerSurplus)}</b></div>
                  <WorkingLines pieces={wk.ps} />
                </div>
                <div>
                  <div class="stat"><span>Community surplus (CS + PS)</span><b>{money(w.communitySurplus)}</b></div>
                  <span class="small muted">{money(w.consumerSurplus)} + {money(w.producerSurplus)} = {money(w.communitySurplus)}</span>
                </div>
                <div>
                  <div class="stat"><span>Welfare loss</span><b>{money(w.welfareLoss)}</b></div>
                  <WorkingLines pieces={wk.wl} wlBase={{ qe: eq.q, q: s.q }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div class="play">
        <section class="panel stack" aria-labelledby="ss-challenges-h">
          <h3 id="ss-challenges-h"><StepNo n={2} /> Challenges ({done.size} of {data.challenges.length})</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} class="stack">
            {data.challenges.map((c) => (
              <li key={c.id} class="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <span aria-hidden="true" style={{ color: done.has(c.id) ? 'var(--ok)' : 'var(--line)', flex: 'none' }}>
                  {done.has(c.id) ? <MarkIcon size={22} /> : <span style={{ display: 'inline-block', width: 22, height: 22, border: '2px solid var(--line)', borderRadius: 4 }} />}
                </span>
                <span>
                  <Md text={c.text} inline />
                  {done.has(c.id) && <span class="sr-only"> (done)</span>}
                </span>
              </li>
            ))}
          </ul>
          <p class="small muted">Complete any 3 challenges to finish this step.</p>
        </section>

        <section class="event-card stack" aria-labelledby="ss-card-h">
          <p class="small muted row" style={{ margin: 0, gap: 8 }}><HlBadge /> Problem {(cardIndex % data.cards.length) + 1} of {data.cards.length}</p>
          <h3 id="ss-card-h"><StepNo n={3} /> Calculate it: {ASK_NAME[card.ask]} at ${card.price}</h3>
          <Md text={card.prompt} />
          <div>
            <p style={{ marginBottom: 4 }}><strong>Readings from the diagram (D₁ and S₁):</strong></p>
            <ul class="small" style={{ margin: 0, paddingLeft: 20 }}>
              <li>Demand meets the price axis at ${num(priceAt(DEMAND, 0))}. Supply meets it at ${num(priceAt(SUPPLY, 0))}.</li>
              <li>Equilibrium: {num(cardShapes.eq.q)} passes at ${num(cardShapes.eq.p)}.</li>
              <li>At ${card.price}: quantity demanded {num(cardShapes.qd)}, quantity supplied {num(cardShapes.qs)}.</li>
              <li>At Q = {num(cardShapes.q)}: demand is at ${num(priceAt(DEMAND, cardShapes.q))}, supply is at ${num(priceAt(SUPPLY, cardShapes.q))}.</li>
            </ul>
          </div>
          <div>
            <button class="btn btn-secondary btn-sm" onClick={goToCard}>Show ${card.price} on the diagram</button>
          </div>
          <div>
            <label for="ss-answer">Your answer for {ASK_NAME[card.ask]} ($)</label>
            <div class="row" style={{ flexWrap: 'nowrap' }}>
              <span aria-hidden="true">$</span>
              <input
                id="ss-answer"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={typed}
                disabled={!cardOpen}
                onInput={(e) => setTyped((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => e.key === 'Enter' && cardOpen && checkCard()}
                style={{ maxWidth: 160 }}
              />
              <button class="btn btn-sm" disabled={!cardOpen || !typed.trim()} onClick={checkCard}>Check</button>
            </div>
          </div>
          {cardResult && (
            <div class={`callout ${cardResult.ok ? 'callout-ok' : 'callout-try'}`} role="status">
              <p style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                {cardResult.ok ? <MarkIcon /> : <CrossIcon />}
                {cardResult.ok ? 'Well done.' : cardOpen ? 'Not yet.' : 'Here is the working.'}
              </p>
              <p>{cardResult.text}</p>
              {!cardOpen && (
                <p class="small">
                  <strong>Working:</strong>{' '}
                  <WorkingLines
                    pieces={card.ask === 'cs' ? cardWork.cs : card.ask === 'ps' ? cardWork.ps : cardWork.wl}
                    wlBase={card.ask === 'wl' ? { qe: cardShapes.eq.q, q: cardShapes.q } : undefined}
                  />
                </p>
              )}
            </div>
          )}
          <div class="row">
            {cardOpen && cardTries >= 2 && <button class="btn btn-quiet btn-sm" onClick={revealCard}>Show me the answer</button>}
            {!cardOpen && <button class="btn" onClick={nextCard}>Next problem</button>}
          </div>
        </section>
      </div>
    </div>
  );
}

export { Try, LearnDiagram };
