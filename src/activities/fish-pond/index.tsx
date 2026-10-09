/**
 * Fish Pond (2.8): common pool resources, the tragedy of the commons, and the responses that keep a resource sustainable.
 *
 * A pond sits above every level. Fish swim in it and breed between seasons; four boats fish on top.
 * Level 1: fish for 8 seasons with three greedy computer fishers, and answer why the stock falls.
 * Level 2: test five rules (quota, permits, self-governance, licence, international agreement). Predict, watch, judge.
 * Level 3: the fishers agree a limit, then one cheats. Choose the responses and keep the limit yourself.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon, StepNo } from '../../shared/design/components';
import { Curve, Diagram, Dot, HLine } from '../../shared/diagrams/Diagram';
import { SpecDiagram } from '../../shared/diagrams/SpecDiagram';
import type { DiagramSpec } from '../../shared/diagrams/SpecDiagram';
import type { TryProps } from '../../shared/activity/types';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import type { LevelInfo } from '../../shared/activity/LevelPicker';
import { celebrate } from '../../shared/fun/celebrate';
import { play } from '../../shared/fun/sound';
import { reducedMotion } from '../../shared/fun/motion';
import { shuffled } from '../island-economy/model';
import {
  birthOptions, CAPACITY, COLLAPSE, HEALTHY, L1_CHOICES, L1_GOAL, L1_SEASONS, L1_START, l1Wants, l1Won, L2_GOAL, L2_NO_RULE, L2_SEASONS,
  L2_START, l2Won, L3_GOAL, L3_SEASONS, L3_START, l3BotWants, l3Choices, l3Limit, l3Won, playSeason, POINTS_PER_RULE, ruleTrend, safeCatch,
  Season, stockPath, Trend, TRENDS,
} from './model';
import './pond.css';

const STAMP_NAMES = ['Pond Keeper', 'Rule Maker', 'Pond Guardian'];

interface Opt { text: string; correct?: boolean; feedback: string }
interface Boat { name: string; icon: string }
interface Question { id: string; prompt: string; options: Opt[] }
interface Rule { id: string; icon: string; name: string; text: string; wants: number[]; result: string; strengths: Opt[]; limits: Opt[] }
interface L3Question extends Question { after: number }
type Slip = 'right' | 'noCrowding' | 'beforeFishing' | 'stock' | 'near';

interface TryContent {
  levels: LevelInfo[];
  boats: Boat[];
  l1Questions: Question[];
  births: Record<'prompt' | Slip, string>;
  trendNames: Record<Trend, string>;
  rules: Rule[];
  l3Notes: Record<string, string>;
  l3Questions: L3Question[];
}

const fill = (text: string, v: Record<string, number | string>) => text.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

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
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="fish" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <Seasons key={round} seed={round} {...props} />}
      {levelNo === 2 && <Rules key={round} seed={round} {...props} />}
      {levelNo === 3 && <Cheat key={round} seed={round} {...props} />}
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

function Answer() {
  return <span class="badge badge-done">Answer</span>;
}

// ---------------- The pond ----------------

/** Places for up to 25 fish (one fish drawn for every 4 in the stock), spread through the water. */
const FISH_SPOTS = (() => {
  let s = 7;
  const r = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: 25 }, (_, i) => ({
    x: 80 + ((i * 97) % 25) * 17 + r() * 10,
    y: 102 + r() * 116,
    d: 30 + Math.round(r() * 40),
    t: 7 + Math.round(r() * 6),
    dl: -Math.round(r() * 8),
    tone: i % 3,
  }));
})();

const FISH_TONES = ['#e8833a', '#f2b600', '#d9534f'];
const fishFor = (stock: number) => Math.min(FISH_SPOTS.length, Math.ceil(Math.max(0, stock) / 4));

function Fish(props: { i: number; cls?: string }) {
  const f = FISH_SPOTS[props.i];
  return (
    <g transform={`translate(${f.x} ${f.y})`}>
      <g class={props.cls ?? ''}>
        <g class="fp-swim" style={{ '--d': `${f.d}px`, animationDuration: `${f.t}s`, animationDelay: `${f.dl}s` }}>
          <path d="M-12 0c5-8 15-8 20 0-5 8-15 8-20 0z" fill={FISH_TONES[f.tone]} stroke="#7a3d12" stroke-width="1.2" />
          <path d="M-12 0l-7-6v12z" fill={FISH_TONES[f.tone]} stroke="#7a3d12" stroke-width="1.2" stroke-linejoin="round" />
          <circle cx="3" cy="-1.5" r="1.6" fill="#1a1f29" />
        </g>
      </g>
    </g>
  );
}

type Phase = 'idle' | 'catch' | 'breed';

const BOAT_X = [92, 242, 392, 542];

interface PondProps {
  boats: Boat[];
  /** Stock shown when idle, and the stock at the start of a season while it animates. */
  stock: number;
  phase?: Phase;
  season?: Season | null;
  /** Hide the computer boats' catches (no monitoring yet). */
  hidden?: boolean;
  /** Boats that are not fishing in this test (no licence). */
  idle?: number[];
  /** A boat caught breaking the limit. */
  flagged?: number;
  signs?: string[];
}

function Pond(props: PondProps) {
  const phase = props.phase ?? 'idle';
  const sn = props.season;
  const shown = phase === 'idle' || !sn ? props.stock : phase === 'catch' ? sn.start : sn.end;
  const empty = shown <= 0 || (phase !== 'catch' && !!sn && sn.collapsed);
  const keep = phase === 'idle' || !sn ? fishFor(props.stock) : fishFor(sn.left);
  const gone = phase === 'catch' && sn ? fishFor(sn.start) : keep;
  const born = phase === 'breed' && sn && !sn.collapsed ? fishFor(sn.end) : keep;
  const murk = Math.max(0, Math.min(0.75, 1 - shown / 60));
  const desc = `${empty ? 'The pond is empty. The fish stock has collapsed.' : `The pond has ${shown} fish.`} ${props.boats
    .map((b, i) => (props.idle?.includes(i) ? `${b.name} is not fishing.` : `${b.name}'s boat is on the water.`))
    .join(' ')}${phase === 'catch' && sn ? ` The boats catch ${sn.caught} fish.` : ''}${phase === 'breed' && sn && !sn.collapsed ? ` ${sn.born} new fish are born.` : ''}${
    props.signs?.length ? ` Signs: ${props.signs.join(', ')}.` : ''
  }`;
  return (
    <svg class="fp-pond" viewBox="0 0 640 260" role="img" aria-labelledby="fp-pond-t fp-pond-d">
      <title id="fp-pond-t">The fish pond</title>
      <desc id="fp-pond-d">{desc}</desc>
      <defs>
        <linearGradient id="fp-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5fb3dd" />
          <stop offset="1" stop-color="#1f5f8f" />
        </linearGradient>
        <linearGradient id="fp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#bfe3f7" />
          <stop offset="1" stop-color="#eaf6fc" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="640" height="72" fill="url(#fp-sky)" />
      <circle cx="167" cy="22" r="12" fill="#f6c12f" />
      {/* Banks and water */}
      <path d="M0 72h640v188H0z" fill="#8cc47c" />
      <path d="M14 72h612c-4 70-30 150-70 172H84C44 222 18 142 14 72z" fill="url(#fp-water)" />
      <path class="fp-fade" d="M14 72h612c-4 70-30 150-70 172H84C44 222 18 142 14 72z" fill="#6b5a3a" opacity={empty ? 0.8 : murk} />
      <path d="M84 244h472c-10 6-20 10-30 12H114c-10-2-20-6-30-12z" fill="#d9c08a" />
      {/* Reeds */}
      {[22, 34, 606, 618].map((x, i) => (
        <g key={x} class="fp-reed" style={{ animationDelay: `${-i * 0.7}s` }}>
          <path d={`M${x} 110v-52`} stroke="#3f7d3a" stroke-width="3" stroke-linecap="round" />
          <ellipse cx={x} cy={58} rx="3" ry="8" fill="#7a5a3a" />
        </g>
      ))}
      {/* Bubbles */}
      {!empty && [140, 330, 470].map((x, i) => <circle key={x} class={`fp-bubble fp-bubble${i}`} cx={x} cy="232" r="3" fill="#ffffff" opacity="0.7" />)}
      {/* Fish */}
      {Array.from({ length: keep }, (_, i) => <Fish key={`k${i}`} i={i} />)}
      {phase === 'catch' && Array.from({ length: Math.max(0, gone - keep) }, (_, j) => <Fish key={`g${keep + j}`} i={keep + j} cls="fp-gone" />)}
      {phase === 'breed' && Array.from({ length: Math.max(0, born - keep) }, (_, j) => <Fish key={`b${keep + j}`} i={keep + j} cls="fp-new" />)}
      {empty && (
        <text x="320" y="170" text-anchor="middle" font-size="22" font-weight="700" fill="#ffffff">
          No fish left
        </text>
      )}
      {/* Boats */}
      {props.boats.map((b, i) => {
        const x = BOAT_X[i];
        const off = props.idle?.includes(i);
        const caught = sn?.catches[i] ?? 0;
        const show = phase === 'catch' && sn && !off;
        const label = props.hidden && i > 0 ? '?' : `−${caught}`;
        return (
          <g key={b.name} opacity={off ? 0.35 : 1}>
            {show && <path class="fp-cast" d={`M${x + 26} 58v70`} stroke="#1a1f29" stroke-width="1.5" />}
            <g class="fp-bob" style={{ animationDelay: `${-i * 0.6}s` }}>
              <path d={`M${x - 30} 62h60l-10 14h-40z`} fill={i === 0 ? '#c8102e' : '#1d4ed8'} stroke="#1a1f29" stroke-width="1.5" />
              <path d={`M${x} 62v-30l18 24z`} fill="#ffffff" stroke="#1a1f29" stroke-width="1.2" />
              <path d={`M${x + 18} 58l10-10`} stroke="#7a5a3a" stroke-width="2.5" stroke-linecap="round" />
            </g>
            <text x={x - 6} y="98" text-anchor="middle" font-size="17" font-weight="700" fill="#ffffff" stroke="#1d4ed8" stroke-width="3" paint-order="stroke">
              {b.name}
            </text>
            {props.flagged === i && (
              <g class="fp-pop" transform={`translate(${x - 34} 36)`}>
                <circle r="11" fill="#c8102e" stroke="#ffffff" stroke-width="2" />
                <text y="5" text-anchor="middle" font-size="15" font-weight="700" fill="#ffffff">!</text>
              </g>
            )}
            {show && (
              <g class="fp-pop" transform={`translate(${x + 30} 24)`}>
                <rect x="-20" y="-14" width="40" height="22" rx="11" fill="#ffffff" stroke="#1d4ed8" stroke-width="1.5" />
                <text y="2" text-anchor="middle" font-size="14" font-weight="700" fill="#1d4ed8">{label}</text>
              </g>
            )}
          </g>
        );
      })}
      {phase === 'breed' && sn && !sn.collapsed && (
        <g class="fp-pop" transform="translate(320 150)">
          <rect x="-58" y="-18" width="116" height="30" rx="15" fill="#ffffff" stroke="#1e6b3a" stroke-width="2" />
          <text y="3" text-anchor="middle" font-size="16" font-weight="700" fill="#1e6b3a">+{sn.born} born</text>
        </g>
      )}
      {props.signs?.map((s, i) => (
        <g key={s} transform={`translate(${12 + i * 150} 228)`}>
          <rect width="140" height="24" rx="5" fill="#fff8d6" stroke="#7a5a3a" stroke-width="1.5" />
          <text x="70" y="17" text-anchor="middle" font-size="13" font-weight="700" fill="#5b4636">{s}</text>
        </g>
      ))}
    </svg>
  );
}

/** The stock as a number and a bar, with the healthy level and the collapse line marked. */
function StockBar(props: { stock: number; label?: string }) {
  const pct = (v: number) => `${(Math.max(0, Math.min(CAPACITY, v)) / CAPACITY) * 100}%`;
  const state = props.stock <= 0 ? 'collapsed' : props.stock < 25 ? 'danger' : props.stock < HEALTHY ? 'low' : 'healthy';
  const word = { collapsed: 'Collapsed', danger: 'In danger', low: 'Below the healthy level', healthy: 'Healthy' }[state];
  return (
    <div class="fp-stock">
      <p style={{ margin: 0 }}>
        <span class="fp-stock-num">{props.stock}</span> {props.label ?? 'fish in the pond'}{' '}
        <span class={`fp-state fp-state-${state}`}>{word}</span>
      </p>
      <div class="fp-bar" aria-hidden="true">
        <span class={`fp-bar-fill fp-fill-${state}`} style={{ width: pct(props.stock) }} />
        <span class="fp-mark fp-mark-collapse" style={{ left: pct(COLLAPSE) }} />
        <span class="fp-mark fp-mark-healthy" style={{ left: pct(HEALTHY) }} />
      </div>
      <p class="small muted fp-bar-key" style={{ margin: 0 }}>
        <span style={{ left: pct(COLLAPSE) }}>Collapse {COLLAPSE}</span>
        <span style={{ left: pct(HEALTHY) }}>Healthy {HEALTHY}</span>
        <span style={{ left: '100%' }}>{CAPACITY}</span>
      </p>
    </div>
  );
}

/** Stock over time: one line for this game, and a dashed comparison line if given. */
function StockChart(props: { path: number[]; seasons: number; compare?: number[]; compareLabel?: string; label?: string; title: string }) {
  const pts = props.path.map((p, i) => ({ q: i, p }));
  const cmp = props.compare?.map((p, i) => ({ q: i, p }));
  const ticks = Array.from({ length: props.seasons }, (_, i) => i + 1);
  const desc = `Fish stock over ${props.seasons} seasons. ${props.label ?? 'This game'}: ${props.path.join(', ')}.${
    cmp ? ` ${props.compareLabel}: ${props.compare!.join(', ')}.` : ''
  } A dashed line marks the healthy level of ${HEALTHY} fish.`;
  return (
    <div class="fp-chart">
      <Diagram xMax={props.seasons} yMax={CAPACITY} xLabel="Season" yLabel="Fish stock" title={props.title} description={desc} xTicks={ticks} yTicks={[25, 50, 75, 100]} height={300}>
        <HLine p={HEALTHY} tone="green" dashed width={2} label="Healthy" />
        {cmp && cmp.length > 1 && <Curve points={cmp} tone="grey" dashed />}
        {pts.length > 1 && <Curve points={pts} tone="navy" />}
        {pts.map((p) => <Dot key={p.q} at={p} tone={p.p <= 0 ? 'red' : 'navy'} r={4} />)}
      </Diagram>
      <p class="small fp-legend" style={{ margin: 0 }}>
        <span><span class="fp-key fp-key-solid" aria-hidden="true" /> {props.label ?? 'Stock'}</span>
        {cmp && <span><span class="fp-key fp-key-dash" aria-hidden="true" /> {props.compareLabel}</span>}
        <span><span class="fp-key fp-key-green" aria-hidden="true" /> Healthy level ({HEALTHY})</span>
      </p>
    </div>
  );
}

/** Runs the catch, then the breeding, then calls `done`. With reduced motion it calls `done` at once. */
function useSeasonAnim() {
  const [phase, setPhase] = useState<Phase>('idle');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);
  const run = (collapsed: boolean, done: () => void) => {
    if (reducedMotion()) {
      setPhase('idle');
      done();
      return;
    }
    setPhase('catch');
    play('whoosh');
    timers.current.push(
      window.setTimeout(() => {
        if (collapsed) {
          setPhase('idle');
          done();
          return;
        }
        setPhase('breed');
        play('pop');
        timers.current.push(window.setTimeout(() => { setPhase('idle'); done(); }, 1100));
      }, 1100),
    );
  };
  return { phase, run };
}

function SeasonSummary({ sn, data, hidden }: { sn: Season; data: TryContent; hidden?: boolean }) {
  return (
    <ul class="fp-summary">
      <li>
        <span aria-hidden="true">🎣</span> Caught: <strong>{sn.caught}</strong> fish
        {!hidden && ` (${data.boats.map((b, i) => `${b.name} ${sn.catches[i]}`).join(', ')})`}
        {hidden && ' in all. No one checks each boat yet.'}
      </li>
      <li><span aria-hidden="true">🐟</span> Left after fishing: <strong>{sn.left}</strong></li>
      {sn.collapsed
        ? <li><span aria-hidden="true">⚠️</span> Fewer than {COLLAPSE} fish were left, too few to breed. <strong>The stock collapsed.</strong></li>
        : <li><span aria-hidden="true">🥚</span> New fish born: <strong>{sn.born}</strong>. Stock now: <strong>{sn.end}</strong></li>}
    </ul>
  );
}

/** One multiple-choice question: retry until right; a wrong try loses the first-try mark. */
function Ask(props: { q: Question; seed: number; teacher: boolean; onRight: (first: boolean) => void; onWrong?: (feedback: string) => void; solvedText?: ComponentChildren }) {
  const opts = useMemo(() => shuffled(props.q.options, props.seed), [props.q, props.seed]);
  const [pick, setPick] = useState<number | null>(null);
  const [missed, setMissed] = useState(false);
  const solved = pick !== null && !!opts[pick].correct;
  const choose = (i: number) => {
    if (solved) return;
    setPick(i);
    if (opts[i].correct) {
      play('correct');
      props.onRight(!missed);
    } else {
      play('wrong');
      setMissed(true);
      props.onWrong?.(opts[i].feedback);
    }
  };
  return (
    <div class="stack">
      <p style={{ margin: 0 }}><strong><Md text={props.q.prompt} inline /></strong></p>
      <div class="fp-answers" role="group" aria-label="Answers">
        {opts.map((o, i) => (
          <button
            key={`${props.q.id}-${i}`}
            type="button"
            class={`choice-btn ${pick === i && !o.correct ? 'shake chosen' : ''} ${solved && o.correct ? 'choice-right' : ''}`}
            disabled={solved}
            onClick={() => choose(i)}
          >
            {o.text}
            {props.teacher && o.correct && !solved && <Answer />}
          </button>
        ))}
      </div>
      {pick !== null && <Fb ok={solved}>{opts[pick].feedback}</Fb>}
    </div>
  );
}

// ---------------- Level 1: fish for 8 seasons ----------------

type L1Item = { kind: 'q'; q: Question } | { kind: 'births' };

function Seasons({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const items = useMemo<L1Item[]>(() => shuffled([...data.l1Questions.map((q) => ({ kind: 'q' as const, q })), { kind: 'births' as const }], seed + 3), [data, seed]);
  const [season, setSeason] = useState(1);
  const [stock, setStock] = useState(L1_START);
  const [path, setPath] = useState<number[]>([L1_START]);
  const [sn, setSn] = useState<Season | null>(null);
  const [step, setStep] = useState<'choose' | 'anim' | 'ask' | 'done'>('choose');
  const [solved, setSolved] = useState(false);
  const [firstRight, setFirstRight] = useState(0);
  const [mine, setMine] = useState(0);
  const [bots, setBots] = useState(0);
  const [announce, setAnnounce] = useState('');
  const anim = useSeasonAnim();
  const left = L1_SEASONS - season + 1;
  const safe = safeCatch(stock, left) ?? L1_CHOICES[0];

  const fish = (c: number) => {
    if (step !== 'choose') return;
    const r = playSeason(stock, l1Wants(c));
    setSn(r);
    setStep('anim');
    setMine((m) => m + r.catches[0]);
    setBots((b) => b + sum(r.catches.slice(1)));
    setAnnounce(`Season ${season}. The boats catch ${r.caught} fish. ${r.collapsed ? 'Too few fish are left to breed. The stock has collapsed.' : `${r.born} new fish are born. The pond now has ${r.end} fish.`}`);
    anim.run(r.collapsed, () => {
      setStock(r.end);
      setPath((p) => [...p, r.end]);
      if (r.collapsed) {
        play('wrong');
        setStep('done');
        onComplete();
      } else setStep('ask');
    });
  };

  const right = (first: boolean) => {
    setSolved(true);
    if (first) setFirstRight((n) => n + 1);
    setAnnounce('Right. Read why, then go on.');
  };

  const next = () => {
    play('whoosh');
    setSolved(false);
    setSn(null);
    if (season < L1_SEASONS) {
      setSeason(season + 1);
      setStep('choose');
      setAnnounce(`Season ${season + 1}. Choose your catch.`);
    } else {
      setStep('done');
      onComplete();
      if (l1Won(true, firstRight)) win(onGoal, 1);
    }
  };

  if (step === 'done') {
    const alive = stock > 0;
    const won = l1Won(alive, firstRight);
    return (
      <div class="stack">
        <Pond boats={data.boats} stock={stock} />
        <StockChart path={path} seasons={L1_SEASONS} title="The fish stock, season by season" label="Fish stock" />
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'The pond survived!' : alive ? 'The pond survived, but the questions need work.' : `The pond collapsed in season ${season}.`}</strong>{' '}
            {alive ? `${stock} fish are left after 8 seasons.` : 'Too many fish were caught, so too few were left to breed.'} Right first time: {firstRight} of {items.length}.
          </p>
          <p style={{ margin: 0 }}>You caught {mine} fish. The computer fishers caught {bots}. Their rule never changed: 5 fish each, whatever happened to the pond.</p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[0]} stamp needs the pond alive after 8 seasons and {L1_GOAL} answers right first time. Play again: the questions come in a new order.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  const item = items[season - 1];
  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1. Season {season} of {L1_SEASONS}. Right first time: {firstRight} (goal {L1_GOAL}). Keep the pond alive.
      </p>
      <section class="panel stack" aria-labelledby="fp-pond-h">
        <h3 id="fp-pond-h"><StepNo n={2} /> Watch the pond</h3>
        <Pond boats={data.boats} stock={stock} phase={anim.phase} season={step === 'anim' ? sn : null} />
        <StockBar stock={step === 'anim' && sn ? (anim.phase === 'breed' ? sn.end : sn.start) : stock} />
      </section>

      <section class="panel stack" aria-labelledby="fp-catch-h">
        <h3 id="fp-catch-h"><StepNo n={3} /> Choose your catch</h3>
        <p class="small muted" style={{ margin: 0 }}>Ana, Bo and Cy each take 5 fish every season. How many will you take? More fish for you means fewer fish left to breed.</p>
        <div class="fp-catches" role="group" aria-label="Your catch">
          {L1_CHOICES.map((c) => (
            <button key={c} type="button" class={`fp-catch ${sn && sn.catches[0] === c ? 'chosen' : ''}`} disabled={step !== 'choose'} onClick={() => fish(c)}>
              <span class="fp-catch-num">{c}</span>
              <span class="small">fish</span>
              {teacher && step === 'choose' && c === safe && <Answer />}
            </button>
          ))}
        </div>
        {sn && step !== 'anim' && <SeasonSummary sn={sn} data={data} />}
      </section>

      {step === 'ask' && sn && (
        <section class="panel stack" aria-labelledby="fp-ask-h">
          <h3 id="fp-ask-h"><StepNo n={4} /> Why is this happening?</h3>
          {item.kind === 'q'
            ? <Ask key={`${season}-${item.q.id}`} q={item.q} seed={seed + season} teacher={teacher} onRight={right} onWrong={(f) => setAnnounce(f)} />
            : <Births key={`b${season}`} sn={sn} data={data} seed={seed + season} teacher={teacher} onRight={right} onWrong={(f) => setAnnounce(f)} />}
          {solved && <div><button class="btn" onClick={next}>{season < L1_SEASONS ? 'Next season' : 'Finish'}</button></div>}
        </section>
      )}
    </div>
  );
}

/** The question built from this season's numbers: how many new fish are born? */
function Births(props: { sn: Season; data: TryContent; seed: number; teacher: boolean; onRight: (first: boolean) => void; onWrong: (f: string) => void }) {
  const { sn, data } = props;
  const opts = useMemo(() => shuffled(birthOptions(sn.start, sn.left), props.seed), [sn, props.seed]);
  const v = { left: sn.left, half: sn.left / 2, born: sn.born, next: sn.end };
  const q: Question = {
    id: 'births',
    prompt: fill(data.births.prompt, v),
    options: opts.map((o) => ({ text: `${o.value} new fish`, correct: o.slip === 'right', feedback: fill(data.births[o.slip], v) })),
  };
  return <Ask q={q} seed={0} teacher={props.teacher} onRight={props.onRight} onWrong={props.onWrong} />;
}

// ---------------- Level 2: make the rules ----------------

function Rules({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const rounds = useMemo(() => shuffled(data.rules, seed + 7), [data.rules, seed]);
  const trends = useMemo(() => shuffled(TRENDS, seed + 9), [seed]);
  const [ri, setRi] = useState(0);
  const [step, setStep] = useState<'predict' | 'run' | 'strength' | 'limit' | 'next'>('predict');
  const [wrongTrend, setWrongTrend] = useState<Trend | null>(null);
  const [missed, setMissed] = useState(false);
  const [points, setPoints] = useState(0);
  const [shownSeason, setShownSeason] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const r = rounds[ri];
  const total = sum(r.wants);
  const answer = ruleTrend(total);
  const path = stockPath(L2_START, Array.from({ length: L2_SEASONS }, () => total));
  const noRule = stockPath(L2_START, Array.from({ length: L2_SEASONS }, () => L2_NO_RULE));
  const idle = r.wants.map((w, i) => (w === 0 ? i : -1)).filter((i) => i >= 0);

  const trendHint = (t: Trend) => {
    const cmp = total < 12 ? 'less than' : total === 12 ? 'the same as' : 'more than';
    return `${data.trendNames[t]} is not right. Add up the catch: ${total} fish a season. That is ${cmp} the 12 or so new fish a pond of 50 makes.`;
  };

  const predict = (t: Trend) => {
    if (step !== 'predict') return;
    if (t !== answer) {
      play('wrong');
      setMissed(true);
      setWrongTrend(t);
      setAnnounce(trendHint(t));
      return;
    }
    play('correct');
    if (!missed) setPoints((p) => p + 1);
    setWrongTrend(null);
    setStep('run');
    setAnnounce(`Right. Now watch ${L2_SEASONS} seasons.`);
    if (reducedMotion()) {
      setShownSeason(path.length - 1);
      return;
    }
    let s = 0;
    setShownSeason(0);
    timer.current = window.setInterval(() => {
      s += 1;
      setShownSeason(s);
      play('pop');
      if (s >= path.length - 1 && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    }, 650);
  };

  const judged = (first: boolean, next: 'limit' | 'next') => {
    if (first) setPoints((p) => p + 1);
    setStep(next);
  };

  const nextRule = () => {
    play('whoosh');
    setMissed(false);
    setWrongTrend(null);
    setShownSeason(0);
    if (ri + 1 < rounds.length) {
      setRi(ri + 1);
      setStep('predict');
      setAnnounce('A new rule to test.');
    } else {
      setDone(true);
      onComplete();
      if (l2Won(points)) win(onGoal, 2);
    }
  };

  const max = rounds.length * POINTS_PER_RULE;
  if (done) {
    const won = l2Won(points);
    return (
      <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
        <p style={{ margin: 0 }}>
          <strong>{won ? 'Every rule tested!' : 'Tests finished.'}</strong> First-try points: {points} of {max}.
        </p>
        <p style={{ margin: 0 }}>The rules that worked kept the total catch at or below the new fish born. Every rule needs monitoring to work.</p>
        {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[1]} stamp needs {L2_GOAL} points. Play again: the rules come in a new order.</p>}
        <div><button class="btn" onClick={again}>Play again</button></div>
      </div>
    );
  }

  const ran = step !== 'predict';
  const finished = ran && shownSeason >= path.length - 1;
  const shownPath = path.slice(0, shownSeason + 1);
  const shownStock = ran ? path[Math.min(shownSeason, path.length - 1)] : L2_START;

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2. Rule {ri + 1} of {rounds.length}. First-try points: {points} (goal {L2_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="fp-rule-h">
        <h3 id="fp-rule-h"><StepNo n={2} /> Read the rule</h3>
        <div key={r.id} class="fp-rule fp-in">
          <span class="fp-rule-icon" aria-hidden="true">{r.icon}</span>
          <div>
            <p style={{ margin: 0 }}><strong>{r.name}</strong></p>
            <p style={{ margin: 0 }}>{r.text}</p>
          </div>
        </div>
        <table class="fp-table">
          <caption class="sr-only">Catch per boat each season with this rule</caption>
          <thead><tr>{data.boats.map((b) => <th key={b.name} scope="col">{b.name}</th>)}<th scope="col">In all</th></tr></thead>
          <tbody><tr>{r.wants.map((w, i) => <td key={i}>{w}</td>)}<td><strong>{total}</strong></td></tr></tbody>
        </table>
        <p class="small muted" style={{ margin: 0 }}>The pond starts with {L2_START} fish. With no rule, each boat takes 5 fish: {L2_NO_RULE} in all.</p>
      </section>

      <section class="panel stack" aria-labelledby="fp-pred-h">
        <h3 id="fp-pred-h"><StepNo n={3} /> Predict: what happens over {L2_SEASONS} seasons?</h3>
        <div class="choice-grid" role="group" aria-label="Predictions">
          {trends.map((t) => (
            <button key={t} type="button" class={`choice-btn ${wrongTrend === t ? 'shake chosen' : ''} ${ran && t === answer ? 'choice-right' : ''}`} disabled={ran} onClick={() => predict(t)}>
              {data.trendNames[t]}
              {teacher && !ran && t === answer && <Answer />}
            </button>
          ))}
        </div>
        {wrongTrend && !ran && <Fb ok={false}>{trendHint(wrongTrend)}</Fb>}
      </section>

      {ran && (
        <section class="panel stack" aria-labelledby="fp-run-h">
          <h3 id="fp-run-h"><StepNo n={4} /> Watch the test</h3>
          <p class="small muted" style={{ margin: 0 }}>Season {Math.min(shownSeason, L2_SEASONS)} of {L2_SEASONS}.</p>
          <Pond boats={data.boats} stock={shownStock} idle={idle} />
          <StockBar stock={shownStock} />
          <StockChart path={shownPath} seasons={L2_SEASONS} compare={noRule} compareLabel="No rule (20 a season)" label={`With the rule (${total} a season)`} title={`The stock with a ${r.name.toLowerCase()}`} />
          {finished && <Fb ok>{r.result}</Fb>}
        </section>
      )}

      {finished && (step === 'run' || step === 'strength' || step === 'limit' || step === 'next') && (
        <section class="panel stack" aria-labelledby="fp-judge-h">
          <h3 id="fp-judge-h"><StepNo n={5} /> Judge the rule</h3>
          {step === 'run' && <div><button class="btn" onClick={() => { play('tap'); setStep('strength'); }}>Judge the {r.name.toLowerCase()}</button></div>}
          {step !== 'run' && (
            <Ask key={`${r.id}-s`} q={{ id: `${r.id}-s`, prompt: `One **strength** of the ${r.name.toLowerCase()}:`, options: r.strengths }} seed={seed + ri} teacher={teacher} onRight={(f) => judged(f, 'limit')} onWrong={setAnnounce} />
          )}
          {(step === 'limit' || step === 'next') && (
            <Ask key={`${r.id}-l`} q={{ id: `${r.id}-l`, prompt: `One **limitation** of the ${r.name.toLowerCase()}:`, options: r.limits }} seed={seed + ri + 1} teacher={teacher} onRight={(f) => judged(f, 'next')} onWrong={setAnnounce} />
          )}
          {step === 'next' && <div><button class="btn" onClick={nextRule}>{ri + 1 < rounds.length ? 'Next rule' : 'Finish'}</button></div>}
        </section>
      )}
    </div>
  );
}

// ---------------- Level 3: one fisher cheats ----------------

const CHEATER = 3;

function Cheat({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const [season, setSeason] = useState(1);
  const [stock, setStock] = useState(L3_START);
  const [path, setPath] = useState<number[]>([L3_START]);
  const [sn, setSn] = useState<Season | null>(null);
  const [step, setStep] = useState<'choose' | 'anim' | 'after' | 'done'>('choose');
  const [qi, setQi] = useState(0);
  const [solved, setSolved] = useState(false);
  const [firstRight, setFirstRight] = useState(0);
  const [over, setOver] = useState(0);
  const [announce, setAnnounce] = useState('');
  const anim = useSeasonAnim();

  const limit = l3Limit(season);
  const choices = l3Choices(limit);
  const monitored = data.l3Questions.some((q) => q.id === 'monitor' && q.after < season);
  const fined = data.l3Questions.some((q) => q.id === 'fine' && q.after < season);
  const signs = [monitored && 'Monitoring at dock', fined && 'Fine: 12 fish', season >= 5 && 'Limit: 2 per boat'].filter(Boolean) as string[];
  const seasonQs = data.l3Questions.filter((q) => q.after === season);
  const q = seasonQs[qi];

  const fish = (c: number) => {
    if (step !== 'choose') return;
    const r = playSeason(stock, [c, ...l3BotWants(season)]);
    setSn(r);
    setStep('anim');
    if (c > limit) setOver((n) => n + 1);
    setAnnounce(`Season ${season}. The boats catch ${r.caught} fish. ${r.collapsed ? 'The stock has collapsed.' : `${r.born} new fish are born. The pond now has ${r.end} fish.`}`);
    anim.run(r.collapsed, () => {
      setStock(r.end);
      setPath((p) => [...p, r.end]);
      setQi(0);
      setSolved(false);
      if (r.collapsed) {
        play('wrong');
        setStep('done');
        onComplete();
      } else setStep('after');
    });
  };

  const right = (first: boolean) => {
    setSolved(true);
    if (first) setFirstRight((n) => n + 1);
  };

  const next = () => {
    play('whoosh');
    if (qi + 1 < seasonQs.length) {
      setQi(qi + 1);
      setSolved(false);
      return;
    }
    setSn(null);
    if (season < L3_SEASONS) {
      setSeason(season + 1);
      setStep('choose');
      setAnnounce(`Season ${season + 1}. The limit is ${l3Limit(season + 1)} fish per boat.`);
    } else {
      setStep('done');
      onComplete();
      if (l3Won(stock, firstRight)) win(onGoal, 3);
    }
  };

  const total = data.l3Questions.length;
  if (step === 'done') {
    const won = l3Won(stock, firstRight);
    return (
      <div class="stack">
        <Pond boats={data.boats} stock={stock} signs={signs} />
        <StockChart path={path} seasons={L3_SEASONS} title="The fish stock, season by season" label="Fish stock" />
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'The pond is healthy again!' : stock <= 0 ? `The pond collapsed in season ${season}.` : 'Ten seasons are over.'}</strong>{' '}
            Fish in the pond: {stock} (goal {HEALTHY}). Right first time: {firstRight} of {total} (goal {L3_GOAL}).
          </p>
          {over > 0 && <p style={{ margin: 0 }}>You took more than the limit in {over} {over === 1 ? 'season' : 'seasons'}. That made you a cheat too: your extra fish were lost to everyone.</p>}
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[2]} stamp needs at least {HEALTHY} fish after 10 seasons and {L3_GOAL} answers right first time. Keep to the limit every season.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  const note = data.l3Notes[String(season)];
  const showCatch = step === 'anim' ? sn : null;
  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3. Season {season} of {L3_SEASONS}. Right first time: {firstRight} (goal {L3_GOAL}). Limit: {limit} fish per boat.
      </p>
      <section class="panel stack" aria-labelledby="fp-pond3-h">
        <h3 id="fp-pond3-h"><StepNo n={2} /> Watch the pond</h3>
        <Pond boats={data.boats} stock={stock} phase={anim.phase} season={showCatch} hidden={!monitored} flagged={(season === 3 && step === 'after') || season === 4 ? CHEATER : undefined} signs={signs} />
        <StockBar stock={step === 'anim' && sn ? (anim.phase === 'breed' ? sn.end : sn.start) : stock} />
      </section>

      <section class="panel stack" aria-labelledby="fp-catch3-h">
        <h3 id="fp-catch3-h"><StepNo n={3} /> Choose your catch</h3>
        <p class="small muted" style={{ margin: 0 }}>The four fishers agreed a limit of {limit} fish per boat this season.</p>
        <div class="fp-catches" role="group" aria-label="Your catch">
          {choices.map((c, i) => (
            <button key={c} type="button" class={`fp-catch ${sn && sn.catches[0] === c ? 'chosen' : ''}`} disabled={step !== 'choose'} onClick={() => fish(c)}>
              <span class="fp-catch-num">{c}</span>
              <span class="small">{['Less than the limit', 'Keep the limit', 'More than the limit'][i]}</span>
              {teacher && step === 'choose' && c === limit && <Answer />}
            </button>
          ))}
        </div>
        {sn && step === 'after' && <SeasonSummary sn={sn} data={data} hidden={!monitored} />}
        {sn && step === 'after' && sn.catches[0] > limit && <Fb ok={false}>You took {sn.catches[0]} fish, more than the limit of {limit}. Every extra fish you take is one fewer left to breed.</Fb>}
      </section>

      {step === 'after' && (
        <section class="panel stack" aria-labelledby="fp-resp-h">
          <h3 id="fp-resp-h"><StepNo n={4} /> {q ? 'Respond' : 'What happened'}</h3>
          {note && <p class="fp-note" style={{ margin: 0 }}><span aria-hidden="true">📣</span> {note}</p>}
          {q && <Ask key={q.id} q={q} seed={seed + season + qi} teacher={teacher} onRight={right} onWrong={setAnnounce} />}
          {(!q || solved) && <div><button class="btn" onClick={next}>{qi + 1 < seasonQs.length ? 'Next question' : season < L3_SEASONS ? 'Next season' : 'Finish'}</button></div>}
        </section>
      )}
    </div>
  );
}

// ---------------- Learn it ----------------

const LEARN_SPEC: DiagramSpec = {
  xMax: 100,
  yMax: 70,
  xLabel: '',
  yLabel: '',
  noAxes: true,
  title: 'Goods sorted by rivalry and excludability',
  description:
    'A grid with two columns, rivalrous and non-rivalrous, and two rows, excludable and non-excludable. Rivalrous and excludable: private good, such as a sandwich. Non-rivalrous and excludable: club good, such as a streaming service. Rivalrous and non-excludable: common pool resource, such as fish in a lake. This is the cell for this game. Non-rivalrous and non-excludable: public good, such as a street light.',
  boxes: [
    { at: { q: 45, p: 44 }, w: 34, h: 22 },
    { at: { q: 81, p: 44 }, w: 34, h: 22 },
    { at: { q: 45, p: 18 }, w: 34, h: 22 },
    { at: { q: 81, p: 18 }, w: 34, h: 22 },
  ],
  areas: [
    { points: [{ q: 29, p: 8 }, { q: 61, p: 8 }, { q: 61, p: 28 }, { q: 29, p: 28 }], tone: 'red', pattern: 'hatch' },
  ],
  texts: [
    { at: { q: 45, p: 62 }, text: 'Rivalrous', anchor: 'middle' },
    { at: { q: 81, p: 62 }, text: 'Non-rivalrous', anchor: 'middle' },
    { at: { q: 25, p: 43 }, text: 'Excludable', anchor: 'end' },
    { at: { q: 25, p: 20 }, text: 'Non-', anchor: 'end' },
    { at: { q: 25, p: 14 }, text: 'excludable', anchor: 'end' },
    { at: { q: 45, p: 47 }, text: 'Private good', anchor: 'middle' },
    { at: { q: 45, p: 38 }, text: 'a sandwich', anchor: 'middle', tone: 'grey' },
    { at: { q: 81, p: 47 }, text: 'Club good', anchor: 'middle' },
    { at: { q: 81, p: 38 }, text: 'streaming', anchor: 'middle', tone: 'grey' },
    { at: { q: 45, p: 22 }, text: 'Common pool', anchor: 'middle', tone: 'red' },
    { at: { q: 45, p: 16 }, text: 'resource', anchor: 'middle', tone: 'red' },
    { at: { q: 45, p: 10 }, text: 'fish in a lake', anchor: 'middle' },
    { at: { q: 81, p: 21 }, text: 'Public good', anchor: 'middle' },
    { at: { q: 81, p: 12 }, text: 'a street light', anchor: 'middle', tone: 'grey' },
  ],
};

function LearnDiagram() {
  return <SpecDiagram spec={LEARN_SPEC} />;
}

export { Try, LearnDiagram };
