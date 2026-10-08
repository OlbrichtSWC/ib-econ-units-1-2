/**
 * The Elasticity Café (2.5 PED): a business simulation.
 * The student runs a café for a week, choosing a price each day on a hidden demand curve.
 * From their own sales log (PED, change in TR, price pull and quantity pull) they decide
 * whether demand is price elastic or inelastic, then the demand curve is revealed and
 * the debrief links the result to HINTS.
 */
import { useMemo, useRef, useState } from 'preact/hooks';
import { pedAtPoint, round } from '../../econ/calc';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon } from '../../shared/design/components';
import { Area, Curve, Diagram, Dot, Halo, TONE, useDiagram } from '../../shared/diagrams/Diagram';
import type { Pt } from '../../econ/calc';
import type { TryProps } from '../../shared/activity/types';
import { DataTable } from '../../shared/activity/CheckIt';
import {
  bestMove, cupsSold, DayRow, fill, money, PRICE_STEP, pedText, rangeType, salesLog, Scenario, signedMoney, signedPct, snapPrice, summarize,
} from './model';

type Side = 'elastic' | 'inelastic';
type Move = 'raise' | 'lower';

interface TryContent {
  intro: string;
  days: number;
  scenarios: Scenario[];
  decision: {
    typeQuestion: string;
    typeOptions: Record<Side, string>;
    moveQuestion: string;
    moveOptions: Record<Move, string>;
  };
  feedback: Record<string, string>;
}

const rect = (q0: number, q1: number, p0: number, p1: number): Pt[] => [
  { q: q0, p: p0 }, { q: q1, p: p0 }, { q: q1, p: p1 }, { q: q0, p: p1 },
];

/**
 * Axis tags (P₁, P₂, Q₁, Q₂) with dashed guides. Tags that would overlap are pushed apart,
 * because one $0.25 step is only a few pixels on the diagram.
 */
function AxisTags(props: { points: { at: Pt; p: string; q: string }[] }) {
  const { sx, sy, plot } = useDiagram();
  const ys = props.points.map((pt) => sy(pt.at.p) + 5);
  const xs = props.points.map((pt) => sx(pt.at.q));
  if (ys.length === 2 && Math.abs(ys[0] - ys[1]) < 16) {
    const mid = (ys[0] + ys[1]) / 2, up = ys[0] <= ys[1] ? -8 : 8;
    ys[0] = mid + up; ys[1] = mid - up;
  }
  if (xs.length === 2 && Math.abs(xs[0] - xs[1]) < 26) {
    const mid = (xs[0] + xs[1]) / 2, left = xs[0] <= xs[1] ? -13 : 13;
    xs[0] = mid + left; xs[1] = mid - left;
  }
  return (
    <g aria-hidden="true">
      {props.points.map((pt, i) => {
        const x = sx(pt.at.q), y = sy(pt.at.p);
        return (
          <g key={i}>
            <line x1={plot.left} y1={y} x2={x} y2={y} stroke={TONE.grey} stroke-width="1.6" stroke-dasharray="5 5" />
            <line x1={x} y1={y} x2={x} y2={plot.bottom} stroke={TONE.grey} stroke-width="1.6" stroke-dasharray="5 5" />
            <Halo x={plot.left - 9} y={ys[i]} text={pt.p} anchor="end" size={14} bold />
            <Halo x={xs[i]} y={plot.bottom + 34} text={pt.q} anchor="middle" size={14} bold />
          </g>
        );
      })}
    </g>
  );
}

/** Two-line label for the quantity pull, placed beside its strip (inside the plot if there is no room). */
function SideLabel(props: { qLeft: number; qRight: number; p: number; lines: string[]; tone: 'green' | 'red' }) {
  const { sx, sy, plot } = useDiagram();
  const roomRight = plot.right + 40 - sx(props.qRight);
  const right = roomRight > 120;
  // With no room beside the strip, the label sits in the top right corner with a leader line.
  const x = right ? sx(props.qRight) + 6 : plot.right + 40;
  const y = right ? sy(props.p) : plot.top + 8;
  const midX = (sx(props.qLeft) + sx(props.qRight)) / 2;
  return (
    <g aria-hidden="true">
      {!right && <line x1={midX} y1={sy(props.p)} x2={plot.right + 4} y2={y + 22} stroke={TONE[props.tone]} stroke-width="1.5" />}
      {props.lines.map((t, i) => (
        <Halo key={i} x={x} y={y + i * 17} text={t} anchor={right ? 'start' : 'end'} size={14} bold fill={TONE[props.tone]} />
      ))}
    </g>
  );
}

/** Small pattern swatch for the legend, matching the diagram's fills. */
function Swatch({ kind, tone }: { kind: 'dots' | 'hatch' | 'cross'; tone: 'navy' | 'green' | 'red' }) {
  const c = TONE[tone];
  return (
    <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4, border: `1px solid ${c}` }}>
      <rect width="26" height="16" fill="#fff" />
      {kind === 'dots' && [4, 12, 20].flatMap((x) => [4, 12].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" fill={c} />))}
      {kind === 'hatch' && [-8, 0, 8, 16, 24].map((x) => <line key={x} x1={x} y1="16" x2={x + 16} y2="0" stroke={c} stroke-width="1.6" />)}
      {kind === 'cross' && [-8, 0, 8, 16, 24].map((x) => <g key={x}><line x1={x} y1="16" x2={x + 16} y2="0" stroke={c} stroke-width="1.2" /><line x1={x} y1="0" x2={x + 16} y2="16" stroke={c} stroke-width="1.2" /></g>)}
    </svg>
  );
}

/** Learn it: a demand curve with the TR rectangles for a price rise, and the two pulls labelled. */
function LearnDiagram() {
  const D = { a: { q: 0, p: 10 }, b: { q: 400, p: 0 } };
  const p1 = 6, q1 = 160, p2 = 7, q2 = 120;
  return (
    <Diagram xMax={250} yMax={10} xLabel="Quantity (cups)" yLabel="Price ($)" title="Demand curve with total revenue before and after a price rise, split into the price pull and the quantity pull">
      <Area points={rect(0, q2, 0, p1)} pattern="dots" tone="navy" label="TR kept" labelAt={{ q: q2 / 2, p: p1 / 2 }} />
      <Area points={rect(0, q2, p1, p2)} pattern="hatch" tone="green" />
      <Area points={rect(q2, q1, 0, p1)} pattern="cross" tone="red" />
      <Curve line={D} label="D" tone="navy" labelOffset={{ dx: -24, dy: -10 }} />
      <AxisTags points={[{ at: { q: q1, p: p1 }, p: 'P₁', q: 'Q₁' }, { at: { q: q2, p: p2 }, p: 'P₂', q: 'Q₂' }]} />
      <PullLabels q2={q2} p1={p1} p2={p2} />
      <SideLabel qLeft={q2} qRight={q1} p={p1 / 2} lines={['Quantity pull', '−$240 (loss)']} tone="red" />
      <Dot at={{ q: q1, p: p1 }} />
      <Dot at={{ q: q2, p: p2 }} />
    </Diagram>
  );
}

/** Price pull label (two short lines) above its strip, at the left so it stays clear of the dots. */
function PullLabels(props: { q2: number; p1: number; p2: number; lines?: string[]; tone?: 'green' | 'red' }) {
  const { sx, sy } = useDiagram();
  const top = sy(Math.max(props.p1, props.p2));
  const lines = props.lines ?? ['Price pull', '+$120 (gain)'];
  return (
    <g aria-hidden="true">
      {lines.map((t, i) => (
        <Halo key={i} x={sx(0) + 6} y={top - 8 - (lines.length - 1 - i) * 17} text={t} anchor="start" size={14} bold fill={TONE[props.tone ?? 'green']} />
      ))}
    </g>
  );
}

function Try({ content, onComplete }: TryProps) {
  const data = content.try as unknown as TryContent;
  const fb = data.feedback;
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [prices, setPrices] = useState<number[]>([]);
  const [price, setPrice] = useState(0);
  const [typeAns, setTypeAns] = useState<Side | null>(null);
  const [moveAns, setMoveAns] = useState<Move | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [announce, setAnnounce] = useState('');
  const completed = useRef(false);

  const s = data.scenarios.find((x) => x.id === scenarioId) ?? null;
  const rows = useMemo(() => (s ? salesLog(s, prices) : []), [s, prices]);
  const weekDone = rows.length >= data.days;

  const choose = (id: string) => {
    const sc = data.scenarios.find((x) => x.id === id)!;
    setScenarioId(id);
    setPrices([]);
    setPrice(sc.startPrice);
    setTypeAns(null);
    setMoveAns(null);
    setSubmitted(false);
    setAnnounce(`${sc.name}. Day 1. Choose a price and open the café.`);
  };

  if (!s) {
    return (
      <div class="stack">
        <LiveRegion text={announce} />
        <section class="panel stack" aria-labelledby="pick-h">
          <h3 id="pick-h">Choose your café</h3>
          <div class="choice-grid" role="group" aria-label="Café scenarios">
            {data.scenarios.map((sc) => (
              <button key={sc.id} type="button" class="choice-btn" onClick={() => choose(sc.id)}>
                <strong>{sc.name}</strong>
                <br />
                <span class="small"><Md text={sc.text} inline /></span>
              </button>
            ))}
          </div>
          <div>
            <button class="btn btn-secondary" onClick={() => choose(data.scenarios[Math.floor(Math.random() * data.scenarios.length)].id)}>
              Surprise me
            </button>
          </div>
        </section>
      </div>
    );
  }

  const today: DayRow | undefined = rows[rows.length - 1];
  const yesterday: DayRow | undefined = rows[rows.length - 2];
  const changed = !!(today && yesterday && Math.abs(today.price - yesterday.price) > 1e-9);
  const truth: Side = rangeType(s) === 'inelastic' ? 'inelastic' : 'elastic';
  const sum = summarize(rows);

  const setP = (v: number) => setPrice(snapPrice(s, v));
  const open = () => {
    if (weekDone) return;
    const p = snapPrice(s, price);
    const cups = cupsSold(s, p);
    const next = [...prices, p];
    setPrices(next);
    const r = salesLog(s, next);
    const last = r[r.length - 1];
    let msg = `Day ${last.day}: at ${money(p)} you sold ${cups} cups. Total revenue ${money(last.revenue)}.`;
    if (last.changeTR !== null) msg += ` Change in total revenue ${signedMoney(last.changeTR)}.`;
    if (next.length >= data.days) msg += ' The week is over. Make your decision below.';
    setAnnounce(msg);
  };

  const submit = () => {
    if (!typeAns || !moveAns) return;
    setSubmitted(true);
    setAnnounce(typeAns === truth && moveAns === bestMove(truth) ? 'Both answers are right.' : 'Read the feedback to see what your data shows.');
    if (!completed.current) {
      completed.current = true;
      onComplete();
    }
  };

  // ---------- Diagram ----------
  const yTop = s.pMax;
  const dotsByPoint = new Map<string, { at: Pt; days: number[] }>();
  rows.forEach((r) => {
    const k = `${r.price}`;
    const e = dotsByPoint.get(k);
    if (e) e.days.push(r.day);
    else dotsByPoint.set(k, { at: { q: r.cups, p: r.price }, days: [r.day] });
  });

  const pricePull = today?.pricePull ?? 0;
  const qtyPull = today?.quantityPull ?? 0;
  const ppTone = pricePull >= 0 ? 'green' : 'red';
  const qpTone = qtyPull >= 0 ? 'green' : 'red';
  const gl = (v: number) => (v >= 0 ? 'gain' : 'loss');

  const description = !today
    ? 'No sales yet. Choose a price and open the café.'
    : changed
      ? `Today the price is ${money(today.price)} and ${today.cups} cups were sold, so total revenue is ${money(today.revenue)}. Yesterday: ${money(yesterday!.price)} and ${yesterday!.cups} cups. Price pull ${signedMoney(pricePull)}, quantity pull ${signedMoney(qtyPull)}.`
      : `Today the price is ${money(today.price)} and ${today.cups} cups were sold, so total revenue is ${money(today.revenue)}.`;

  const fmtRow = (r: DayRow): (string | number)[] => [
    r.day,
    money(r.price),
    r.cups,
    money(r.revenue),
    r.pctPrice === null ? 'none' : signedPct(r.pctPrice),
    r.pctQuantity === null ? 'none' : signedPct(r.pctQuantity),
    r.ped === null ? (r.day === 1 ? 'none' : 'no price change') : pedText(r.ped),
    r.changeTR === null ? 'none' : signedMoney(r.changeTR),
  ];

  // ---------- Feedback ----------
  const ex = sum.example;
  const exPrev = ex ? rows[ex.day - 2] : null;
  const exampleText = ex && exPrev
    ? fill(fb.example, {
      day: ex.day, p1: money(exPrev.price), p2: money(ex.price), pctP: signedPct(ex.pctPrice!), q1: exPrev.cups, q2: ex.cups,
      pctQ: signedPct(ex.pctQuantity!), ped: pedText(ex.ped!), compare: Math.abs(ex.ped!) > 1 ? 'more than' : 'less than',
      bigger: Math.abs(ex.ped!) > 1 ? 'bigger' : 'smaller',
    })
    : fb.noData;
  const patternText = sum.meanAbsPed !== null
    ? fill(fb.pattern, { mean: round(sum.meanAbsPed, 2).toFixed(2), opposite: sum.opposite, changes: sum.changes, same: sum.same })
    : '';
  const pedLow = pedAtPoint(s.demand, s.priceMin), pedHigh = pedAtPoint(s.demand, s.priceMax);

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <section class="callout stack">
        <p style={{ margin: 0 }}><strong>{s.name}</strong></p>
        <Md text={s.text} />
      </section>
      <div class="play">
        <div class="stack">
          <Diagram
            xMax={s.qMax}
            yMax={yTop}
            xLabel="Quantity (cups)"
            yLabel="Price ($)"
            title={`Your café's sales: ${s.name}`}
            description={description}
          >
            {today && changed && (
              <>
                <Area points={rect(0, Math.min(today.cups, yesterday!.cups), 0, Math.min(today.price, yesterday!.price))} pattern="dots" tone="navy" />
                <Area points={rect(0, Math.min(today.cups, yesterday!.cups), yesterday!.price, today.price)} pattern="hatch" tone={ppTone} />
                <Area points={rect(yesterday!.cups, today.cups, 0, Math.min(today.price, yesterday!.price))} pattern="cross" tone={qpTone} />
              </>
            )}
            {today && !changed && <Area points={rect(0, today.cups, 0, today.price)} pattern="dots" tone="navy" />}
            {submitted && <Curve line={s.demand} label="D" tone="navy" labelOffset={{ dx: -22, dy: -8 }} />}
            {today && (
              <AxisTags
                points={changed
                  ? [{ at: { q: yesterday!.cups, p: yesterday!.price }, p: 'P₁', q: 'Q₁' }, { at: { q: today.cups, p: today.price }, p: 'P₂', q: 'Q₂' }]
                  : [{ at: { q: today.cups, p: today.price }, p: money(today.price), q: String(today.cups) }]}
              />
            )}
            {today && <TrLabel q={today.cups} p={changed ? Math.min(today.price, yesterday!.price) : today.price} text={`TR = ${money(today.revenue)}`} />}
            {today && changed && (
              <PullLabels q2={today.cups} p1={yesterday!.price} p2={today.price} lines={['Price pull', `${signedMoney(pricePull)} (${gl(pricePull)})`]} tone={ppTone} />
            )}
            {today && changed && (
              <SideLabel
                qLeft={Math.min(today.cups, yesterday!.cups)}
                qRight={Math.max(today.cups, yesterday!.cups)}
                p={Math.min(today.price, yesterday!.price) / 2}
                lines={['Quantity pull', `${signedMoney(qtyPull)} (${gl(qtyPull)})`]}
                tone={qpTone}
              />
            )}
            {[...dotsByPoint.values()].map((d) => {
              const isToday = !!today && d.days.includes(today.day);
              const isYesterday = changed && d.days.includes(yesterday!.day);
              // Only today's and yesterday's dots get a label, so labels never pile up.
              const label = isToday ? 'Today' : isYesterday ? 'Yesterday' : undefined;
              // The higher of the two labelled dots is labelled above, the lower one below.
              const other = isToday ? yesterday : today;
              const higher = !changed || !other || d.at.p > other.price;
              return (
                <Dot key={d.days.join()} at={d.at} tone={isToday ? 'red' : 'ink'} r={isToday ? 7 : 5} hollow={!isToday && !isYesterday} label={label} labelDx={10} labelDy={higher ? -10 : 20} />
              );
            })}
          </Diagram>
          <div class="legend" aria-label="Diagram key">
            <span><Swatch kind="dots" tone="navy" />Dots: total revenue (when the price changes: the revenue kept from yesterday)</span>
            <span><Swatch kind="hatch" tone="navy" />Diagonal lines: price pull</span>
            <span><Swatch kind="cross" tone="navy" />Cross pattern: quantity pull</span>
            <span>Green and + mean a gain. Red and − mean a loss.</span>
          </div>
          {!submitted && <p class="small muted">Each dot is one day's sales (red: today; solid: yesterday; hollow: earlier days). The demand curve stays hidden until the end of the week.</p>}
        </div>

        <div class="stack">
          <div class="panel stack">
            <h3>{weekDone ? 'The week is over' : `Day ${rows.length + 1} of ${data.days}`}</h3>
            {!weekDone && (
              <>
                <div>
                  <label for="cafe-price">Today's price: <strong>{money(price)}</strong></label>
                  <div class="row" style={{ flexWrap: 'nowrap' }}>
                    <button class="btn btn-secondary btn-sm" aria-label="Lower the price by 25 cents" onClick={() => setP(price - PRICE_STEP)} disabled={price <= s.priceMin}>−</button>
                    <input
                      id="cafe-price"
                      type="range"
                      min={s.priceMin}
                      max={s.priceMax}
                      step={PRICE_STEP}
                      value={price}
                      aria-valuetext={money(price)}
                      onInput={(e) => setP(Number((e.target as HTMLInputElement).value))}
                    />
                    <button class="btn btn-secondary btn-sm" aria-label="Raise the price by 25 cents" onClick={() => setP(price + PRICE_STEP)} disabled={price >= s.priceMax}>+</button>
                  </div>
                  <p class="small muted">Prices from {money(s.priceMin)} to {money(s.priceMax)}.</p>
                </div>
                <div>
                  <button class="btn" onClick={open}>Open the café</button>
                </div>
                {today && Math.abs(price - today.price) < 1e-9 && (
                  <p class="small muted">Tip: this is the same price as yesterday. Change the price to measure PED.</p>
                )}
              </>
            )}
            {today ? (
              <div role="status">
                <div class="stat"><span>Day {today.day} price</span><b>{money(today.price)}</b></div>
                <div class="stat"><span>Cups sold</span><b>{today.cups}</b></div>
                <div class="stat"><span>Total revenue (P × Q)</span><b>{money(today.revenue)}</b></div>
                {today.changeTR !== null && <div class="stat"><span>Change in TR from yesterday</span><b>{signedMoney(today.changeTR)}</b></div>}
                {changed && (
                  <>
                    <div class="stat"><span>Price pull: (P₂ − P₁) × smaller Q</span><b>{signedMoney(pricePull)}</b></div>
                    <div class="stat"><span>Quantity pull: lower P × (Q₂ − Q₁)</span><b>{signedMoney(qtyPull)}</b></div>
                    <div class="stat"><span>PED from yesterday</span><b>{pedText(today.ped!)}</b></div>
                  </>
                )}
              </div>
            ) : (
              <p class="small muted">Choose a price, then open the café to see how many cups you sell.</p>
            )}
            <div class="row">
              <button class="btn btn-quiet btn-sm" onClick={() => choose(s.id)}>Restart this week</button>
              <button class="btn btn-quiet btn-sm" onClick={() => { setScenarioId(null); setAnnounce('Choose your café.'); }}>Choose another café</button>
            </div>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <section class="stack" aria-labelledby="log-h">
          <h3 id="log-h">Sales log</h3>
          <p class="small muted">Each change is from the previous day (the original value). PED = % change in quantity ÷ % change in price.</p>
          <DataTable
            table={{
              headers: ['Day', 'Price', 'Cups sold', 'Total revenue', '% change in price', '% change in quantity', 'PED', 'Change in TR'],
              rows: rows.map(fmtRow),
            }}
          />
        </section>
      )}

      {weekDone && (
        <section class="event-card stack" aria-labelledby="decide-h">
          <h3 id="decide-h">End of the week: your decision</h3>
          <p><strong>{data.decision.typeQuestion}</strong></p>
          <div class="choice-grid" role="group" aria-label={data.decision.typeQuestion}>
            {(['elastic', 'inelastic'] as Side[]).map((k) => (
              <button key={k} type="button" class="choice-btn" aria-pressed={typeAns === k} disabled={submitted} onClick={() => setTypeAns(k)}>
                {data.decision.typeOptions[k]}
              </button>
            ))}
          </div>
          <p><strong>{data.decision.moveQuestion}</strong></p>
          <div class="choice-grid" role="group" aria-label={data.decision.moveQuestion}>
            {(['raise', 'lower'] as Move[]).map((k) => (
              <button key={k} type="button" class="choice-btn" aria-pressed={moveAns === k} disabled={submitted} onClick={() => setMoveAns(k)}>
                {data.decision.moveOptions[k]}
              </button>
            ))}
          </div>
          {!submitted ? (
            <div>
              <button class="btn" disabled={!typeAns || !moveAns} onClick={submit}>Check my decision</button>
            </div>
          ) : (
            <div class="stack">
              <div class={`callout ${typeAns === truth ? 'callout-ok' : 'callout-try'}`}>
                <p style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                  {typeAns === truth ? <MarkIcon /> : <CrossIcon />}
                  <span><Md text={fill(typeAns === truth ? fb.typeRight : fb.typeWrong, { type: truth })} inline /></span>
                </p>
                <Md text={exampleText} />
                {patternText && <Md text={patternText} />}
              </div>
              <div class={`callout ${moveAns === bestMove(truth) ? 'callout-ok' : 'callout-try'}`}>
                <p style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                  {moveAns === bestMove(truth) ? <MarkIcon /> : <CrossIcon />}
                  <span><Md text={fill(moveAns === bestMove(truth) ? fb.moveRight : fb.moveWrong, { move: bestMove(truth) })} inline /></span>
                </p>
                <Md text={truth === 'elastic' ? fb.whyElastic : fb.whyInelastic} />
              </div>
              <div class="callout">
                <Md text={fb.reveal} />
                <Md
                  text={fill(fb.hl, {
                    pedLow: pedText(pedLow), pLow: money(s.priceMin), pedHigh: pedText(pedHigh), pHigh: money(s.priceMax),
                    side: truth === 'elastic' ? 'more than' : 'less than',
                  })}
                />
              </div>
              <div class="panel stack">
                <h4 style={{ margin: 0 }}>{fb.hintsTitle}</h4>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {s.hints.map((h) => (
                    <li key={h.letter}><strong>{h.letter}</strong>: <Md text={h.text} inline /></li>
                  ))}
                </ul>
              </div>
              <div class="row">
                {data.scenarios.filter((x) => x.id !== s.id).map((x) => (
                  <button key={x.id} class="btn btn-secondary" onClick={() => choose(x.id)}>Next week: {x.name}</button>
                ))}
                <button class="btn btn-quiet" onClick={() => choose(s.id)}>Run this café again</button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** TR label in the middle of the revenue rectangle that is kept. */
function TrLabel(props: { q: number; p: number; text: string }) {
  const { sx, sy } = useDiagram();
  const x = sx(props.q / 2), y = sy(props.p / 2);
  return <Halo x={x} y={y + 5} text={props.text} anchor="middle" size={15} bold fill={TONE.navy} />;
}

export { Try, LearnDiagram };
