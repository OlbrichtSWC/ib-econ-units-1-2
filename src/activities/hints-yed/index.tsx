/**
 * HINTS Market (2.5): determinants of PED, YED and Engel curves, and PED and YED calculations.
 *
 * Level 1: goods slide down the market stall chute. Choose the HINTS determinant, then the elastic or inelastic crate.
 * Level 2: raise a household's income. The basket changes and an Engel curve draws itself for each good. Classify by YED.
 * Level 3: the calculator corner. Work out PED and YED from data, then say what the answer means. One round is HL.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, HlBadge, LiveRegion, MarkIcon, StepNo } from '../../shared/design/components';
import { Diagram, TONE, useDiagram } from '../../shared/diagrams/Diagram';
import { SpecDiagram } from '../../shared/diagrams/SpecDiagram';
import type { DiagramSpec } from '../../shared/diagrams/SpecDiagram';
import type { TryProps } from '../../shared/activity/types';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import type { LevelInfo } from '../../shared/activity/LevelPicker';
import { parseNumber } from '../../shared/activity/CheckIt';
import { celebrate } from '../../shared/fun/celebrate';
import { play } from '../../shared/fun/sound';
import { reducedMotion } from '../../shared/fun/motion';
import { shuffled } from '../island-economy/model';
import {
  Calc, calcAnswer, calcClass, CALC_GOAL, calcWon, Cls, closeEnough, Det, DETS, engelPoints, LAB_GOAL, labWon, pctChange, PED_KINDS, PedKind,
  round2, slips, STALL_GOAL, stallWon, YED_KINDS, YedKind, yed,
} from './model';
import './market.css';

const STAMP_NAMES = ['Stall Sorter', 'Income Explorer', 'Elasticity Analyst'];

interface Good { id: string; icon: string; name: string; clue: string; det: Det; ped: PedKind; why: string }
interface BasketGood { id: string; icon: string; name: string; unit: string; qty: number[]; kind: YedKind; why: string }
interface Basket { id: string; name: string; goods: BasketGood[] }

interface TryContent {
  levels: LevelInfo[];
  detNames: Record<Det, string>;
  detAbout: Record<Det, string>;
  detRules: Record<Det, string>;
  goods: Good[];
  incomes: number[];
  baskets: Basket[];
  yedNames: Record<YedKind, string>;
  yedHints: Record<YedKind, string>;
  calcs: Calc[];
}

/** Numbers for the screen: up to 2 decimal places, a real minus sign, thousands separated. */
function num(x: number): string {
  const r = round2(x);
  const s = Math.abs(r).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return r < 0 ? `−${s}` : s;
}
const signed = (x: number) => (round2(x) > 0 ? `+${num(x)}` : num(x));
const money = (x: number) => (x < 100 ? `$${x.toFixed(2)}` : `$${x.toLocaleString('en-US')}`);

function Try({ content, onComplete, onGoal, stamps, teacher }: TryProps) {
  const data = content.try as unknown as TryContent;
  const [levelNo, setLevelNo] = useState(1);
  const [round, setRound] = useState(0);
  const pick = (n: number) => {
    setLevelNo(n);
    setRound((r) => r + 1);
  };
  const props = { data, onComplete, onGoal, teacher, again: () => setRound((r) => r + 1) };
  return (
    <div class="stack">
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="basket" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <Stall key={round} seed={round} {...props} />}
      {levelNo === 2 && <IncomeLab key={round} seed={round} {...props} />}
      {levelNo === 3 && <CalcCorner key={round} seed={round} {...props} />}
    </div>
  );
}

interface LevelProps {
  data: TryContent;
  seed: number;
  onComplete: () => void;
  onGoal: (level?: number) => void;
  teacher: boolean;
  again: () => void;
}

function win(onGoal: (l?: number) => void, level: number) {
  setTimeout(() => {
    play('win');
    celebrate({ size: 'big' });
    onGoal(level);
  }, 400);
}

function Fb(props: { ok: boolean; children: ComponentChildren }) {
  return (
    <div class={`callout ${props.ok ? 'callout-ok' : 'callout-try'}`} role="status">
      <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
        {props.ok ? <MarkIcon /> : <CrossIcon />} <span>{props.children}</span>
      </p>
    </div>
  );
}

function Finish(props: { won: boolean; title: [string, string]; line: string; need: string; again: () => void }) {
  return (
    <div class={`callout ${props.won ? 'callout-ok' : 'callout-try'} stack`} role="status">
      <p style={{ margin: 0 }}>
        <strong>{props.won ? props.title[0] : props.title[1]}</strong> {props.line}
      </p>
      {!props.won && <p style={{ margin: 0 }}>{props.need} Play again: everything comes in a new order.</p>}
      <div><button class="btn" onClick={props.again}>Play again</button></div>
    </div>
  );
}

const PED_ICON: Record<PedKind, string> = { elastic: '🪀', inelastic: '🧱' };
const PED_NAME: Record<PedKind, string> = { elastic: 'Price elastic', inelastic: 'Price inelastic' };
const PED_HINT: Record<PedKind, string> = { elastic: 'Buyers cut back a lot', inelastic: 'Buyers cut back a little' };

// ---------------- Level 1: the HINTS stall ----------------

function Stall({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const goods = useMemo(() => shuffled(data.goods, seed + 3), [data.goods, seed]);
  const [idx, setIdx] = useState(0);
  const [detDone, setDetDone] = useState(false);
  const [solved, setSolved] = useState(false);
  const [missed, setMissed] = useState(false);
  const [wrongDet, setWrongDet] = useState<Det | null>(null);
  const [wrongCrate, setWrongCrate] = useState<PedKind | null>(null);
  const [firstRight, setFirstRight] = useState(0);
  const [crates, setCrates] = useState<Record<PedKind, Good[]>>({ elastic: [], inelastic: [] });
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const g = goods[idx];
  const goal = Math.min(STALL_GOAL, goods.length);

  const pickDet = (d: Det) => {
    if (detDone) return;
    if (d === g.det) {
      play('correct');
      setDetDone(true);
      setWrongDet(null);
      setAnnounce(`Right: ${data.detNames[d]}. Now choose a crate.`);
    } else {
      play('wrong');
      setMissed(true);
      setWrongDet(d);
      setAnnounce(`Not ${data.detNames[d]}. ${data.detAbout[d]}`);
    }
  };

  const pickCrate = (k: PedKind) => {
    if (!detDone || solved) return;
    if (k === g.ped) {
      play('pop');
      setSolved(true);
      setWrongCrate(null);
      if (!missed) setFirstRight((n) => n + 1);
      setCrates({ ...crates, [k]: [...crates[k], g] });
      setAnnounce(`Right: ${g.name} goes in the ${PED_NAME[k].toLowerCase()} crate.`);
    } else {
      play('wrong');
      setMissed(true);
      setWrongCrate(k);
      setAnnounce(`Not ${PED_NAME[k].toLowerCase()}. ${data.detRules[g.det]}`);
    }
  };

  const next = () => {
    play('whoosh');
    setDetDone(false);
    setSolved(false);
    setMissed(false);
    setWrongDet(null);
    setWrongCrate(null);
    if (idx + 1 < goods.length) {
      setIdx(idx + 1);
      setAnnounce('A new good slides down the chute.');
    } else {
      setDone(true);
      onComplete();
      if (stallWon(firstRight, goal)) win(onGoal, 1);
    }
  };

  if (done) {
    return (
      <Finish
        won={stallWon(firstRight, goal)}
        title={['The stall is sorted!', 'Stall finished.']}
        line={`Both parts right first time: ${firstRight} of ${goods.length}.`}
        need={`The ${STAMP_NAMES[0]} stamp needs ${goal} right first time.`}
        again={again}
      />
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1. Good {idx + 1} of {goods.length}. Right first time: {firstRight} (goal {goal}).
      </p>
      <section class="panel stack" aria-labelledby="hy-stall-h">
        <h3 id="hy-stall-h"><StepNo n={2} /> A good slides down the chute</h3>
        <div class="hy-stall">
          <div class="hy-awning" aria-hidden="true" />
          <div class="hy-counter">
            <div class="hy-chute" aria-hidden="true" />
            <div key={g.id} class={`hy-good ${solved ? `hy-sorted hy-sorted-${g.ped}` : 'hy-drop'}`}>
              <span class="hy-good-icon" aria-hidden="true">{g.icon}</span>
              <div>
                <p class="hy-good-name">{g.name}</p>
                <p class="hy-clue"><span class="hy-clue-tag">Clue</span> {g.clue}</p>
              </div>
              {solved && <span class="hy-sold">{PED_NAME[g.ped]}</span>}
            </div>
          </div>
        </div>
      </section>

      <section class="panel stack" aria-labelledby="hy-det-h">
        <h3 id="hy-det-h"><StepNo n={3} /> Which HINTS determinant matters most?</h3>
        <div class="hy-dets" role="group" aria-label="HINTS determinants">
          {DETS.map((d) => (
            <button
              key={d}
              type="button"
              class={`hy-det ${wrongDet === d ? 'shake hy-det-miss' : ''} ${detDone && g.det === d ? 'hy-det-right' : ''}`}
              disabled={detDone}
              onClick={() => pickDet(d)}
            >
              <span class="hy-det-letter" aria-hidden="true">{d}</span>
              <span>{data.detNames[d]}</span>
              {teacher && !detDone && g.det === d && <span class="badge badge-done">Answer</span>}
            </button>
          ))}
        </div>
        {wrongDet && !detDone && (
          <Fb ok={false}>
            Not {data.detNames[wrongDet].toLowerCase()}. {data.detAbout[wrongDet]} Read the clue again: "{g.clue}"
          </Fb>
        )}
        {detDone && <Fb ok><strong>{data.detNames[g.det]}.</strong> {data.detRules[g.det]}</Fb>}
      </section>

      {detDone && (
        <section class="panel stack" aria-labelledby="hy-crate-h">
          <h3 id="hy-crate-h"><StepNo n={4} /> Sort it into a crate</h3>
          <p class="small muted" style={{ margin: 0 }}>If the price of {g.name.toLowerCase()} went up by 10%, would buyers cut back a lot or a little?</p>
          <div class="hy-crates" role="group" aria-label="Crates">
            {PED_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                class={`hy-crate ${wrongCrate === k ? 'shake' : ''} ${solved && g.ped === k ? 'hy-crate-right' : ''}`}
                disabled={solved}
                onClick={() => pickCrate(k)}
              >
                <span class="hy-crate-head">
                  <span aria-hidden="true">{PED_ICON[k]}</span> <strong>{PED_NAME[k]}</strong>
                </span>
                <span class="small">{PED_HINT[k]}</span>
                <span class="hy-crate-box" aria-label={`${crates[k].length} goods in this crate`}>
                  {crates[k].map((c) => <span key={c.id} class="hy-crate-item" aria-hidden="true">{c.icon}</span>)}
                </span>
                {teacher && !solved && g.ped === k && <span class="badge badge-done">Answer</span>}
              </button>
            ))}
          </div>
          {wrongCrate && !solved && (
            <Fb ok={false}>
              Not {PED_NAME[wrongCrate].toLowerCase()}. {data.detRules[g.det]} The clue: "{g.clue}"
            </Fb>
          )}
          {solved && (
            <div class="callout callout-ok stack" role="status">
              <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                <MarkIcon /> <span><strong>{data.detNames[g.det]}: {PED_NAME[g.ped].toLowerCase()}.</strong> <Md text={g.why} inline /></span>
              </p>
              <div><button class="btn" onClick={next}>{idx + 1 < goods.length ? 'Next good' : 'Finish'}</button></div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ---------------- Level 2: the income lab ----------------

interface Pick { solved: boolean; missed: boolean; wrong: YedKind | null }
const freshPicks = (b: Basket): Record<string, Pick> => Object.fromEntries(b.goods.map((g) => [g.id, { solved: false, missed: false, wrong: null }]));

function niceTicks(max: number): number[] {
  const step = max <= 10 ? 2 : max <= 20 ? 5 : 10;
  const out: number[] = [];
  for (let t = step; t <= max; t += step) out.push(t);
  return out;
}

/** The Engel curve so far. The newest piece of line draws itself and the newest point pops in. */
function EngelLine(props: { pts: { q: number; p: number }[] }) {
  const { sx, sy } = useDiagram();
  const { pts } = props;
  const n = pts.length;
  const last = pts[n - 1];
  const prev = n > 1 ? pts[n - 2] : null;
  const old = pts.slice(0, -1);
  const oldD = old.map((p, i) => `${i ? 'L' : 'M'}${sx(p.q).toFixed(1)} ${sy(p.p).toFixed(1)}`).join(' ');
  return (
    <g aria-hidden="true">
      {old.length > 1 && <path d={oldD} fill="none" stroke={TONE.navy} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />}
      {prev && (
        <path
          key={`seg${n}`}
          class="hy-seg"
          pathLength={1}
          d={`M${sx(prev.q).toFixed(1)} ${sy(prev.p).toFixed(1)} L${sx(last.q).toFixed(1)} ${sy(last.p).toFixed(1)}`}
          fill="none"
          stroke={TONE.navy}
          stroke-width="3"
          stroke-linecap="round"
        />
      )}
      {pts.map((p, i) => (
        <circle key={`pt${i}`} class={i === n - 1 ? 'hy-pop' : ''} cx={sx(p.q)} cy={sy(p.p)} r={i === n - 1 ? 6 : 4.5} fill={i === n - 1 ? TONE.red : TONE.navy} stroke="#fff" stroke-width="1.5" />
      ))}
    </g>
  );
}

function EngelChart(props: { good: BasketGood; incomes: number[]; step: number }) {
  const { good, incomes, step } = props;
  const xMax = Math.ceil((Math.max(...good.qty) * 1.2) / 5) * 5;
  const yMax = 7000;
  const pts = engelPoints(incomes, good.qty, step);
  const desc = `Engel curve for ${good.name.toLowerCase()}. Points so far: ${pts.map((p) => `income ${money(p.p)}, ${p.q} ${good.unit}`).join('; ')}.`;
  return (
    <figure class="hy-engel">
      <figcaption><span aria-hidden="true">{good.icon}</span> <strong>{good.name}</strong></figcaption>
      <Diagram
        xMax={xMax}
        yMax={yMax}
        xLabel="Quantity"
        yLabel="Income"
        title={`Engel curve: ${good.name}`}
        description={desc}
        width={340}
        height={300}
        xTicks={niceTicks(xMax)}
        yTicks={incomes.filter((_, i) => i % 2 === 0)}
        formatY={(v) => `$${v / 1000}k`}
      >
        <EngelLine pts={pts} />
      </Diagram>
    </figure>
  );
}

function IncomeLab({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const baskets = useMemo(
    () => shuffled(data.baskets, seed + 7).map((b, i) => ({ ...b, goods: shuffled(b.goods, seed + 13 + i) })),
    [data.baskets, seed],
  );
  const total = baskets.reduce((s, b) => s + b.goods.length, 0);
  const incomes = data.incomes;
  const top = incomes.length - 1;
  const [bi, setBi] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [picks, setPicks] = useState<Record<string, Pick>>(() => freshPicks(baskets[0]));
  const [firstRight, setFirstRight] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const b = baskets[bi];
  const ready = step === top;
  const allSolved = b.goods.every((g) => picks[g.id]?.solved);
  const seen = baskets.slice(0, bi).reduce((s, x) => s + x.goods.length, 0);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const setIncome = (i: number) => {
    const n = Math.max(0, Math.min(top, i));
    if (n !== step) play(n > step ? 'coin' : 'tap');
    setStep(n);
    setAnnounce(`Income ${money(incomes[n])} a month. ${b.goods.map((g) => `${g.name}: ${g.qty[n]} ${g.unit}`).join('. ')}.`);
  };

  const watch = () => {
    window.clearInterval(timer.current);
    if (reducedMotion()) {
      setIncome(top);
      return;
    }
    setPlaying(true);
    let i = 0;
    setStep(0);
    timer.current = window.setInterval(() => {
      i += 1;
      setIncome(i);
      if (i >= top) {
        window.clearInterval(timer.current);
        setPlaying(false);
      }
    }, 900);
  };

  // The YED from the second to the third income level, used in feedback so students see the data at work.
  const sample = (g: BasketGood) => {
    const v = yed(incomes[1], incomes[2], g.qty[1], g.qty[2]);
    return {
      text: `From ${money(incomes[1])} to ${money(incomes[2])}, income changes by ${signed(pctChange(incomes[1], incomes[2]))}% and quantity changes by ${signed(pctChange(g.qty[1], g.qty[2]))}%. YED = ${num(v)}.`,
      v,
    };
  };

  const classify = (g: BasketGood, k: YedKind) => {
    const p = picks[g.id];
    if (p.solved) return;
    if (k === g.kind) {
      play('correct');
      if (!p.missed) setFirstRight((n) => n + 1);
      setPicks({ ...picks, [g.id]: { ...p, solved: true, wrong: null } });
      setAnnounce(`Right: ${g.name} is ${data.yedNames[k].toLowerCase()}.`);
    } else {
      play('wrong');
      setPicks({ ...picks, [g.id]: { ...p, missed: true, wrong: k } });
      setAnnounce(`Not ${data.yedNames[k].toLowerCase()}. ${sample(g).text}`);
    }
  };

  const next = () => {
    play('whoosh');
    window.clearInterval(timer.current);
    setPlaying(false);
    if (bi + 1 < baskets.length) {
      setBi(bi + 1);
      setStep(0);
      setPicks(freshPicks(baskets[bi + 1]));
      setAnnounce(`A new household: ${baskets[bi + 1].name}.`);
    } else {
      setDone(true);
      onComplete();
      if (labWon(firstRight)) win(onGoal, 2);
    }
  };

  if (done) {
    return (
      <Finish
        won={labWon(firstRight)}
        title={['Lab results are in!', 'Lab finished.']}
        line={`Right first time: ${firstRight} of ${total}.`}
        need={`The ${STAMP_NAMES[1]} stamp needs ${LAB_GOAL} right first time.`}
        again={again}
      />
    );
  }

  const wrongText = (g: BasketGood, k: YedKind) => {
    const s = sample(g);
    const range = data.yedHints[k];
    return `${s.text} That does not fit ${data.yedNames[k].toLowerCase()} (${range}).`;
  };

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2. Household {bi + 1} of {baskets.length}. Goods classified: {seen + b.goods.filter((g) => picks[g.id]?.solved).length} of {total}. Right first time: {firstRight} (goal {LAB_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="hy-income-h">
        <h3 id="hy-income-h"><StepNo n={2} /> Raise the income: {b.name}</h3>
        <div class="hy-income-row">
          <label for="hy-income" class="hy-income-label">
            Income: <strong class="hy-income-val">{money(incomes[step])}</strong> a month
          </label>
          <input
            id="hy-income"
            class="hy-slider"
            type="range"
            min={0}
            max={top}
            step={1}
            value={step}
            aria-valuetext={`${money(incomes[step])} a month`}
            disabled={playing}
            onInput={(e) => setIncome(Number((e.target as HTMLInputElement).value))}
          />
          <button type="button" class="btn btn-secondary btn-sm" disabled={playing} onClick={watch}>
            {playing ? 'Income rising...' : 'Watch income rise'}
          </button>
        </div>
        <div class="hy-basket" aria-label="The basket this month">
          <div class="hy-basket-handle" aria-hidden="true" />
          <ul class="hy-basket-list">
            {b.goods.map((g) => {
              const q = g.qty[step];
              const prev = step > 0 ? g.qty[step - 1] : null;
              const max = Math.max(...g.qty);
              return (
                <li key={g.id} class="hy-basket-row">
                  <span class="hy-basket-icon" aria-hidden="true">{g.icon}</span>
                  <span class="hy-basket-name">{g.name}</span>
                  <span class="hy-bar" aria-hidden="true"><span key={`${g.id}${step}`} class="hy-bar-fill" style={{ width: `${(q / max) * 100}%` }} /></span>
                  <span class="hy-basket-q">
                    <strong key={`${g.id}q${step}`} class="hy-bump">{q}</strong> {g.unit}
                    {prev !== null && q !== prev && <span class={`hy-delta ${q > prev ? 'up' : 'down'}`}> {q > prev ? '▲ +' : '▼ '}{q - prev}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section class="panel stack" aria-labelledby="hy-engel-h">
        <h3 id="hy-engel-h"><StepNo n={3} /> Watch the Engel curves draw</h3>
        <p class="small muted" style={{ margin: 0 }}>Income is on the vertical axis. Quantity is on the horizontal axis. Each rise in income adds a point.</p>
        <div class="hy-engels">
          {b.goods.map((g) => <EngelChart key={g.id} good={g} incomes={incomes} step={step} />)}
        </div>
        <div class="hy-table-wrap">
          <table class="hy-table">
            <caption class="small">The data so far</caption>
            <thead>
              <tr><th scope="col">Income a month</th>{b.goods.map((g) => <th key={g.id} scope="col">{g.name} ({g.unit})</th>)}</tr>
            </thead>
            <tbody>
              {incomes.slice(0, step + 1).map((y, i) => (
                <tr key={y}><th scope="row">{money(y)}</th>{b.goods.map((g) => <td key={g.id}>{g.qty[i]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel stack" aria-labelledby="hy-yed-h">
        <h3 id="hy-yed-h"><StepNo n={4} /> Classify each good by YED</h3>
        {!ready && <p class="small muted" style={{ margin: 0 }}>Raise income to {money(incomes[top])} to finish the curves. Then classify each good.</p>}
        {ready && b.goods.map((g) => {
          const p = picks[g.id];
          return (
            <div key={g.id} class="hy-yed-row stack" role="group" aria-label={g.name}>
              <p style={{ margin: 0 }}><span aria-hidden="true">{g.icon}</span> <strong>{g.name}</strong></p>
              <div class="hy-yed-btns">
                {YED_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    class={`choice-btn ${p.wrong === k && !p.solved ? 'shake chosen' : ''} ${p.solved && g.kind === k ? 'choice-right' : ''}`}
                    disabled={p.solved}
                    onClick={() => classify(g, k)}
                  >
                    <strong>{data.yedNames[k]}</strong> <span class="small">({data.yedHints[k]})</span>
                    {teacher && !p.solved && g.kind === k && <span class="badge badge-done">Answer</span>}
                  </button>
                ))}
              </div>
              {p.wrong && !p.solved && <Fb ok={false}>{wrongText(g, p.wrong)}</Fb>}
              {p.solved && <Fb ok><strong>{data.yedNames[g.kind]}.</strong> {g.why} {sample(g).text}</Fb>}
            </div>
          );
        })}
        {ready && allSolved && (
          <div><button class="btn" onClick={next}>{bi + 1 < baskets.length ? 'Next household' : 'Finish'}</button></div>
        )}
      </section>
    </div>
  );
}

// ---------------- Level 3: the calculator corner ----------------

const PED_CLS: Cls[] = ['elastic', 'inelastic', 'unitary'];
const PED_CLS_NAME: Record<string, string> = { elastic: 'Price elastic (size above 1)', inelastic: 'Price inelastic (size below 1)', unitary: 'Unitary (size exactly 1)' };

function working(c: Calc): string {
  if (c.kind === 'qty') return `% change in quantity demanded = YED × % change in income = ${num(c.elasticity!)} × ${num(c.pct!)} = ${signed(calcAnswer(c))}%.`;
  const px = pctChange(c.x0!, c.x1!), pq = pctChange(c.q0!, c.q1!);
  const what = c.kind === 'ped' ? 'price' : 'income';
  const fx = c.money ? money : num;
  return `% change in ${what} = (${fx(c.x1!)} − ${fx(c.x0!)}) ÷ ${fx(c.x0!)} × 100 = ${signed(px)}%. % change in quantity demanded = (${num(c.q1!)} − ${num(c.q0!)}) ÷ ${num(c.q0!)} × 100 = ${signed(pq)}%. ${c.kind.toUpperCase()} = ${num(pq)} ÷ ${num(px)} = ${num(calcAnswer(c))}.`;
}

function slipText(c: Calc, v: number): string {
  const ans = calcAnswer(c);
  if (c.kind === 'qty') {
    if (closeEnough(v, round2(c.pct! / c.elasticity!)) || closeEnough(v, round2(c.elasticity! / c.pct!))) {
      return 'You divided. Rearrange the formula: % change in quantity demanded = YED × % change in income.';
    }
    if (closeEnough(v, -ans)) return 'Check the sign. YED is positive and income rose, so quantity demanded rises.';
    return 'Not yet. Multiply YED by the % change in income.';
  }
  const s = slips(c.x0!, c.x1!, c.q0!, c.q1!);
  const what = c.kind === 'ped' ? 'price' : 'income';
  if (closeEnough(v, s.flipped)) return `You divided the other way up. ${c.kind.toUpperCase()} = % change in quantity demanded ÷ % change in ${what}.`;
  if (closeEnough(v, s.newBase)) return 'You used the new values as the base. Percentage change uses the original values: (new − original) ÷ original × 100.';
  if (closeEnough(v, s.sign)) return c.kind === 'ped'
    ? 'The size is right, but price and quantity demanded move in opposite directions, so PED is negative.'
    : 'The size is right, but check the sign. Did quantity move the same way as income, or the opposite way?';
  if (closeEnough(v, round2((c.q1! - c.q0!) / (c.x1! - c.x0!)))) return 'You divided the raw changes. Use percentage changes, not the changes in units or dollars.';
  return `Not yet. Work out each % change from the original value, then divide quantity by ${what}.`;
}

function CalcCorner({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const calcs = useMemo(() => {
    // The HL round stays last, so the core rounds come first.
    const core = shuffled(data.calcs.filter((c) => !c.hl), seed + 19);
    return [...core, ...data.calcs.filter((c) => c.hl)];
  }, [data.calcs, seed]);
  const [ci, setCi] = useState(0);
  const [typed, setTyped] = useState('');
  const [numOk, setNumOk] = useState(false);
  const [numMissed, setNumMissed] = useState(false);
  const [numMsg, setNumMsg] = useState('');
  const [clsOk, setClsOk] = useState(false);
  const [clsMissed, setClsMissed] = useState(false);
  const [clsWrong, setClsWrong] = useState<number | null>(null);
  const [firstRight, setFirstRight] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const c = calcs[ci];
  const ans = calcAnswer(c);
  const label = c.kind === 'qty' ? '% change in Qd =' : `${c.kind.toUpperCase()} =`;

  const options: { text: string; correct: boolean; feedback: string }[] = c.reason
    ? c.reason.options.map((o) => ({ text: o.text, correct: !!o.correct, feedback: o.feedback }))
    : (c.kind === 'ped' ? PED_CLS : (YED_KINDS as Cls[])).map((k) => {
      const right = calcClass(c);
      const name = c.kind === 'ped' ? PED_CLS_NAME[k] : `${data.yedNames[k as YedKind]} (${data.yedHints[k as YedKind]})`;
      const value = c.kind === 'qty' ? c.elasticity! : ans;
      const fb = k === right
        ? c.kind === 'ped'
          ? `Yes. The size of PED is ${num(Math.abs(ans))}, which is ${Math.abs(ans) > 1 ? 'more' : 'less'} than 1. Quantity demanded changes by a ${Math.abs(ans) > 1 ? 'bigger' : 'smaller'} % than price.`
          : `Yes. YED = ${num(value)}. ${right === 'inferior' ? 'It is negative: quantity falls as income rises.' : right === 'luxury' ? 'It is above 1: quantity rises faster than income.' : 'It is between 0 and 1: quantity rises, but more slowly than income.'}`
        : c.kind === 'ped'
          ? `The size of PED is ${num(Math.abs(ans))}. Ignore the minus sign and compare the size with 1.`
          : `YED = ${num(value)}. Look at the sign first, then compare the size with 1.`;
      return { text: name, correct: k === right, feedback: fb };
    });

  const check = () => {
    if (numOk) return;
    const v = parseNumber(typed);
    if (v === null) {
      setNumMsg('Type a number, for example −0.25 or 1.5.');
      setAnnounce('Type a number.');
      return;
    }
    if (closeEnough(v, ans)) {
      play('coin');
      setNumOk(true);
      setNumMsg('');
      setAnnounce(`Right: ${label} ${num(ans)}.`);
    } else {
      play('wrong');
      setNumMissed(true);
      const msg = slipText(c, v);
      setNumMsg(msg);
      setAnnounce(msg);
    }
  };

  const pickCls = (i: number) => {
    if (clsOk || !numOk) return;
    const o = options[i];
    setClsWrong(o.correct ? null : i);
    if (o.correct) {
      play('correct');
      setClsOk(true);
      if (!numMissed && !clsMissed) setFirstRight((n) => n + 1);
    } else {
      play('wrong');
      setClsMissed(true);
    }
    setAnnounce(o.feedback);
  };

  const next = () => {
    play('whoosh');
    setTyped('');
    setNumOk(false);
    setNumMissed(false);
    setNumMsg('');
    setClsOk(false);
    setClsMissed(false);
    setClsWrong(null);
    if (ci + 1 < calcs.length) setCi(ci + 1);
    else {
      setDone(true);
      onComplete();
      if (calcWon(firstRight)) win(onGoal, 3);
    }
  };

  if (done) {
    return (
      <Finish
        won={calcWon(firstRight)}
        title={['Every sum checks out!', 'Calculator corner finished.']}
        line={`Right first time (number and meaning): ${firstRight} of ${calcs.length}.`}
        need={`The ${STAMP_NAMES[2]} stamp needs ${CALC_GOAL} right first time.`}
        again={again}
      />
    );
  }

  const rightOpt = options.find((o) => o.correct)!;

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3. Round {ci + 1} of {calcs.length}. Right first time: {firstRight} (goal {CALC_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="hy-receipt-h">
        <h3 id="hy-receipt-h"><StepNo n={2} /> Read the receipt</h3>
        <div key={c.id} class="hy-receipt hy-print">
          <p class="hy-receipt-title">{c.title} {c.hl && <HlBadge />}</p>
          <p style={{ margin: 0 }}>{c.story}</p>
          {c.kind !== 'qty' ? (
            <table class="hy-table hy-receipt-table">
              <thead>
                <tr><th scope="col"><span class="sr-only">When</span></th><th scope="col">{c.xName}</th><th scope="col">{c.qName}</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">Before</th><td>{c.money ? money(c.x0!) : num(c.x0!)}</td><td>{num(c.q0!)}</td></tr>
                <tr><th scope="row">After</th><td>{c.money ? money(c.x1!) : num(c.x1!)}</td><td>{num(c.q1!)}</td></tr>
              </tbody>
            </table>
          ) : (
            <table class="hy-table hy-receipt-table">
              <tbody>
                <tr><th scope="row">YED</th><td>{num(c.elasticity!)}</td></tr>
                <tr><th scope="row">Change in income</th><td>{signed(c.pct!)}%</td></tr>
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section class="panel stack" aria-labelledby="hy-calc-h">
        <h3 id="hy-calc-h"><StepNo n={3} /> Work it out</h3>
        <p class="small" style={{ margin: 0 }}>
          {c.kind === 'ped' && <>PED = % change in quantity demanded ÷ % change in price. Give your answer to 2 decimal places.</>}
          {c.kind === 'yed' && <>YED = % change in quantity demanded ÷ % change in income. Give your answer to 2 decimal places.</>}
          {c.kind === 'qty' && <>YED = % change in quantity demanded ÷ % change in income. Rearrange it.</>}
        </p>
        <div class="hy-calc">
          <div class="hy-lcd" aria-hidden="true">{typed.trim() || '0'}</div>
          <div class="hy-calc-row">
            <label for="hy-typed" class="hy-calc-label">{label}</label>
            <input
              id="hy-typed"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              size={8}
              value={typed}
              disabled={numOk}
              onInput={(e) => setTyped((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === 'Enter' && check()}
            />
            {c.kind === 'qty' && <span aria-hidden="true">%</span>}
            <button type="button" class="btn btn-sm" disabled={numOk} onClick={check}>
              Check
              {teacher && !numOk && <span class="badge badge-done">Answer {num(ans)}</span>}
            </button>
          </div>
        </div>
        {numMsg && !numOk && <Fb ok={false}>{numMsg}</Fb>}
        {numOk && <Fb ok><strong>{label} {num(ans)}{c.kind === 'qty' ? '%' : ''}.</strong> {working(c)}</Fb>}
      </section>

      {numOk && (
        <section class="panel stack" aria-labelledby="hy-mean-h">
          <h3 id="hy-mean-h"><StepNo n={4} /> {c.reason ? 'Explain it' : 'What does it mean?'} {c.hl && <HlBadge />}</h3>
          {c.reason && <p style={{ margin: 0 }}>{c.reason.prompt}</p>}
          <div class="stack" role="group" aria-label="Choices">
            {options.map((o, i) => (
              <button
                key={`${c.id}-${i}`}
                type="button"
                class={`choice-btn ${clsWrong === i ? 'shake chosen' : ''} ${clsOk && o.correct ? 'choice-right' : ''}`}
                disabled={clsOk}
                onClick={() => pickCls(i)}
              >
                {o.text}
                {teacher && !clsOk && o.correct && <span class="badge badge-done">Answer</span>}
              </button>
            ))}
          </div>
          {clsWrong !== null && !clsOk && <Fb ok={false}>{options[clsWrong].feedback}</Fb>}
          {clsOk && (
            <div class="stack">
              <Fb ok>{rightOpt.feedback}</Fb>
              <div><button class="btn" onClick={next}>{ci + 1 < calcs.length ? 'Next round' : 'Finish'}</button></div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ---------------- Learn it ----------------

const ENGEL_POINTS = [
  { q: 0, p: 10 }, { q: 20, p: 20 }, { q: 38, p: 29 }, { q: 46, p: 36 }, { q: 52, p: 46 },
  { q: 56, p: 58 }, { q: 55, p: 66 }, { q: 48, p: 78 }, { q: 40, p: 88 },
];

const LEARN_SPEC: DiagramSpec = {
  xMax: 100,
  yMax: 100,
  xLabel: 'Quantity demanded',
  yLabel: 'Income',
  title: 'Engel curve',
  description: 'An Engel curve with income on the vertical axis and quantity demanded on the horizontal axis. At low incomes the curve is flat: the good is a luxury, YED above 1. Then it is steep: a necessity, YED between 0 and 1. At high incomes it bends back to the left: an inferior good, YED below 0.',
  curves: [{ points: ENGEL_POINTS, label: 'Engel curve', labelOffset: { dx: -10, dy: -12 } }],
  texts: [
    { at: { q: 24, p: 13 }, text: 'Luxury: YED > 1', tone: 'navy', anchor: 'start' },
    { at: { q: 60, p: 42 }, text: 'Necessity:', tone: 'navy', anchor: 'start' },
    { at: { q: 60, p: 35 }, text: '0 < YED < 1', tone: 'navy', anchor: 'start' },
    { at: { q: 58, p: 80 }, text: 'Inferior: YED < 0', tone: 'red', anchor: 'start' },
  ],
};

const HINTS_STRIP: { d: Det; word: string; way: string }[] = [
  { d: 'H', word: 'Habits', way: 'Addictive or habit goods: inelastic' },
  { d: 'I', word: 'Income share', way: 'Small share: inelastic. Big share: elastic' },
  { d: 'N', word: 'Necessity', way: 'Necessities: inelastic. Luxuries: elastic' },
  { d: 'T', word: 'Time', way: 'Short run: inelastic. Long run: more elastic' },
  { d: 'S', word: 'Substitutes', way: 'Many close substitutes: elastic' },
];

function LearnDiagram() {
  return (
    <div class="stack">
      <ul class="hy-hints" aria-label="HINTS: the determinants of PED">
        {HINTS_STRIP.map((h) => (
          <li key={h.d} class="hy-hint">
            <span class="hy-det-letter" aria-hidden="true">{h.d}</span>
            <span><strong>{h.word}</strong><span class="small" style={{ display: 'block' }}>{h.way}</span></span>
          </li>
        ))}
      </ul>
      <SpecDiagram spec={LEARN_SPEC} />
    </div>
  );
}

export { Try, LearnDiagram };
