/**
 * Mystery mode: PED and total revenue are hidden. A clue describes a hidden point on the
 * demand curve; the student works out PED and TR from the price and quantity, moves the
 * point there and checks. Finding 3 hidden points earns the Point Hunter stamp.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { priceAt, Pt, quantityAt, round, totalRevenue } from '../../econ/calc';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon } from '../../shared/design/components';
import { Curve, Diagram, Dot, Guide, Handle } from '../../shared/diagrams/Diagram';
import { celebrate, celebrateAt } from '../../shared/fun/celebrate';
import { play } from '../../shared/fun/sound';
import { DEMAND, ibCheck, MysteryRule, mysteryDirection, mysteryHolds, priceFromDrag, snapPrice, zoneAt } from './model';

const QMAX = 210;
const PMAX = 22;
/** Hidden points to find for the Point Hunter stamp. */
export const MYSTERY_GOAL = 3;

export interface Clue {
  id: string;
  clue: string;
  rule: MysteryRule;
}

const money = (n: number) => (Number.isInteger(round(n, 2)) ? `$${round(n, 2).toLocaleString('en-US')}` : `$${n.toFixed(2)}`);
const pedText = (v: number) => (v < 0 ? '−' : '') + Math.abs(round(v, 2)).toString();

export function Mystery(props: { clues: Clue[]; help: string; onGoal: () => void }) {
  const [index, setIndex] = useState(0);
  const [price, setPriceState] = useState(18);
  const [result, setResult] = useState<null | { ok: boolean; text: string }>(null);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [tries, setTries] = useState(0);
  const [announce, setAnnounce] = useState('');
  const checkRef = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelectorAll('g.handle').forEach((g) => g.setAttribute('tabindex', '0'));
  });

  const clue = props.clues[index % props.clues.length];
  const q = round(quantityAt(DEMAND, price), 2);
  const found = result?.ok === true;

  const setPrice = (raw: number) => {
    if (found) return;
    const p = snapPrice(raw);
    setPriceState(p);
    if (result) setResult(null);
  };
  const onDrag = (pt: Pt) => {
    const dq = pt.q - q, dp = pt.p - price;
    if (Math.abs(dq) < 1e-9) setPrice(pt.p);
    else if (Math.abs(dp) < 1e-9) setPrice(priceAt(DEMAND, pt.q));
    else setPrice(priceFromDrag(pt));
  };

  const check = () => {
    setTries((t) => t + 1);
    if (mysteryHolds(clue.rule, price)) {
      play('correct');
      celebrateAt(checkRef.current, 'small');
      setResult({ ok: true, text: `Found it. At ${money(price)}, ${q} rentals: PED = ${pedText(ibCheck(price).ped)} and TR = ${money(totalRevenue(price, q))}.` });
      setAnnounce('You found the hidden point.');
      setSolved((s) => {
        if (s.has(clue.id)) return s;
        const n = new Set(s);
        n.add(clue.id);
        if (n.size === MYSTERY_GOAL) {
          setTimeout(() => {
            play('win');
            celebrate({ size: 'big' });
            props.onGoal();
          }, 500);
        }
        return n;
      });
      return;
    }
    play('wrong');
    const dir = mysteryDirection(clue.rule, price);
    const c = ibCheck(price);
    const tr = totalRevenue(price, q);
    const facts = `At ${money(price)}: PED = ${pedText(c.ped)}, TR = ${money(tr)}, demand is ${zoneAt(price)}.`;
    const text = `Not here. ${tries >= 1 ? facts + ' ' : ''}Try a ${dir} price.`;
    setResult({ ok: false, text });
    setAnnounce(text);
  };

  const next = () => {
    setIndex((i) => i + 1);
    setResult(null);
    setTries(0);
    setPriceState(index % 2 ? 18 : 2);
    play('tap');
  };

  return (
    <div class="stack" ref={root}>
      <LiveRegion text={announce} />
      <div class="callout"><Md text={props.help} /></div>
      <div class="play">
        <div class="stack">
          <Diagram
            xMax={QMAX}
            yMax={PMAX}
            xLabel="Quantity (rentals per day)"
            yLabel="Price ($)"
            title="Mystery: find the hidden point on the demand curve"
            description={`The point is at a price of ${money(price)} and ${q} rentals. PED and total revenue are hidden.`}
            xTicks={[40, 80, 120, 160, 200]}
            yTicks={[4, 8, 12, 16, 20]}
          >
            <Curve line={DEMAND} label="D" tone="ink" labelOffset={{ dx: -26, dy: -10 }} />
            <Guide at={{ q, p: price }} xText={String(q)} yText={money(price)} />
            {found && <Dot at={{ q, p: price }} tone="green" r={11} hollow />}
            <Handle
              at={{ q, p: price }}
              onMove={onDrag}
              label="Point on the demand curve. Up and down arrows change the price by $0.50."
              valueText={`Price ${money(price)}, quantity ${q} rentals.`}
              step={{ q: 5, p: 0.5 }}
            />
          </Diagram>
          <div class="row" style={{ flexWrap: 'nowrap' }}>
            <button class="btn btn-secondary btn-sm" aria-label="Lower the price by 50 cents" disabled={found} onClick={() => setPrice(price - 0.5)}>−</button>
            <label class="sr-only" for="myst-price">Price</label>
            <input id="myst-price" type="range" min={1} max={19} step={0.5} value={price} disabled={found} aria-valuetext={money(price)} onInput={(e) => setPrice(Number((e.target as HTMLInputElement).value))} />
            <button class="btn btn-secondary btn-sm" aria-label="Raise the price by 50 cents" disabled={found} onClick={() => setPrice(price + 0.5)}>+</button>
          </div>
        </div>

        <section class="event-card stack case-file" aria-labelledby="case-h">
          <p class="small muted" style={{ margin: 0 }}>
            Case {(index % props.clues.length) + 1} of {props.clues.length}. Points found: {solved.size} of {MYSTERY_GOAL} for the Point Hunter stamp.
          </p>
          <h3 id="case-h">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style={{ verticalAlign: '-4px', marginRight: 6 }}>
              <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.5" />
              <path d="M15 15l6 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            The hidden point
          </h3>
          <div class="clue"><Md text={clue.clue} /></div>
          <div class="stat"><span>Price (P)</span><b>{money(price)}</b></div>
          <div class="stat"><span>Quantity (Q)</span><b>{q} rentals</b></div>
          <div class="stat"><span>Total revenue</span><b>{found ? money(totalRevenue(price, q)) : 'Hidden'}</b></div>
          <div class="stat"><span>PED</span><b>{found ? pedText(ibCheck(price).ped) : 'Hidden'}</b></div>
          <p class="small muted" style={{ margin: 0 }}>Every $1 cut in price adds 10 rentals.</p>
          {!found && (
            <div><button ref={checkRef} class="btn" onClick={check}>Is this the hidden point?</button></div>
          )}
          {result && (
            <div class={`callout ${result.ok ? 'callout-ok' : 'callout-try'}`} role="status">
              <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                {result.ok ? <MarkIcon /> : <CrossIcon />}
                <span>{result.text}</span>
              </p>
            </div>
          )}
          {found && <div><button class="btn" onClick={next}>Next case</button></div>}
        </section>
      </div>
    </div>
  );
}
