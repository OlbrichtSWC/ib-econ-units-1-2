/**
 * Smoke and Sunshine (2.8): market failure from externalities, and how governments respond.
 *
 * A small town sits above every level. Its factory smokes, its bees are few, its party is loud.
 * Level 1: read a scenario, name the externality, then pick the gap you would draw on the diagram.
 * Level 2: choose the policy for each market and size it with a slider so output moves to Q*.
 *          The town picture improves as output gets close to Q*.
 * Level 3 (HL): calculate the welfare loss from a diagram with numbers, then judge the policy.
 */
import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon, StepNo } from '../../shared/design/components';
import { Area, Curve, Diagram, Dot, Guide, Label } from '../../shared/diagrams/Diagram';
import type { Tone } from '../../shared/diagrams/Diagram';
import { SpecDiagram } from '../../shared/diagrams/SpecDiagram';
import type { DiagramSpec } from '../../shared/diagrams/SpecDiagram';
import type { TryProps } from '../../shared/activity/types';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import type { LevelInfo } from '../../shared/activity/LevelPicker';
import { celebrate } from '../../shared/fun/celebrate';
import { play } from '../../shared/fun/sound';
import { priceAt, quantityAt } from '../../econ/calc';
import type { Line, Pt } from '../../econ/calc';
import { shuffled } from '../island-economy/model';
import {
  closeness, Ext, EXTS, FIX_GOAL, fixWon, Gap, gapAt, gapFor, GAPS, isNegative, isProduction, JUDGE_GOAL, judgeWon, lossAt, lossMistakes,
  lossTriangle, Market, marketPoint, numberRight, optimum, outcome, parseNumber, POINTS_PER_JUDGE_ROUND, privateLine, rightSize, shiftedCurve,
  sizeVerdict, Spot, SPOT_GOAL, SPOTS, spotWon, sunshine, Tool, welfareLoss,
} from './model';
import './town.css';

const STAMP_NAMES = ['Spillover Spotter', 'Town Fixer', 'Welfare Judge'];

interface Opt { text: string; correct?: boolean; feedback: string }
interface Scenario { id: string; icon: string; spot?: Spot; text: string; ext: Ext; why: string }
interface MarketData extends Market {
  id: string;
  spot: Spot;
  icon: string;
  title: string;
  unit: string;
  xMax: number;
  yMax: number;
}
interface FixMarket extends MarketData {
  brief: string;
  tool: Tool;
  slider: { min: number; max: number; step: number };
  options: { tool: Tool; feedback: string }[];
  fixed: string;
}
interface JudgeRound extends MarketData {
  policy: string;
  story: string;
  strengths: Opt[];
  limits: Opt[];
}

interface TryContent {
  levels: LevelInfo[];
  extNames: Record<Ext, string>;
  gapNames: Record<Gap, string>;
  gapHints: Record<Gap, string>;
  signWrong: string;
  sideWrong: string;
  gapWrong: string;
  scenarios: Scenario[];
  toolNames: Record<Tool, string>;
  toolHow: Record<Tool, string>;
  sizeNames: Record<Tool, string>;
  sizeSmall: string;
  sizeBig: string;
  sizeTip: string;
  markets: FixMarket[];
  calcText: Record<'noHalf' | 'gapAtOptimum' | 'usedQm' | 'priceBase' | 'other', string>;
  rounds: JudgeRound[];
}

const fmt = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2).replace(/0$/, ''));
const money = (v: number) => `$${Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : v.toFixed(2)}`;

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
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="factory" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <Spotter key={round} seed={round} {...props} />}
      {levelNo === 2 && <Fixer key={round} seed={round} {...props} />}
      {levelNo === 3 && <Judge key={round} seed={round} {...props} />}
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

// ---------------- The town ----------------

const SPOT_BOX: Record<Spot, { x: number; w: number; name: string }> = {
  factory: { x: 8, w: 128, name: 'cement factory' },
  bees: { x: 140, w: 108, name: 'bee farm and orchard' },
  party: { x: 252, w: 102, name: 'party house' },
  clinic: { x: 358, w: 90, name: 'vaccine clinic' },
  kiosk: { x: 452, w: 78, name: 'cigarette kiosk' },
  school: { x: 534, w: 100, name: 'college' },
};

function stateWord(f: number) {
  return f >= 0.99 ? 'fixed' : f >= 0.34 ? 'getting better' : 'a problem';
}

function People(props: { x: number; n: number; tone: string; hats?: boolean }) {
  return (
    <g>
      {Array.from({ length: props.n }, (_, i) => (
        <g key={i} class="ef-pop" transform={`translate(${props.x + i * 15} 0)`}>
          <circle cx="0" cy="178" r="4.5" fill="#f1c9a5" stroke="#5b4636" stroke-width="1" />
          <rect x="-4.5" y="183" width="9" height="12" rx="3" fill={props.tone} />
          {props.hats && <path d="M-6 175h12l-6-3z" fill="#1b3a6b" />}
        </g>
      ))}
    </g>
  );
}

/** The town picture. `fix` runs from 0 (the problem at its worst) to 1 (fixed) for each place. */
function Town(props: { fix: Partial<Record<Spot, number>>; focus?: Spot; spotted?: Set<Spot> }) {
  const f = (s: Spot) => Math.max(0, Math.min(1, props.fix[s] ?? 0));
  const sun = sunshine(props.fix);
  const desc = `A small town. ${SPOTS.map((s) => `The ${SPOT_BOX[s].name} is ${stateWord(f(s))}.`).join(' ')} ${
    sun >= 0.99 ? 'The sun shines over the whole town.' : sun > 0.4 ? 'The sun is coming out.' : 'Grey clouds hide the sun.'
  }${props.focus ? ` Now looking at the ${SPOT_BOX[props.focus].name}.` : ''}`;
  const bees = 1 + Math.round(f('bees') * 3);
  const apples = Math.round(f('bees') * 5);
  return (
    <svg class="ef-town" viewBox="0 0 640 240" role="img" aria-labelledby="ef-town-t ef-town-d">
      <title id="ef-town-t">The town</title>
      <desc id="ef-town-d">{desc}</desc>
      <defs>
        <linearGradient id="ef-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7fc0ee" />
          <stop offset="1" stop-color="#d8eefb" />
        </linearGradient>
      </defs>
      {/* Sky: grey under a blue layer that shows as the town is fixed */}
      <rect x="0" y="0" width="640" height="200" fill="#a9adb5" />
      <rect class="ef-fade" x="0" y="0" width="640" height="200" fill="url(#ef-sky)" opacity={0.15 + sun * 0.85} />
      {/* Sun and its cloud */}
      <g transform="translate(596 40)">
        <g class="ef-rays" opacity={0.3 + sun * 0.7}>
          {Array.from({ length: 10 }, (_, i) => (
            <line key={i} x1="0" y1="-30" x2="0" y2="-40" stroke="#f2b600" stroke-width="4" stroke-linecap="round" transform={`rotate(${i * 36})`} />
          ))}
        </g>
        <circle r="23" fill="#f6c12f" />
        {sun >= 0.99 && <path class="ef-smile" d="M-9 4q9 9 18 0M-7-5v1M7-5v1" stroke="#8a5300" stroke-width="2.5" fill="none" stroke-linecap="round" />}
      </g>
      <g class="ef-cloud" style={{ transform: `translateX(${sun * 120}px)`, opacity: 1 - sun * 0.85 }}>
        <ellipse cx="580" cy="46" rx="44" ry="20" fill="#8e939c" />
        <ellipse cx="610" cy="34" rx="30" ry="18" fill="#9da1a9" />
        <ellipse cx="552" cy="38" rx="24" ry="14" fill="#9da1a9" />
      </g>
      {/* Ground and road */}
      <rect x="0" y="196" width="640" height="44" fill="#8cc47c" />
      <rect x="0" y="210" width="640" height="18" fill="#6b7280" />
      <path d="M0 219h640" stroke="#f4f4f4" stroke-width="2" stroke-dasharray="14 12" />

      {/* Factory */}
      <g>
        <rect x="16" y="128" width="104" height="68" fill="#8a8f99" stroke="#4a5263" stroke-width="2" />
        <path d="M16 128l20-16v16l20-16v16l20-16v16" fill="#8a8f99" stroke="#4a5263" stroke-width="2" />
        <rect x="94" y="78" width="16" height="50" fill="#6c707a" stroke="#4a5263" stroke-width="2" />
        <rect x="26" y="146" width="16" height="14" fill="#f2d27a" />
        <rect x="50" y="146" width="16" height="14" fill="#f2d27a" />
        <rect x="74" y="146" width="16" height="14" fill="#f2d27a" />
        <rect x="96" y="168" width="16" height="28" fill="#4a5263" />
        <g class="ef-fade" opacity={(1 - f('factory')) * 0.95}>
          <circle class="ef-puff" cx="102" cy="70" r="10" fill="#4f545d" />
          <circle class="ef-puff ef-puff2" cx="102" cy="70" r="13" fill="#5b6069" />
          <circle class="ef-puff ef-puff3" cx="102" cy="70" r="16" fill="#666b74" />
        </g>
        <g transform={`translate(130 196) scale(${0.2 + f('factory') * 0.8})`} class="ef-grow">
          <rect x="-2.5" y="-22" width="5" height="22" fill="#7a5a3a" />
          <circle cx="0" cy="-30" r="13" fill="#3f8f4a" />
        </g>
      </g>

      {/* Bee farm and orchard */}
      <g>
        <rect x="150" y="160" width="34" height="36" rx="6" fill="#e7b53c" stroke="#8a5300" stroke-width="2" />
        <path d="M150 172h34M150 184h34" stroke="#8a5300" stroke-width="2" />
        <circle cx="167" cy="166" r="3" fill="#5b4636" />
        <rect x="219" y="140" width="7" height="56" fill="#7a5a3a" />
        <circle cx="222" cy="128" r="24" fill="#4f9a4f" />
        {Array.from({ length: apples }, (_, i) => (
          <circle key={i} class="ef-pop" cx={[208, 228, 216, 236, 222][i]} cy={[122, 116, 136, 132, 126][i]} r="4" fill="#c8102e" />
        ))}
        {[160, 176, 192, 206, 240].map((x, i) => {
          const h = 6 + f('bees') * 16;
          return (
            <g key={x} class="ef-grow-y">
              <path d={`M${x} 200v-${h}`} stroke="#2f7d3a" stroke-width="2" />
              <circle cx={x} cy={200 - h} r={2.5 + f('bees') * 2.5} fill={i % 2 ? '#e85d9c' : '#f2b600'} />
            </g>
          );
        })}
        {Array.from({ length: bees }, (_, i) => (
          <g key={i} class={`ef-bee ef-bee${i}`} transform={`translate(${170 + i * 18} ${118 + (i % 2) * 14})`}>
            <ellipse rx="5" ry="3.5" fill="#f2b600" stroke="#1a1f29" stroke-width="1" />
            <path d="M-1 -3v6M2 -3v6" stroke="#1a1f29" stroke-width="1.3" />
            <ellipse cx="-1" cy="-5" rx="3" ry="2" fill="#ffffff" opacity="0.85" />
          </g>
        ))}
      </g>

      {/* Party house */}
      <g>
        <rect x="262" y="138" width="66" height="58" fill="#b48ad6" stroke="#5a3f75" stroke-width="2" />
        <path d="M256 140l39-30 39 30z" fill="#7a5aa0" stroke="#5a3f75" stroke-width="2" />
        <rect x="272" y="150" width="18" height="16" fill={f('party') >= 0.99 ? '#5b6475' : '#ffe066'} class="ef-fade" />
        <rect x="300" y="150" width="18" height="16" fill={f('party') >= 0.99 ? '#5b6475' : '#ffe066'} class="ef-fade" />
        <rect x="288" y="174" width="14" height="22" fill="#5a3f75" />
        <g class="ef-fade" opacity={1 - f('party')}>
          <text class="ef-note" x="330" y="128" font-size="20" fill="#5a3f75" aria-hidden="true">♪</text>
          <text class="ef-note ef-note2" x="342" y="140" font-size="18" fill="#5a3f75" aria-hidden="true">♫</text>
          <text class="ef-note ef-note3" x="262" y="122" font-size="18" fill="#5a3f75" aria-hidden="true">♪</text>
          <path d="M336 160q8 10 0 20M343 156q12 14 0 28" stroke="#5a3f75" stroke-width="2.5" fill="none" />
        </g>
        <g class="ef-fade" opacity={f('party')}>
          <text class="ef-zzz" x="334" y="126" font-size="15" font-weight="700" fill="#1b3a6b" aria-hidden="true">z z z</text>
          <circle cx="335" cy="104" r="9" fill="#fff8d6" stroke="#8a5300" stroke-width="1.5" />
          <circle cx="339" cy="101" r="7" fill="#a9c4e8" />
        </g>
      </g>

      {/* Vaccine clinic */}
      <g>
        <rect x="368" y="126" width="72" height="70" fill="#f3f6fb" stroke="#1b3a6b" stroke-width="2" />
        <rect x="364" y="120" width="80" height="10" fill="#1b3a6b" />
        <rect x="391" y="135" width="26" height="26" rx="4" fill="#1e6b3a" />
        <path d="M404 140v16M396 148h16" stroke="#fff" stroke-width="5" stroke-linecap="round" />
        <rect x="397" y="172" width="14" height="24" fill="#1b3a6b" />
        <People x={372} n={1 + Math.round(f('clinic') * 4)} tone="#1e6b3a" />
        <g class="ef-fade" opacity={f('clinic')}>
          <path class="ef-heart" d="M436 108c-3-5-10-2-7 3l7 7 7-7c3-5-4-8-7-3z" fill="#c8102e" />
        </g>
      </g>

      {/* Cigarette kiosk and bus stop */}
      <g>
        <rect x="460" y="150" width="46" height="46" fill="#d9a066" stroke="#7a5a3a" stroke-width="2" />
        <path d="M456 150h54l-4-12h-46z" fill="#c8102e" />
        <path d="M466 138v12M478 138v12M490 138v12M502 138v12" stroke="#ffffff" stroke-width="3" />
        <rect x="466" y="160" width="34" height="14" fill="#fff3d6" />
        <path d="M520 150v46" stroke="#4a5263" stroke-width="3" />
        <rect x="512" y="140" width="16" height="12" rx="2" fill="#1b3a6b" />
        <People x={516} n={1} tone="#4a5263" />
        <g class="ef-fade" opacity={1 - f('kiosk')}>
          <path class="ef-wisp" d="M522 172q-6-8 0-14t0-14" stroke="#6c707a" stroke-width="3" fill="none" stroke-linecap="round" />
          <path class="ef-wisp ef-wisp2" d="M528 170q6-8 0-14t0-14" stroke="#8a8f99" stroke-width="3" fill="none" stroke-linecap="round" />
        </g>
        <g class="ef-fade" opacity={f('kiosk')}>
          <circle cx="483" cy="122" r="11" fill="none" stroke="#1e6b3a" stroke-width="2.5" />
          <path d="M478 122l3 3 6-7" stroke="#1e6b3a" stroke-width="2.5" fill="none" />
        </g>
      </g>

      {/* College */}
      <g>
        <rect x="544" y="122" width="84" height="74" fill="#e9d9b8" stroke="#7a5a3a" stroke-width="2" />
        <path d="M538 124l48-28 48 28z" fill="#b8865a" stroke="#7a5a3a" stroke-width="2" />
        <rect x="554" y="136" width="14" height="16" fill="#a9c4e8" />
        <rect x="604" y="136" width="14" height="16" fill="#a9c4e8" />
        <rect x="578" y="166" width="16" height="30" fill="#7a5a3a" />
        <path d="M586 96v-22" stroke="#4a5263" stroke-width="2" />
        <path class="ef-flag" d="M586 74h16l-4 5 4 5h-16z" fill="#1b3a6b" />
        <People x={548} n={1 + Math.round(f('school') * 4)} tone="#1b3a6b" hats />
      </g>

      {/* Where we are looking now, and places already spotted */}
      {props.focus && (
        <rect class="ef-focus" x={SPOT_BOX[props.focus].x} y="64" width={SPOT_BOX[props.focus].w} height="142" rx="10" fill="none" stroke="#c8102e" stroke-width="3" stroke-dasharray="8 6" />
      )}
      {props.spotted && SPOTS.filter((s) => props.spotted!.has(s)).map((s) => (
        <g key={s} class="ef-pop" transform={`translate(${SPOT_BOX[s].x + SPOT_BOX[s].w - 14} 78)`}>
          <circle r="11" fill="#1e6b3a" stroke="#fff" stroke-width="2" />
          <path d="M-5 0l3.5 3.5 6.5-7" stroke="#fff" stroke-width="2.5" fill="none" />
        </g>
      ))}
    </svg>
  );
}

function SunMeter(props: { fixed: number; total: number }) {
  return (
    <p class="ef-meter small" style={{ margin: 0 }}>
      <span class="ef-meter-bar" aria-hidden="true"><span style={{ width: `${Math.round((props.fixed / props.total) * 100)}%` }} /></span>
      <span><strong>{props.fixed}</strong> of {props.total} places in town fixed.</span>
    </p>
  );
}

// ---------------- Level 1: what spills over? ----------------

const EXT_ICON: Record<Ext, string> = { 'neg-prod': '☁️🏭', 'neg-cons': '☁️🛒', 'pos-prod': '☀️🏭', 'pos-cons': '☀️🛒' };

/** A tiny diagram of each gap, so the choice is a picture as well as words. */
function MiniGap({ gap }: { gap: Gap }) {
  const cost = gap.startsWith('msc');
  const above = gap.endsWith('above');
  // Private curve in solid ink, social curve dashed red, with an arrow from private to social.
  const priv = cost ? 'M10 52L70 16' : 'M10 16L70 52';
  const soc = cost ? (above ? 'M10 38L60 8' : 'M20 58L74 26') : above ? 'M20 8L74 38' : 'M8 30L56 58';
  return (
    <svg class="ef-mini" viewBox="0 0 80 64" aria-hidden="true">
      <path d="M6 4v56h72" stroke="#1a1f29" stroke-width="2" fill="none" />
      <path d={priv} stroke={cost ? '#1e6b3a' : '#1b3a6b'} stroke-width="3" fill="none" />
      <path d={soc} stroke="#c8102e" stroke-width="3" stroke-dasharray="5 4" fill="none" />
      <path d={above ? 'M42 30v-12' : 'M42 32v12'} stroke="#c8102e" stroke-width="2" />
      <path d={above ? 'M38 22l4-5 4 5' : 'M38 40l4 5 4-5'} stroke="#c8102e" stroke-width="2" fill="none" />
    </svg>
  );
}

function Spotter({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const items = useMemo(() => shuffled(data.scenarios, seed + 3), [data.scenarios, seed]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'type' | 'gap' | 'solved'>('type');
  const [missed, setMissed] = useState(false);
  const [wrongExt, setWrongExt] = useState<Ext | null>(null);
  const [wrongGap, setWrongGap] = useState<Gap | null>(null);
  const [firstRight, setFirstRight] = useState(0);
  const [spotted, setSpotted] = useState<Set<Spot>>(new Set());
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const s = items[idx];
  const goal = Math.min(SPOT_GOAL, items.length);

  const pickExt = (e: Ext) => {
    if (phase !== 'type') return;
    if (e === s.ext) {
      play('correct');
      setWrongExt(null);
      setPhase('gap');
      setAnnounce(`Right: ${data.extNames[e]}. Now pick the diagram gap.`);
    } else {
      play('wrong');
      setMissed(true);
      setWrongExt(e);
      setAnnounce(`Not ${data.extNames[e]}. ${extHint(e)}`);
    }
  };

  const extHint = (e: Ext) => {
    const hints: string[] = [];
    if (isNegative(e) !== isNegative(s.ext)) hints.push(data.signWrong);
    if (isProduction(e) !== isProduction(s.ext)) hints.push(data.sideWrong);
    return hints.join(' ');
  };

  const pickGap = (g: Gap) => {
    if (phase !== 'gap') return;
    if (g === gapFor(s.ext)) {
      play('stamp');
      setWrongGap(null);
      setPhase('solved');
      if (!missed) setFirstRight((n) => n + 1);
      if (s.spot) setSpotted(new Set([...spotted, s.spot]));
      setAnnounce(`Right: ${data.gapNames[g]}.`);
    } else {
      play('wrong');
      setMissed(true);
      setWrongGap(g);
      setAnnounce(`Not ${data.gapNames[g]}. ${data.gapWrong}`);
    }
  };

  const next = () => {
    play('whoosh');
    setPhase('type');
    setMissed(false);
    setWrongExt(null);
    setWrongGap(null);
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setAnnounce('A new scenario.');
    } else {
      setDone(true);
      onComplete();
      if (spotWon(firstRight, goal)) win(onGoal, 1);
    }
  };

  if (done) {
    const won = spotWon(firstRight, goal);
    return (
      <div class="stack">
        <Town fix={{}} spotted={spotted} />
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'Every spillover spotted!' : 'Scenarios finished.'}</strong> Right first time: {firstRight} of {items.length}.
          </p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[0]} stamp needs {goal} right first time. Play again: the scenarios come in a new order.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  const answerGap = gapFor(s.ext);
  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1. Scenario {idx + 1} of {items.length}. Right first time: {firstRight} (goal {goal}).
      </p>
      <section class="panel stack" aria-labelledby="ef-read-h">
        <h3 id="ef-read-h"><StepNo n={2} /> Read the scenario</h3>
        <Town fix={{}} focus={s.spot} spotted={spotted} />
        <div key={s.id} class="ef-scenario ef-in">
          <span class="ef-scenario-icon" aria-hidden="true">{s.icon}</span>
          <p style={{ margin: 0 }}>{s.text}</p>
        </div>
      </section>

      <section class="panel stack" aria-labelledby="ef-type-h">
        <h3 id="ef-type-h"><StepNo n={3} /> Name the externality</h3>
        <p class="small muted" style={{ margin: 0 }}>☁️ harms third parties, ☀️ helps them. 🏭 comes from making the good, 🛒 from using it.</p>
        <div class="ef-grid2" role="group" aria-label="Kinds of externality">
          {EXTS.map((e) => (
            <button
              key={e}
              type="button"
              class={`choice-btn ef-choice ${wrongExt === e ? 'shake chosen' : ''} ${phase !== 'type' && s.ext === e ? 'choice-right' : ''}`}
              disabled={phase !== 'type'}
              onClick={() => pickExt(e)}
            >
              <span class="ef-choice-icon" aria-hidden="true">{EXT_ICON[e]}</span>
              <span>{data.extNames[e]}</span>
              {teacher && phase === 'type' && s.ext === e && <Answer />}
            </button>
          ))}
        </div>
        {phase === 'type' && wrongExt && <Fb ok={false}>Not a {data.extNames[wrongExt].toLowerCase()}. {extHint(wrongExt)}</Fb>}
      </section>

      {phase !== 'type' && (
        <section class="panel stack" aria-labelledby="ef-gap-h">
          <h3 id="ef-gap-h"><StepNo n={4} /> Pick the diagram gap</h3>
          <p class="small muted" style={{ margin: 0 }}>Which curve would you draw for society, and where? The red dashed line is the social curve.</p>
          <div class="ef-grid2" role="group" aria-label="Diagram gaps">
            {GAPS.map((g) => (
              <button
                key={g}
                type="button"
                class={`choice-btn ef-gap ${wrongGap === g ? 'shake chosen' : ''} ${phase === 'solved' && answerGap === g ? 'choice-right' : ''}`}
                disabled={phase !== 'gap'}
                onClick={() => pickGap(g)}
              >
                <MiniGap gap={g} />
                <span>
                  <strong>{data.gapNames[g]}</strong>
                  <span class="small" style={{ display: 'block' }}>{data.gapHints[g]}</span>
                </span>
                {teacher && phase === 'gap' && answerGap === g && <Answer />}
              </button>
            ))}
          </div>
          {phase === 'gap' && wrongGap && (
            <Fb ok={false}>{data.gapNames[wrongGap]} is not right for a {data.extNames[s.ext].toLowerCase()}. {data.gapWrong}</Fb>
          )}
          {phase === 'solved' && (
            <div class="callout callout-ok stack" role="status">
              <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                <MarkIcon /> <span><strong>{data.extNames[s.ext]}: {data.gapNames[answerGap]}.</strong> <Md text={s.why} inline /></span>
              </p>
              <div><button class="btn" onClick={next}>{idx + 1 < items.length ? 'Next scenario' : 'Finish'}</button></div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ---------------- Market diagram ----------------

/** A place for a curve's label: near the right of the plot, kept inside it. */
function labelSpot(line: Line, xMax: number, yMax: number, frac = 0.86): Pt {
  let q = xMax * frac;
  let p = priceAt(line, q);
  if (p < yMax * 0.08) {
    p = yMax * 0.08;
    q = quantityAt(line, p);
  } else if (p > yMax * 0.94) {
    p = yMax * 0.94;
    q = quantityAt(line, p);
  }
  return { q, p };
}

function curveNames(ext: Ext) {
  return isProduction(ext)
    ? { mpb: 'MPB = MSB', mpc: 'MPC', social: 'MSC' }
    : { mpb: 'MPB', mpc: 'MPC = MSC', social: 'MSB' };
}

function CurveLabel(props: { line: Line; xMax: number; yMax: number; text: string; tone: Tone; dy?: number; frac?: number }) {
  const at = labelSpot(props.line, props.xMax, props.yMax, props.frac);
  const down = props.line.b.p < props.line.a.p;
  return <Label at={at} text={props.text} tone={props.tone} dx={6} dy={props.dy ?? (down ? 18 : -8)} bold size={15} />;
}

const SHIFT_LABEL: Record<Tool, string> = {
  tax: 'MPC + tax',
  subsidy: 'MPC − subsidy',
  awareness: 'MPB after campaign',
  provision: 'Supply with provision',
  regulation: 'Legal limit',
  permits: 'Permit cap',
};

function MarketDiagram(props: { m: MarketData; tool?: Tool; size?: number; numbers?: boolean }) {
  const { m, tool, size } = props;
  const names = curveNames(m.ext);
  const e = marketPoint(m);
  const o = optimum(m);
  const now = tool !== undefined && size !== undefined ? outcome(m, tool, size) : e;
  const loss = lossAt(m, now.q);
  const tri = lossTriangle(m, now.q);
  const shifted = tool !== undefined && size !== undefined && size > 0 ? shiftedCurve(m, tool, size) : null;
  const cap = (tool === 'regulation' || tool === 'permits') && size !== undefined && size < e.q - 1e-9;
  const hi = priceAt(m.social, e.q), lo = priceAt(privateLine(m), e.q);
  let description = `${names.mpb} slopes down. ${names.mpc} slopes up. ${names.social} is ${
    m.ext === 'neg-prod' ? 'above MPC' : m.ext === 'pos-prod' ? 'below MPC' : m.ext === 'neg-cons' ? 'below MPB' : 'above MPB'
  }. The market makes Qm = ${fmt(e.q)} ${m.unit}. The social optimum Q* is ${fmt(o.q)} ${m.unit}.`;
  if (props.numbers) {
    description = `${names.mpb} slopes down. ${names.mpc} slopes up. ${names.social} is the social curve. The market makes Qm = ${fmt(e.q)}. At Qm, the two curves are at $${fmt(lo)} and $${fmt(hi)}. The social optimum Q* is ${fmt(o.q)}. The triangle between Q* and Qm is shaded.`;
  } else if (tool && size !== undefined) {
    description += ` With the policy, output is ${fmt(now.q)} ${m.unit}.`;
  }
  const ticks = (max: number, step: number) => Array.from({ length: Math.floor(max / step) }, (_, i) => (i + 1) * step);
  const yStep = m.yMax > 24 ? 6 : 4;
  return (
    <Diagram
      xMax={m.xMax}
      yMax={m.yMax}
      xLabel="Quantity"
      yLabel="Price, costs, benefits ($)"
      title={`The market: ${m.title}`}
      description={description}
      xTicks={props.numbers ? undefined : ticks(m.xMax, m.xMax > 80 ? 20 : 10)}
      yTicks={props.numbers ? undefined : ticks(m.yMax, yStep)}
      formatY={(v) => `${v}`}
    >
      {loss > 1e-6 && <Area points={tri} tone="red" pattern="hatch" />}
      {!props.numbers && (
        <>
          <Guide at={e} toY={false} />
          <Label at={{ q: e.q, p: m.yMax * 0.03 }} text="Qm" dx={4} bold size={14} />
          <Guide at={o} toY={false} tone="green" />
          <Label at={{ q: o.q, p: m.yMax * 0.1 }} text="Q*" tone="green" dx={4} bold size={14} />
        </>
      )}
      {props.numbers && (
        <>
          <Guide at={{ q: e.q, p: lo }} xText={fmt(e.q)} yText={fmt(lo)} />
          <Guide at={{ q: e.q, p: hi }} yText={fmt(hi)} toX={false} />
          <Guide at={o} xText={fmt(o.q)} toY={false} />
          <Label at={{ q: e.q, p: m.yMax * 0.03 }} text="Qm" dx={4} bold size={14} />
          <Label at={{ q: o.q, p: m.yMax * 0.03 }} text="Q*" dx={4} bold size={14} />
        </>
      )}
      <Curve line={m.mpb} tone="navy" />
      <Curve line={m.mpc} tone="green" />
      <Curve line={m.social} tone="red" dashed />
      <CurveLabel line={m.mpb} xMax={m.xMax} yMax={m.yMax} text={names.mpb} tone="navy" />
      <CurveLabel line={m.mpc} xMax={m.xMax} yMax={m.yMax} text={names.mpc} tone="green" />
      <CurveLabel line={m.social} xMax={m.xMax} yMax={m.yMax} text={names.social} tone="red" />
      {shifted && (
        <>
          <Curve line={shifted.line} tone="ink" dashed width={2.5} />
          <CurveLabel line={shifted.line} xMax={m.xMax} yMax={m.yMax} text={SHIFT_LABEL[tool!]} tone="ink" frac={0.55} dy={shifted.which === 'mpb' ? 22 : -10} />
        </>
      )}
      {cap && (
        <>
          <Curve points={[{ q: size!, p: 0 }, { q: size!, p: m.yMax * 0.9 }]} tone="ink" dashed width={2.5} />
          <Label at={{ q: size!, p: m.yMax * 0.92 }} text={SHIFT_LABEL[tool!]} anchor="middle" bold size={14} />
        </>
      )}
      {loss > 1e-6 && props.numbers && <Label at={{ q: (o.q + e.q) / 2, p: m.yMax * 0.97 }} text="Welfare loss?" tone="red" anchor="middle" bold size={14} />}
      <Dot at={e} />
      {tool !== undefined && size !== undefined && Math.abs(now.q - e.q) > 1e-6 && <Dot at={now} tone="red" label="Now" />}
    </Diagram>
  );
}

// ---------------- Level 2: fix the town ----------------

function sizeText(tool: Tool, v: number, unit: string) {
  if (tool === 'tax' || tool === 'subsidy' || tool === 'awareness') return `${money(v)} per unit`;
  if (tool === 'provision') return `${fmt(v)} ${unit}`;
  return `${fmt(v)} ${unit}`;
}

function Fixer({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const markets = useMemo(() => shuffled(data.markets, seed + 7), [data.markets, seed]);
  const [idx, setIdx] = useState(0);
  const [tool, setTool] = useState<Tool | null>(null);
  const [wrongTool, setWrongTool] = useState<Tool | null>(null);
  const [missed, setMissed] = useState(false);
  const [size, setSize] = useState(0);
  const [verdict, setVerdict] = useState<'small' | 'big' | null>(null);
  const [solved, setSolved] = useState(false);
  const [firstRight, setFirstRight] = useState(0);
  const [fixed, setFixed] = useState<Set<Spot>>(new Set());
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const m = markets[idx];
  const isCap = (t: Tool) => t === 'regulation' || t === 'permits';
  const startSize = (t: Tool) => (isCap(t) ? m.slider.max : m.slider.min);
  const now = tool ? outcome(m, tool, size) : marketPoint(m);
  const close = tool ? closeness(m, now.q) : 0;

  const fix: Partial<Record<Spot, number>> = {};
  fixed.forEach((s) => (fix[s] = 1));
  if (!done) fix[m.spot] = solved ? 1 : close;

  const options = useMemo(() => shuffled(m.options, seed + idx * 13 + 1), [m, seed, idx]);

  const chooseTool = (t: Tool) => {
    if (tool) return;
    const opt = m.options.find((o) => o.tool === t)!;
    if (t === m.tool) {
      play('correct');
      setTool(t);
      setWrongTool(null);
      setSize(startSize(t));
      setAnnounce(`Right: ${data.toolNames[t]}. Now set its size.`);
    } else {
      play('wrong');
      setMissed(true);
      setWrongTool(t);
      setAnnounce(opt.feedback);
    }
  };

  const move = (v: number) => {
    const { min, max, step } = m.slider;
    const snapped = Math.round(Math.max(min, Math.min(max, v)) / step) * step;
    setSize(snapped);
    setVerdict(null);
  };

  const apply = () => {
    if (!tool || solved) return;
    const v = sizeVerdict(m, tool, size, m.slider.step);
    if (v === 'right') {
      play('coin');
      celebrate({ size: 'small' });
      setSolved(true);
      setVerdict(null);
      if (!missed) setFirstRight((n) => n + 1);
      setFixed(new Set([...fixed, m.spot]));
      setAnnounce(`Fixed. Output is at Q*, ${fmt(optimum(m).q)} ${m.unit}.`);
    } else {
      play('wrong');
      setMissed(true);
      setVerdict(v);
      setAnnounce(v === 'small' ? data.sizeSmall : data.sizeBig);
    }
  };

  const next = () => {
    play('whoosh');
    setTool(null);
    setWrongTool(null);
    setMissed(false);
    setVerdict(null);
    setSolved(false);
    setSize(0);
    if (idx + 1 < markets.length) {
      setIdx(idx + 1);
      setAnnounce('A new market.');
    } else {
      setDone(true);
      onComplete();
      if (fixWon(firstRight)) win(onGoal, 2);
    }
  };

  if (done) {
    const won = fixWon(firstRight);
    return (
      <div class="stack">
        <Town fix={Object.fromEntries([...fixed].map((s) => [s, 1]))} />
        <SunMeter fixed={fixed.size} total={SPOTS.length} />
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'The sun is out over the whole town!' : 'Every market is fixed.'}</strong> Fixed right first time: {firstRight} of {markets.length}.
          </p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[1]} stamp needs {FIX_GOAL} right first time: the right policy and the right size on your first try. Play again: the markets come in a new order.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  const right = rightSize(m, m.tool);
  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2. Market {idx + 1} of {markets.length}. Fixed right first time: {firstRight} (goal {FIX_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="ef-brief-h">
        <h3 id="ef-brief-h"><StepNo n={2} /> Read the brief: {m.title}</h3>
        <Town fix={fix} focus={m.spot} />
        <SunMeter fixed={fixed.size} total={SPOTS.length} />
        <div key={m.id} class="ef-scenario ef-in">
          <span class="ef-scenario-icon" aria-hidden="true">{m.icon}</span>
          <p style={{ margin: 0 }}>{m.brief}</p>
        </div>
      </section>

      <div class="play">
        <section class="panel stack" aria-labelledby="ef-diag-h">
          <h3 id="ef-diag-h" class="sr-only">The market diagram</h3>
          <MarketDiagram m={m} tool={tool ?? undefined} size={tool ? size : undefined} />
          <p class="small muted" style={{ margin: 0 }}>
            The red dashed line is the social curve. The hatched triangle is the welfare loss. Your goal: move output to Q*.
          </p>
        </section>

        <div class="stack">
          <section class="panel stack" aria-labelledby="ef-tool-h">
            <h3 id="ef-tool-h"><StepNo n={3} /> Choose the policy</h3>
            <div class="stack" role="group" aria-label="Policies" style={{ gap: 8 }}>
              {options.map((o) => (
                <button
                  key={o.tool}
                  type="button"
                  class={`choice-btn ${wrongTool === o.tool ? 'shake chosen' : ''} ${tool === o.tool ? 'choice-right' : ''}`}
                  disabled={!!tool}
                  onClick={() => chooseTool(o.tool)}
                >
                  <strong>{data.toolNames[o.tool]}</strong>
                  <span class="small" style={{ display: 'block' }}>{data.toolHow[o.tool]}</span>
                  {teacher && !tool && o.tool === m.tool && <Answer />}
                </button>
              ))}
            </div>
            {!tool && wrongTool && <Fb ok={false}><Md text={m.options.find((o) => o.tool === wrongTool)!.feedback} inline /></Fb>}
            {tool && <Fb ok><Md text={m.options.find((o) => o.tool === tool)!.feedback} inline /></Fb>}
          </section>

          {tool && (
            <section class="panel stack" aria-labelledby="ef-size-h">
              <h3 id="ef-size-h"><StepNo n={4} /> Set the size</h3>
              <div>
                <label for="ef-size">
                  {data.sizeNames[tool]}: <strong>{sizeText(tool, size, m.unit)}</strong>
                </label>
                <div class="row" style={{ flexWrap: 'nowrap' }}>
                  <button class="btn btn-secondary btn-sm" aria-label="Smaller" disabled={solved || size <= m.slider.min} onClick={() => move(size - m.slider.step)}>−</button>
                  <input
                    id="ef-size"
                    type="range"
                    min={m.slider.min}
                    max={m.slider.max}
                    step={m.slider.step}
                    value={size}
                    disabled={solved}
                    aria-valuetext={sizeText(tool, size, m.unit)}
                    onInput={(ev) => move(Number((ev.target as HTMLInputElement).value))}
                  />
                  <button class="btn btn-secondary btn-sm" aria-label="Bigger" disabled={solved || size >= m.slider.max} onClick={() => move(size + m.slider.step)}>+</button>
                </div>
                {teacher && !solved && <span class="badge badge-done">Answer: {sizeText(tool, right, m.unit)}</span>}
              </div>
              <div class="ef-readout" role="status">
                <div class="stat"><span>Output now</span><b>{fmt(now.q)} {m.unit}</b></div>
                <div class="stat"><span>Social optimum Q*</span><b>{fmt(optimum(m).q)} {m.unit}</b></div>
                <div class="stat">
                  <span>Town</span>
                  <b>{close >= 0.999 ? 'at Q*' : close >= 0.6 ? 'getting close' : 'still a problem'}</b>
                </div>
              </div>
              {!solved && (
                <div><button class="btn" onClick={apply}>Apply the policy</button></div>
              )}
              {verdict && !solved && (
                <Fb ok={false}>{verdict === 'small' ? data.sizeSmall : data.sizeBig} {isCap(tool) ? '' : data.sizeTip}</Fb>
              )}
              {solved && (
                <div class="callout callout-ok stack" role="status">
                  <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                    <MarkIcon /> <span><strong>Fixed!</strong> <Md text={m.fixed} inline /></span>
                  </p>
                  <div><button class="btn" onClick={next}>{idx + 1 < markets.length ? 'Next market' : 'Finish'}</button></div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Level 3: welfare judge (HL) ----------------

type JudgePhase = 'calc' | 'strength' | 'limit' | 'solved';

function Judge({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const rounds = useMemo(() => shuffled(data.rounds, seed + 19), [data.rounds, seed]);
  const [ri, setRi] = useState(0);
  const [phase, setPhase] = useState<JudgePhase>('calc');
  const [typed, setTyped] = useState('');
  const [calcMissed, setCalcMissed] = useState(false);
  const [calcFb, setCalcFb] = useState<string | null>(null);
  const [sPick, setSPick] = useState<number | null>(null);
  const [sMissed, setSMissed] = useState(false);
  const [lPick, setLPick] = useState<number | null>(null);
  const [lMissed, setLMissed] = useState(false);
  const [points, setPoints] = useState(0);
  const [judged, setJudged] = useState<Set<Spot>>(new Set());
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const r = rounds[ri];
  const max = rounds.length * POINTS_PER_JUDGE_ROUND;
  const answer = welfareLoss(r);
  const e = marketPoint(r), o = optimum(r);
  const base = Math.abs(e.q - o.q), height = gapAt(r, e.q);
  const strengths = useMemo(() => shuffled(r.strengths, seed + ri * 5 + 2), [r, seed, ri]);
  const limits = useMemo(() => shuffled(r.limits, seed + ri * 5 + 3), [r, seed, ri]);

  const check = () => {
    if (phase !== 'calc') return;
    const v = parseNumber(typed);
    if (Number.isNaN(v)) {
      setCalcFb('Type a number, for example 45.');
      return;
    }
    if (numberRight(v, answer)) {
      play('correct');
      if (!calcMissed) setPoints((p) => p + 1);
      setCalcFb(null);
      setPhase('strength');
      setAnnounce(`Right. The welfare loss is ${money(answer)}. Now pick a strength.`);
      return;
    }
    play('wrong');
    setCalcMissed(true);
    const slip = lossMistakes(r).find((x) => numberRight(v, x.value));
    const text = slip ? data.calcText[slip.kind] : data.calcText.other;
    setCalcFb(text);
    setAnnounce(text);
  };

  const pickStrength = (i: number) => {
    if (phase !== 'strength') return;
    setSPick(i);
    if (strengths[i].correct) {
      play('correct');
      if (!sMissed) setPoints((p) => p + 1);
      setPhase('limit');
      setAnnounce(`${strengths[i].feedback} Now pick a limitation.`);
    } else {
      play('wrong');
      setSMissed(true);
      setAnnounce(strengths[i].feedback);
    }
  };

  const pickLimit = (i: number) => {
    if (phase !== 'limit') return;
    setLPick(i);
    if (limits[i].correct) {
      play('stamp');
      if (!lMissed) setPoints((p) => p + 1);
      setPhase('solved');
      setJudged(new Set([...judged, r.spot]));
      setAnnounce(limits[i].feedback);
    } else {
      play('wrong');
      setLMissed(true);
      setAnnounce(limits[i].feedback);
    }
  };

  const next = () => {
    play('whoosh');
    setPhase('calc');
    setTyped('');
    setCalcMissed(false);
    setCalcFb(null);
    setSPick(null);
    setSMissed(false);
    setLPick(null);
    setLMissed(false);
    if (ri + 1 < rounds.length) {
      setRi(ri + 1);
      setAnnounce('A new diagram.');
    } else {
      setDone(true);
      onComplete();
      if (judgeWon(points)) win(onGoal, 3);
    }
  };

  const fix = Object.fromEntries([...judged].map((s) => [s, 1]));

  if (done) {
    const won = judgeWon(points);
    return (
      <div class="stack">
        <Town fix={fix} />
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'A wise judge!' : 'Judging finished.'}</strong> First-try points: {points} of {max}.
          </p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[2]} stamp needs {JUDGE_GOAL} points. Play again: the diagrams come in a new order.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  const pickList = (list: Opt[], pick: number | null, solvedHere: boolean, onPick: (i: number) => void, label: string) => (
    <div class="stack" role="group" aria-label={label} style={{ gap: 8 }}>
      {list.map((opt, i) => (
        <button
          key={`${r.id}-${label}-${i}`}
          type="button"
          class={`choice-btn ${pick === i && !opt.correct ? 'shake chosen' : ''} ${solvedHere && opt.correct ? 'choice-right' : ''}`}
          disabled={solvedHere}
          onClick={() => onPick(i)}
        >
          {opt.text}
          {teacher && !solvedHere && opt.correct && <Answer />}
        </button>
      ))}
      {pick !== null && <Fb ok={!!list[pick].correct}>{list[pick].feedback}</Fb>}
    </div>
  );

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3 (HL). Diagram {ri + 1} of {rounds.length}. First-try points: {points} of {max} (goal {JUDGE_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="ef-case-h">
        <h3 id="ef-case-h"><StepNo n={2} /> Read the case: {r.title}</h3>
        <Town fix={fix} focus={r.spot} />
        <div key={r.id} class="ef-scenario ef-in">
          <span class="ef-scenario-icon" aria-hidden="true">{r.icon}</span>
          <p style={{ margin: 0 }}>{r.story} <strong>Policy: {r.policy}.</strong></p>
        </div>
      </section>

      <div class="play">
        <section class="panel stack" aria-labelledby="ef-num-h">
          <h3 id="ef-num-h" class="sr-only">The diagram with numbers</h3>
          <MarketDiagram m={r} numbers />
        </section>

        <div class="stack">
          <section class="panel stack" aria-labelledby="ef-calc-h">
            <h3 id="ef-calc-h"><StepNo n={3} /> Calculate the welfare loss</h3>
            <p class="small muted" style={{ margin: 0 }}>Welfare loss = 1/2 × base × height. Read the numbers on the diagram.</p>
            <div class="row">
              <label for="ef-calc">Welfare loss ($)</label>
              <input
                id="ef-calc"
                type="text"
                inputMode="decimal"
                class="ef-input"
                value={typed}
                disabled={phase !== 'calc'}
                onInput={(ev) => setTyped((ev.target as HTMLInputElement).value)}
                onKeyDown={(ev) => ev.key === 'Enter' && check()}
              />
              {phase === 'calc' && <button class="btn" onClick={check}>Check</button>}
              {teacher && phase === 'calc' && <span class="badge badge-done">Answer: {fmt(answer)}</span>}
            </div>
            {phase === 'calc' && calcFb && <Fb ok={false}><Md text={calcFb} inline /></Fb>}
            {phase !== 'calc' && (
              <Fb ok>
                1/2 × ({fmt(Math.max(e.q, o.q))} − {fmt(Math.min(e.q, o.q))}) × {fmt(height)} = 1/2 × {fmt(base)} × {fmt(height)} = <strong>{money(answer)}</strong>
              </Fb>
            )}
          </section>

          {phase !== 'calc' && (
            <section class="panel stack" aria-labelledby="ef-str-h">
              <h3 id="ef-str-h"><StepNo n={4} /> Pick a strength of the {r.policy.toLowerCase()}</h3>
              {pickList(strengths, sPick, phase !== 'strength', pickStrength, 'Strengths')}
            </section>
          )}

          {(phase === 'limit' || phase === 'solved') && (
            <section class="panel stack" aria-labelledby="ef-lim-h">
              <h3 id="ef-lim-h"><StepNo n={5} /> Pick a limitation</h3>
              {pickList(limits, lPick, phase !== 'limit', pickLimit, 'Limitations')}
              {phase === 'solved' && <div><button class="btn" onClick={next}>{ri + 1 < rounds.length ? 'Next diagram' : 'Finish'}</button></div>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Learn it ----------------

const LEARN_SPEC: DiagramSpec = {
  xMax: 100,
  yMax: 24,
  xLabel: 'Quantity',
  yLabel: 'Price, costs, benefits ($)',
  title: 'A negative externality of production',
  description:
    'Demand is MPB = MSB, sloping down. Supply is MPC, sloping up. MSC is above MPC by the external cost. The market makes Qm where MPB = MPC. The social optimum Q* is where MSB = MSC, at a smaller quantity. The welfare loss triangle between Q* and Qm is shaded.',
  areas: [{ points: [{ q: 40, p: 12 }, { q: 60, p: 14 }, { q: 60, p: 8 }], tone: 'red', pattern: 'hatch' }],
  guides: [{ at: { q: 60, p: 8 }, xText: 'Qm', yText: 'Pm' }, { at: { q: 40, p: 12 }, xText: 'Q*', yText: 'P*' }],
  curves: [
    { line: { a: { q: 0, p: 20 }, b: { q: 100, p: 0 } }, tone: 'navy', label: 'MPB = MSB', labelOffset: { dx: -120, dy: -14 } },
    { line: { a: { q: 0, p: 2 }, b: { q: 100, p: 12 } }, tone: 'green', label: 'MPC' },
    { line: { a: { q: 0, p: 8 }, b: { q: 100, p: 18 } }, tone: 'red', label: 'MSC' },
  ],
  arrows: [{ from: { q: 62, p: 19.6 }, to: { q: 56, p: 12.8 }, tone: 'red' }],
  texts: [{ at: { q: 52, p: 21 }, text: 'Welfare loss', tone: 'red', anchor: 'start' }],
};

function LearnDiagram() {
  return <SpecDiagram spec={LEARN_SPEC} />;
}

export { Try, LearnDiagram };
