/**
 * Mystery mode: PED and total revenue are hidden. A clue describes a hidden point on the
 * demand curve; the student works out PED and TR from the price and quantity, moves the
 * point there and checks.
 *
 * A wrong guess gives no direction for free: the student first works out PED or TR at their
 * own point. Only a right value tells them whether to go higher or lower, so the game cannot
 * be won by "higher or lower" guessing.
 *
 * Level 1: find 3 hidden points without using "Show me". Level 2: harder clues and 4 checks
 * per case. Level 3: a new, steeper curve and 3 checks per case.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { priceAt, Pt, quantityAt, round, totalRevenue } from '../../econ/calc';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon } from '../../shared/design/components';
import { Curve, Diagram, Dot, Guide, Handle } from '../../shared/diagrams/Diagram';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import { celebrate, celebrateAt } from '../../shared/fun/celebrate';
import { play } from '../../shared/fun/sound';
import {
  ibCheck, MAIN_CURVE, MysteryCurve, MysteryRule, mysteryAnswers, mysteryAsk, mysteryDirection, mysteryHolds, mysteryTypedRight, mysteryValue,
  priceFromDrag, SKATE_CURVE, snapOn, zoneAt,
} from './model';

/** Hidden points to find for each level's stamp. */
export const MYSTERY_GOAL = 3;
const STAMP_NAMES = ['Point Hunter', 'Sharp Shooter', 'Curve Master'];

export interface Clue {
  id: string;
  clue: string;
  rule: MysteryRule;
}

export interface MysteryLevel {
  title: string;
  blurb: string;
  /** Checks allowed per case (0 = no limit). */
  checks: number;
  curve: 'main' | 'skate';
  clues: Clue[];
}

const CURVES: Record<MysteryLevel['curve'], MysteryCurve & { qMax: number; pAxis: number; xTicks: number[]; yTicks: number[]; unit: string }> = {
  main: { ...MAIN_CURVE, qMax: 210, pAxis: 22, xTicks: [40, 80, 120, 160, 200], yTicks: [4, 8, 12, 16, 20], unit: 'rentals' },
  skate: { ...SKATE_CURVE, qMax: 250, pAxis: 18, xTicks: [50, 100, 150, 200], yTicks: [4, 8, 12, 16], unit: 'rentals' },
};

const money = (n: number) => (Number.isInteger(round(n, 2)) ? `$${round(n, 2).toLocaleString('en-US')}` : `$${n.toFixed(2)}`);
const pedText = (v: number) => (v < 0 ? '−' : '') + Math.abs(round(v, 2)).toString();

export function Mystery(props: {
  levels: MysteryLevel[];
  curves: Record<string, { name: string; perDollar: string }>;
  help: string;
  onGoal: (level: number) => void;
  stamps: number;
  teacher: boolean;
}) {
  const [levelNo, setLevelNo] = useState(1);
  const level = props.levels[levelNo - 1];
  const curve = CURVES[level.curve];
  const line = curve.line;
  const [index, setIndex] = useState(0);
  const [price, setPriceState] = useState(curve.pMax - 1);
  const [result, setResult] = useState<null | { ok: boolean; text: string }>(null);
  /** Points found that count for the stamp, per level. */
  const [solved, setSolved] = useState<Record<number, Set<string>>>({});
  const [checks, setChecks] = useState(0);
  /** After a wrong guess: the price the student must work out a value at, and their attempts. */
  const [ask, setAsk] = useState<null | { at: number; tries: number; done: boolean }>(null);
  const [draft, setDraft] = useState('');
  /** "Show me" was used in this case, so finding it does not count for the stamp. */
  const [helped, setHelped] = useState(false);
  const [announce, setAnnounce] = useState('');
  const checkRef = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelectorAll('g.handle').forEach((g) => g.setAttribute('tabindex', '0'));
  });

  const clue = level.clues[index % level.clues.length];
  const q = round(quantityAt(line, price), 2);
  const found = result?.ok === true;
  const outOfChecks = level.checks > 0 && checks >= level.checks && !found;
  const levelSolved = solved[levelNo] ?? new Set<string>();
  const askWhat = mysteryAsk(clue.rule);

  const resetCase = (startHigh: boolean) => {
    setResult(null);
    setChecks(0);
    setAsk(null);
    setDraft('');
    setHelped(false);
    setPriceState(startHigh ? curve.pMax - 1 : curve.pMin + 1);
  };

  const pickLevel = (n: number) => {
    setLevelNo(n);
    setIndex(0);
    const c = CURVES[props.levels[n - 1].curve];
    setResult(null);
    setChecks(0);
    setAsk(null);
    setDraft('');
    setHelped(false);
    setPriceState(c.pMax - 1);
    setAnnounce(`Level ${n}: ${props.levels[n - 1].title}.`);
  };

  const setPrice = (raw: number) => {
    if (found || outOfChecks) return;
    const p = snapOn(curve, raw);
    setPriceState(p);
    if (result && !ask) setResult(null);
  };
  const onDrag = (pt: Pt) => {
    const dq = pt.q - q, dp = pt.p - price;
    if (Math.abs(dq) < 1e-9) setPrice(pt.p);
    else if (Math.abs(dp) < 1e-9) setPrice(priceAt(line, pt.q));
    else setPrice(priceFromDrag(pt, line));
  };
  /** The slider runs along the quantity axis, so moving it right moves the point right (down the curve). */
  const setQty = (qty: number) => setPrice(priceAt(line, qty));

  const check = () => {
    if (found || outOfChecks) return;
    const used = checks + 1;
    setChecks(used);
    setAsk(null);
    setDraft('');
    if (mysteryHolds(clue.rule, price, line)) {
      play('correct');
      celebrateAt(checkRef.current, 'small');
      const counts = !helped;
      setResult({
        ok: true,
        text: `Found it. At ${money(price)}, ${q} ${curve.unit}: PED = ${pedText(ibCheck(price, line).ped)} and TR = ${money(totalRevenue(price, q))}.` +
          (counts ? '' : ' You used Show me in this case, so it does not count towards the stamp.'),
      });
      setAnnounce('You found the hidden point.');
      if (counts && !levelSolved.has(clue.id)) {
        const n = new Set(levelSolved);
        n.add(clue.id);
        setSolved({ ...solved, [levelNo]: n });
        if (n.size === MYSTERY_GOAL) {
          setTimeout(() => {
            play('win');
            celebrate({ size: 'big' });
            props.onGoal(levelNo);
          }, 500);
        }
      }
      return;
    }
    play('wrong');
    if (level.checks > 0 && used >= level.checks) {
      const ans = mysteryAnswers(clue.rule, curve)[0];
      const text = `Case closed. That was your last check. The hidden point was at ${money(ans)}.`;
      setResult({ ok: false, text });
      setAnnounce(text);
      return;
    }
    setAsk({ at: price, tries: 0, done: false });
    const what = askWhat === 'ped' ? 'PED' : 'total revenue';
    const text = `Not here. Work out ${what} at ${money(price)} to find out which way to go.`;
    setResult({ ok: false, text });
    setAnnounce(text);
  };

  const direction = (at: number) => {
    const dir = mysteryDirection(clue.rule, at, curve);
    return dir ? `Try a ${dir} price.` : '';
  };

  const checkValue = () => {
    if (!ask || ask.done) return;
    const v = Number(draft.trim().replace('−', '-').replace(/[$,]/g, ''));
    if (draft.trim() === '' || !Number.isFinite(v)) return;
    if (mysteryTypedRight(clue.rule, ask.at, v, line)) {
      play('correct');
      const val = mysteryValue(clue.rule, ask.at, line);
      const shown = askWhat === 'ped' ? `PED = ${pedText(val)}` : `TR = ${money(val)}`;
      const text = `Right: ${shown} at ${money(ask.at)}, so demand there is ${zoneAt(ask.at, line)}. ${direction(ask.at)}`;
      setAsk({ ...ask, done: true });
      setResult({ ok: false, text });
      setAnnounce(text);
    } else {
      play('wrong');
      setAsk({ ...ask, tries: ask.tries + 1 });
      setAnnounce('Not quite. Check your working and try again.');
    }
  };

  const showMe = () => {
    if (!ask) return;
    const c = ibCheck(ask.at, line);
    const qa = quantityAt(line, ask.at);
    const working = askWhat === 'ped'
      ? `A $1 cut from ${money(ask.at)} to ${money(c.p2)} changes price by ${round(c.pctP, 2)}% and quantity from ${round(c.q1, 2)} to ${round(c.q2, 2)} (${round(c.pctQ, 2)}%). PED = ${pedText(c.ped)}.`
      : `TR = P × Q = ${money(ask.at)} × ${round(qa, 2)} = ${money(totalRevenue(ask.at, qa))}.`;
    const text = levelNo === 1 ? `${working} ${direction(ask.at)}` : `${working} Use this to decide which way to go.`;
    setHelped(true);
    setAsk({ ...ask, done: true });
    setResult({ ok: false, text });
    setAnnounce(text);
  };

  const next = () => {
    setIndex((i) => i + 1);
    resetCase(index % 2 === 1);
    play('tap');
  };

  const info = props.curves[level.curve];

  return (
    <div class="stack" ref={root}>
      <LiveRegion text={announce} />
      <LevelPicker
        levels={props.levels.map((l) => ({ title: l.title, blurb: l.blurb }))}
        level={levelNo}
        onPick={pickLevel}
        stamps={props.stamps}
        teacher={props.teacher}
        icon="target"
        stampNames={STAMP_NAMES}
      />
      <details class="callout">
        <summary><strong>How mystery mode works</strong></summary>
        <Md text={props.help} />
      </details>
      <div class="play play-card-first">
        <div class="stack">
          <Diagram
            xMax={curve.qMax}
            yMax={curve.pAxis}
            xLabel={`Quantity (${curve.unit} per day)`}
            yLabel="Price ($)"
            title={`Mystery: find the hidden point on the demand curve for ${info.name}`}
            description={`The point is at a price of ${money(price)} and ${q} ${curve.unit}. PED and total revenue are hidden.`}
            xTicks={curve.xTicks}
            yTicks={curve.yTicks}
          >
            <Curve line={line} label="D" tone="ink" labelOffset={{ dx: -26, dy: -10 }} />
            <Guide at={{ q, p: price }} xText={String(q)} yText={money(price)} />
            {found && <Dot at={{ q, p: price }} tone="green" r={11} hollow />}
            <Handle
              at={{ q, p: price }}
              onMove={onDrag}
              label="Point on the demand curve. Up and down arrows change the price by $0.50."
              valueText={`Price ${money(price)}, quantity ${q} ${curve.unit}.`}
              step={{ q: 5, p: 0.5 }}
            />
          </Diagram>
          <div class="row" style={{ flexWrap: 'nowrap' }}>
            <button class="btn btn-secondary btn-sm" aria-label="Move left: raise the price by 50 cents" disabled={found || outOfChecks} onClick={() => setPrice(price + 0.5)}>◀</button>
            <label class="sr-only" for="myst-qty">Quantity on the demand curve</label>
            <input
              id="myst-qty"
              type="range"
              min={round(quantityAt(line, curve.pMax), 2)}
              max={round(quantityAt(line, curve.pMin), 2)}
              step={round(quantityAt(line, 0) - quantityAt(line, 0.5), 2)}
              value={q}
              disabled={found || outOfChecks}
              aria-valuetext={`Price ${money(price)}, ${q} ${curve.unit}`}
              onInput={(e) => setQty(Number((e.target as HTMLInputElement).value))}
            />
            <button class="btn btn-secondary btn-sm" aria-label="Move right: lower the price by 50 cents" disabled={found || outOfChecks} onClick={() => setPrice(price - 0.5)}>▶</button>
          </div>
          <p class="small muted" style={{ margin: 0 }}>The slider moves the point along the curve. Right means a lower price and more {curve.unit}.</p>
        </div>

        <section class="event-card stack case-file" aria-labelledby="case-h">
          <p class="small muted" style={{ margin: 0 }}>
            Level {levelNo}, case {(index % level.clues.length) + 1} of {level.clues.length}. Points found: {levelSolved.size} of {MYSTERY_GOAL} for the {STAMP_NAMES[levelNo - 1]} stamp.
            {level.checks > 0 && ` Checks left in this case: ${Math.max(0, level.checks - checks)}.`}
          </p>
          <h3 id="case-h">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style={{ verticalAlign: '-4px', marginRight: 6 }}>
              <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.5" />
              <path d="M15 15l6 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            The hidden point: {info.name}
          </h3>
          <div class="clue"><Md text={clue.clue} /></div>
          <div class="stat"><span>Price (P)</span><b>{money(price)}</b></div>
          <div class="stat"><span>Quantity (Q)</span><b>{q} {curve.unit}</b></div>
          <div class="stat"><span>Total revenue</span><b>{found ? money(totalRevenue(price, q)) : 'Hidden'}</b></div>
          <div class="stat"><span>PED</span><b>{found ? pedText(ibCheck(price, line).ped) : 'Hidden'}</b></div>
          <p class="small muted" style={{ margin: 0 }}>{info.perDollar}</p>
          {!found && !outOfChecks && (
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
          {ask && !ask.done && !found && !outOfChecks && (
            <div class="stack" role="group" aria-labelledby="work-h">
              <p id="work-h" style={{ margin: 0 }}>
                <strong>{askWhat === 'ped' ? `PED at ${money(ask.at)} (for a $1 price cut)` : `Total revenue at ${money(ask.at)}`}</strong>
              </p>
              <div class="row">
                <label for="myst-val">{askWhat === 'ped' ? 'PED =' : 'TR = $'}</label>
                <input
                  id="myst-val"
                  type="text"
                  inputMode="decimal"
                  size={8}
                  value={draft}
                  onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => e.key === 'Enter' && checkValue()}
                />
                <button class="btn btn-sm" onClick={checkValue}>Check my working</button>
                {ask.tries >= 2 && <button class="btn btn-quiet btn-sm" onClick={showMe}>Show me</button>}
              </div>
              {ask.tries > 0 && <p class="small" style={{ margin: 0 }}>Not quite. {askWhat === 'ped' ? 'PED = % change in quantity ÷ % change in price.' : 'TR = price × quantity.'}</p>}
            </div>
          )}
          {(found || outOfChecks) && <div><button class="btn" onClick={next}>Next case</button></div>}
        </section>
      </div>
    </div>
  );
}
