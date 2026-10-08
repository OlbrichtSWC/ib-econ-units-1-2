/**
 * Same Slope, Different PED (HL 2.5): an explorer on one straight-line demand curve.
 * Slide a point along the demand curve for bike rentals. The panel shows PED at the point,
 * checked with the IB percentage-change formula, and the total revenue curve below shows
 * that TR is greatest where |PED| = 1. Discovery challenges reveal the three sections.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { classifyPed, pedAtPoint, priceAt, Pt, quantityAt, round, totalRevenue } from '../../econ/calc';
import { Md } from '../../shared/content/markdown';
import { HlBadge, LiveRegion, MarkIcon } from '../../shared/design/components';
import { Area, Curve, Diagram, Dot, Guide, Halo, Handle, Label, TONE, useDiagram } from '../../shared/diagrams/Diagram';
import type { TryProps } from '../../shared/activity/types';
import { play } from '../../shared/fun/sound';
import { Mystery, MysteryLevel } from './Mystery';
import { ChallengeId, challengesForMove, DEMAND, ibCheck, MID, priceFromDrag, schedule, snapPrice, trCurve, unitaryCurve, Zone, zoneAt } from './model';

const QMAX = 210;
const PMAX = 22;
const X_TICKS = [0, 40, 80, 120, 160, 200];
const Q_LABEL = 'Quantity (rentals per day)';

interface TryContent {
  intro: string;
  mysteryLevels: MysteryLevel[];
  curves: Record<string, { name: string; perDollar: string }>;
  mysteryHelp: string;
  challenges: { id: ChallengeId; text: string }[];
  why: { title: string; text: string };
  special: {
    title: string;
    note: string;
    elastic: { title: string; caption: string };
    inelastic: { title: string; caption: string };
    unitary: { title: string; caption: string };
  };
}

const money = (n: number) => `$${n.toFixed(2)}`;
const cash = (n: number) => (Number.isInteger(round(n, 2)) ? `$${round(n, 2)}` : `$${n.toFixed(2)}`);
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}`;
const pedText = (v: number) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);

const ZONE_TEXT: Record<Zone, string> = {
  elastic: 'Elastic (|PED| > 1)',
  unitary: 'Unitary (|PED| = 1)',
  inelastic: 'Inelastic (|PED| < 1)',
};

/**
 * A bracket drawn parallel to part of the demand curve, offset to its upper right, with a label.
 * Elastic uses a solid bracket, inelastic a dashed one, so the sections never rely on colour.
 */
function ZoneBracket(props: { from: Pt; to: Pt; text: string; dashed?: boolean; tone?: 'navy' | 'red' | 'green'; offset?: number; labelDx?: number; labelDy?: number }) {
  const { sx, sy } = useDiagram();
  const x1 = sx(props.from.q), y1 = sy(props.from.p), x2 = sx(props.to.q), y2 = sy(props.to.p);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const nx = (y2 - y1) / len, ny = -(x2 - x1) / len; // normal pointing up and to the right
  const off = props.offset ?? 16;
  const col = TONE[props.tone ?? 'navy'];
  const a = { x: x1 + nx * off, y: y1 + ny * off };
  const b = { x: x2 + nx * off, y: y2 + ny * off };
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return (
    <g aria-hidden="true">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={col} stroke-width="3" stroke-dasharray={props.dashed ? '7 5' : undefined} />
      <line x1={a.x} y1={a.y} x2={a.x - nx * 9} y2={a.y - ny * 9} stroke={col} stroke-width="3" />
      <line x1={b.x} y1={b.y} x2={b.x - nx * 9} y2={b.y - ny * 9} stroke={col} stroke-width="3" />
      <Halo x={mid.x + nx * 12 + (props.labelDx ?? 0)} y={mid.y + ny * 12 + (props.labelDy ?? 0)} text={props.text} fill={col} bold size={14} />
    </g>
  );
}

/** A short mark across the curve at the midpoint, labelled "Unitary (|PED| = 1)". */
function MidMark(props: { text: string; labelDx?: number; labelDy?: number }) {
  const { sx, sy } = useDiagram();
  const x = sx(MID.q), y = sy(MID.p);
  return (
    <g aria-hidden="true">
      <line x1={x - 9} y1={y - 9} x2={x + 9} y2={y + 9} stroke={TONE.green} stroke-width="4" />
      <Halo x={x + 14 + (props.labelDx ?? 0)} y={y - 12 + (props.labelDy ?? 0)} text={props.text} fill={TONE.green} bold size={14} />
    </g>
  );
}

function Zones({ show }: { show: Set<Zone> }) {
  return (
    <>
      {show.has('elastic') && <ZoneBracket from={{ q: 2, p: 19.8 }} to={{ q: 94, p: 10.6 }} text={ZONE_TEXT.elastic} tone="navy" />}
      {show.has('inelastic') && <ZoneBracket from={{ q: 106, p: 9.4 }} to={{ q: 196, p: 0.4 }} text={ZONE_TEXT.inelastic} tone="red" dashed labelDx={-36} />}
      {show.has('unitary') && <MidMark text={ZONE_TEXT.unitary} />}
    </>
  );
}

/** Learn it: a straight-line demand curve with its elastic, unitary and inelastic sections. */
function LearnDiagram() {
  return (
    <Diagram xMax={QMAX} yMax={PMAX} xLabel="Quantity" yLabel="Price ($)" title="Straight-line demand curve with an elastic upper half, unitary midpoint and inelastic lower half">
      <Guide at={MID} />
      <Curve line={DEMAND} label="D" tone="ink" labelOffset={{ dx: -26, dy: -10 }} />
      <Zones show={new Set<Zone>(['elastic', 'unitary', 'inelastic'])} />
      <Dot at={MID} tone="green" r={6} label="Midpoint" labelDx={-78} labelDy={22} />
    </Diagram>
  );
}

function Try(props: TryProps) {
  const data = props.content.try as unknown as TryContent;
  const [mode, setMode] = useState<'explore' | 'mystery'>('explore');
  return (
    <div class="stack">
      <div class="mode-switch" role="group" aria-label="Choose a game">
        <button aria-pressed={mode === 'explore'} onClick={() => setMode('explore')}>Explore the curve</button>
        <button aria-pressed={mode === 'mystery'} onClick={() => setMode('mystery')}>Mystery: hidden points</button>
      </div>
      {mode === 'explore' ? <Explore {...props} /> : <Mystery levels={data.mysteryLevels} curves={data.curves} help={data.mysteryHelp} onGoal={props.onGoal} stamps={props.stamps} teacher={props.teacher} />}
    </div>
  );
}

function Explore({ content, onComplete }: TryProps) {
  const data = content.try as unknown as TryContent;
  const [price, setPriceState] = useState(16);
  const priceRef = useRef(16);
  const doneRef = useRef<Set<ChallengeId>>(new Set());
  const [last, setLast] = useState<{ from: number; to: number } | null>(null);
  const [done, setDone] = useState<Set<ChallengeId>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [announce, setAnnounce] = useState('');
  const seen = useRef({ above: true, below: false });
  const completed = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  // Workaround: the shared Handle sets "tabIndex", which SVG elements ignore. Make it keyboard-focusable.
  useEffect(() => {
    root.current?.querySelectorAll('g.handle').forEach((g) => g.setAttribute('tabindex', '0'));
  });

  const q = round(quantityAt(DEMAND, price), 2);
  const tr = totalRevenue(price, q);
  const pedNow = pedAtPoint(DEMAND, price);
  const type = classifyPed(pedNow);
  const check = ibCheck(price);

  const shown = new Set<Zone>();
  if (showAll || done.has('cut-raises')) shown.add('elastic');
  if (showAll || done.has('unitary')) shown.add('unitary');
  if (showAll || done.has('cut-lowers')) shown.add('inelastic');

  const describe = (p: number) => {
    const qq = quantityAt(DEMAND, p);
    const v = pedAtPoint(DEMAND, p);
    return `Price ${money(p)}, quantity ${qq}, total revenue ${cash(totalRevenue(p, qq))}, PED ${pedText(v)}, ${classifyPed(v)}.`;
  };

  const setPrice = (raw: number, speak = false) => {
    const from = priceRef.current;
    const next = snapPrice(raw);
    if (next === from) return;
    priceRef.current = next;
    const found = challengesForMove(from, next, seen.current.above, seen.current.below);
    if (next > MID.p) seen.current.above = true;
    if (next < MID.p) seen.current.below = true;
    setPriceState(next);
    setLast({ from, to: next });
    let msg = speak ? describe(next) : '';
    const fresh = found.filter((id) => !doneRef.current.has(id));
    if (fresh.length) {
      const n = new Set(doneRef.current);
      fresh.forEach((id) => n.add(id));
      doneRef.current = n;
      setDone(n);
      play('correct');
      msg += ` Challenge complete: ${fresh.map((id) => data.challenges.find((c) => c.id === id)?.text.replace(/\*/g, '')).join(' ')}`;
      if (n.size >= 3 && !completed.current) {
        completed.current = true;
        onComplete();
      }
    }
    if (msg) setAnnounce(msg.trim());
  };

  const onDrag = (pt: Pt) => {
    const dq = pt.q - q, dp = pt.p - price;
    if (Math.abs(dq) < 1e-9) setPrice(pt.p);
    else if (Math.abs(dp) < 1e-9) setPrice(priceAt(DEMAND, pt.q));
    else setPrice(priceFromDrag(pt));
  };

  const lastLine = (() => {
    if (!last) return null;
    const q1 = quantityAt(DEMAND, last.from), q2 = quantityAt(DEMAND, last.to);
    const tr1 = totalRevenue(last.from, q1), tr2 = totalRevenue(last.to, q2);
    const verb = last.to < last.from ? 'cut' : 'raised';
    const trWord = tr2 > tr1 + 1e-9 ? 'rose' : tr2 < tr1 - 1e-9 ? 'fell' : 'stayed the same';
    return `You ${verb} the price from ${money(last.from)} to ${money(last.to)}. Total revenue ${trWord}: ${cash(tr1)} to ${cash(tr2)}.`;
  })();

  const rows = schedule();
  const trPts = trCurve(DEMAND, 40);

  return (
    <div class="stack" ref={root}>
      <LiveRegion text={announce} />
      <div class="play">
        <div class="stack">
          <h3 style={{ margin: 0 }}>Demand for bike rentals <HlBadge /></h3>
          <Diagram
            xMax={QMAX}
            yMax={PMAX}
            xLabel={Q_LABEL}
            yLabel="Price ($)"
            title="Demand curve for bike rentals with total revenue shaded"
            description={`The point is at a price of ${money(price)} and a quantity of ${q}. Total revenue is ${cash(tr)}. PED here is ${pedText(pedNow)}, ${type}.`}
            xTicks={X_TICKS}
            yTicks={[0, 4, 8, 12, 16, 20]}
          >
            <Area
              points={[{ q: 0, p: 0 }, { q, p: 0 }, { q, p: price }, { q: 0, p: price }]}
              pattern="hatch"
              tone="grey"
              label={`TR = ${cash(tr)}`}
              labelAt={{ q: q / 2, p: price / 2 }}
            />
            <Guide at={{ q, p: price }} />
            <Curve line={DEMAND} label="D" tone="ink" labelOffset={{ dx: -26, dy: -10 }} />
            <Zones show={shown} />
            <Handle
              at={{ q, p: price }}
              onMove={onDrag}
              label="Point on the demand curve. Up and down arrows change the price by $0.50."
              valueText={describe(price)}
              step={{ q: 5, p: 0.5 }}
            />
          </Diagram>
          <Diagram
            xMax={QMAX}
            yMax={1200}
            height={320}
            xLabel={Q_LABEL}
            yLabel="Total revenue ($)"
            title="Total revenue curve for bike rentals"
            description={`Total revenue at a quantity of ${q} is ${cash(tr)}. Total revenue is greatest, $1000, at a quantity of 100, where |PED| = 1.`}
            xTicks={X_TICKS}
            yTicks={[0, 200, 400, 600, 800, 1000]}
          >
            <Guide at={{ q, p: tr }} toY={false} tone="red" />
            <Guide at={{ q: MID.q, p: 1000 }} toY={false} />
            <Curve points={trPts} label="TR" tone="navy" labelOffset={{ dx: -30, dy: -8 }} />
            {shown.has('elastic') && <Label at={{ q: 30, p: 110 }} text="TR rises as P falls" tone="navy" size={13} bold />}
            {shown.has('inelastic') && <Label at={{ q: 180, p: 110 }} text="TR falls as P falls" tone="red" size={13} bold anchor="end" />}
            <Dot at={{ q: MID.q, p: 1000 }} tone="green" r={6} />
            <Label at={{ q: MID.q, p: 1000 }} text="TR is greatest where |PED| = 1" tone="green" anchor="middle" dy={-14} bold size={14} />
            <Dot at={{ q, p: tr }} tone="red" r={7} />
          </Diagram>
          <div class="legend" aria-hidden="true">
            <span><span class="swatch" style={{ background: 'repeating-linear-gradient(45deg,#dde1e8 0 4px,#5b6475 4px 5px)' }} />Total revenue (P × Q)</span>
            <span><span class="swatch" style={{ borderTop: `3px solid ${TONE.navy}`, background: 'none', border: 'none', height: 0 }} />Solid bracket: elastic</span>
            <span><span class="swatch" style={{ borderTop: `3px dashed ${TONE.red}`, background: 'none', border: 'none', height: 0 }} />Dashed bracket: inelastic</span>
          </div>
        </div>

        <div class="stack">
          <div class="panel stack">
            <h3>Your rental price</h3>
            <div class="row" role="group" aria-label="Change the price">
              <button class="btn btn-secondary btn-sm" aria-label="Cut the price by $1" disabled={price <= 1} onClick={() => setPrice(price - 1, true)}>− $1</button>
              <button class="btn btn-secondary btn-sm" aria-label="Cut the price by 50 cents" disabled={price <= 1} onClick={() => setPrice(price - 0.5, true)}>− $0.50</button>
              <button class="btn btn-secondary btn-sm" aria-label="Raise the price by 50 cents" disabled={price >= 19} onClick={() => setPrice(price + 0.5, true)}>+ $0.50</button>
              <button class="btn btn-secondary btn-sm" aria-label="Raise the price by $1" disabled={price >= 19} onClick={() => setPrice(price + 1, true)}>+ $1</button>
            </div>
            <p class="small muted" style={{ margin: 0 }}>Or drag the red point along the curve, or focus it and use the arrow keys.</p>
            <div>
              <div class="stat"><span>Price</span><b>{money(price)}</b></div>
              <div class="stat"><span>Quantity</span><b>{q} rentals</b></div>
              <div class="stat"><span>Total revenue (P × Q)</span><b>{cash(tr)}</b></div>
              <div class="stat"><span>PED at this point</span><b>{pedText(pedNow)} ({type})</b></div>
            </div>
            <div class="callout">
              <p style={{ margin: 0 }}>
                <strong>Check with the IB formula</strong> (a ${check.p2 < check.p1 ? '1 cut' : '1 rise'} from this point):
              </p>
              <p class="small" style={{ margin: '4px 0 0' }}>
                % change in price = ({money(check.p2)} − {money(check.p1)}) ÷ {money(check.p1)} × 100 = {signed(check.pctP)}%
                <br />
                % change in quantity = ({check.q2} − {check.q1}) ÷ {check.q1} × 100 = {signed(check.pctQ)}%
                <br />
                PED = {signed(check.pctQ)} ÷ {signed(check.pctP)} = <strong>{pedText(check.ped)}</strong>.{' '}
                {Math.abs(check.ped - pedNow) < 1e-9 ? 'It matches PED at this point.' : ''}
              </p>
            </div>
            {lastLine && <p role="status" style={{ margin: 0 }}>{lastLine}</p>}
          </div>

          <section class="panel stack" aria-labelledby="challenges-h">
            <h3 id="challenges-h">Discovery challenges ({done.size} of {data.challenges.length})</h3>
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
            <p class="small muted" style={{ margin: 0 }}>Each challenge you finish reveals a labelled section of the demand curve.</p>
            <div>
              <button class="btn btn-quiet btn-sm" aria-pressed={showAll} onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Hide' : 'Show'} all three sections
              </button>
            </div>
          </section>

          <section class="panel stack" aria-labelledby="schedule-h">
            <h3 id="schedule-h">Demand schedule</h3>
            <div class="table-scroll">
              <table class="table">
                <caption class="muted small" style={{ textAlign: 'left', paddingBottom: 4 }}>Riverside Bikes (invented numbers)</caption>
                <thead>
                  <tr>
                    <th scope="col">Price ($)</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Total revenue ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const here = r.p === price;
                    return (
                      <tr key={r.p} style={here ? { fontWeight: 700, background: 'var(--navy-50)' } : undefined}>
                        <td>{r.p}{here && <span> (you are here)</span>}</td>
                        <td>{r.q}</td>
                        <td>{r.tr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p class="small muted" style={{ margin: 0 }}>Every $2 cut adds 20 rentals, all the way down the curve.</p>
          </section>
        </div>
      </div>

      <section class="panel stack" aria-labelledby="why-h">
        <h3 id="why-h">{data.why.title} <HlBadge /></h3>
        <Md text={data.why.text} />
        <p style={{ margin: 0 }}>
          <strong>At your point:</strong> a $1 change is {Math.abs(check.pctP).toFixed(2)}% of the price, and the 10 rentals that follow are{' '}
          {Math.abs(check.pctQ).toFixed(2)}% of the quantity. So PED = {pedText(check.ped)}: demand is {zoneAt(price) === 'unitary' ? 'unitary' : zoneAt(price)} here.
        </p>
      </section>

      <SpecialCurves data={data.special} />
    </div>
  );
}

/** SL content (2.5 diagrams): demand curves with the same PED at every point. */
function SpecialCurves({ data }: { data: TryContent['special'] }) {
  const small = { width: 380, height: 320 };
  const hyper = unitaryCurve(200, 9.5, 95, 40);
  return (
    <section class="panel stack" aria-labelledby="special-h">
      <h3 id="special-h">{data.title}</h3>
      <Md text={data.note} />
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <figure style={{ margin: 0 }}>
          <h4 style={{ margin: '0 0 4px' }}>{data.elastic.title}</h4>
          <Diagram {...small} xMax={100} yMax={22} xLabel="Quantity" yLabel="Price ($)" title="Perfectly elastic demand: a horizontal line">
            <Curve points={[{ q: 0, p: 10 }, { q: 92, p: 10 }]} tone="navy" />
            <Label at={{ q: 92, p: 10 }} text="D (|PED| = ∞)" anchor="end" dy={-12} bold tone="navy" size={16} />
          </Diagram>
          <figcaption class="small muted"><Md text={data.elastic.caption} inline /></figcaption>
        </figure>
        <figure style={{ margin: 0 }}>
          <h4 style={{ margin: '0 0 4px' }}>{data.inelastic.title}</h4>
          <Diagram {...small} xMax={100} yMax={22} xLabel="Quantity" yLabel="Price ($)" title="Perfectly inelastic demand: a vertical line">
            <Curve points={[{ q: 50, p: 0 }, { q: 50, p: 20 }]} tone="red" />
            <Label at={{ q: 50, p: 20 }} text="D (PED = 0)" dx={8} dy={6} bold tone="red" size={16} />
          </Diagram>
          <figcaption class="small muted"><Md text={data.inelastic.caption} inline /></figcaption>
        </figure>
        <figure style={{ margin: 0 }}>
          <h4 style={{ margin: '0 0 4px' }}>{data.unitary.title}</h4>
          <Diagram {...small} xMax={100} yMax={22} xLabel="Quantity" yLabel="Price ($)" title="Unitary elastic demand: a rectangular hyperbola. P × Q is $200 at A and at B." xTicks={[0, 20, 40]} yTicks={[0, 5, 10]}>
            <Area points={[{ q: 0, p: 0 }, { q: 20, p: 0 }, { q: 20, p: 10 }, { q: 0, p: 10 }]} pattern="hatch" tone="navy" />
            <Area points={[{ q: 0, p: 0 }, { q: 40, p: 0 }, { q: 40, p: 5 }, { q: 0, p: 5 }]} pattern="dots" tone="green" opacity={0.75} />
            <Curve points={hyper} tone="ink" />
            <Label at={{ q: 95, p: 200 / 95 }} text="D (|PED| = 1)" anchor="end" dy={-14} bold size={16} />
            <Dot at={{ q: 20, p: 10 }} label="A" />
            <Dot at={{ q: 40, p: 5 }} label="B" />
          </Diagram>
          <figcaption class="small muted"><Md text={data.unitary.caption} inline /></figcaption>
        </figure>
      </div>
    </section>
  );
}

export { Try, LearnDiagram };
