/**
 * Money River (1.1): the circular flow of income as a river system.
 *
 * Level 1: label the four channels between households and firms; when all are right, coins and goods flow.
 * Then spot which flow each scenario shows.
 * Level 2: place the leakages (drains) and injections (springs) on the banks, government and foreign sector.
 * Level 3: compare leakages and injections and forecast national income; the river level rises or falls.
 */
import { useMemo, useState } from 'preact/hooks';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon, StepNo } from '../../shared/design/components';
import type { TryProps } from '../../shared/activity/types';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import type { LevelInfo } from '../../shared/activity/LevelPicker';
import { celebrate } from '../../shared/fun/celebrate';
import { reducedMotion } from '../../shared/fun/motion';
import { shuffled } from '../island-economy/model';
import {
  applyChange, buildWon, Change, Flow, FLOW_DIRECTION, FLOWS, FORECAST_GOAL, incomeChange, isLeakage, isMoney, LEAK_SPOT_GOAL, Pipe, PIPE_MISTAKES_ALLOWED,
  PIPE_SECTOR, PIPES, Sector, SECTORS, SPOT_GOAL, totalInjections, totalLeakages, Totals,
} from './model';
import './river.css';

const STAMP_NAMES = ['River Builder', 'Drain Spotter', 'Flow Forecaster'];

interface Round { id: string; story: string; totals: Totals; change?: { pipe: Pipe; by: number }; change2?: { pipe: Pipe; by: number } }
interface TryContent {
  levels: LevelInfo[];
  flowNames: Record<Flow, string>;
  flowDetails: Record<Flow, string>;
  spots: { id: string; text: string; answer: Flow; why: string }[];
  pipeNames: Record<Pipe, string>;
  sectorNames: Record<Sector, string>;
  pipeWhy: Record<Pipe, string>;
  leakSpots: { id: string; text: string; answer: Pipe }[];
  rounds: Round[];
  changeNames: Record<Change, string>;
}

function win(onGoal: (l?: number) => void, level: number) {
  setTimeout(() => {
    celebrate({ size: 'big' });
    onGoal(level);
  }, 400);
}

function Try({ content, onComplete, onGoal, stamps, teacher }: TryProps) {
  const data = content.try as unknown as TryContent;
  const [levelNo, setLevelNo] = useState(1);
  const [round, setRound] = useState(0);
  const pick = (n: number) => {
    setLevelNo(n);
    setRound((r) => r + 1);
  };
  const props = { data, onComplete, onGoal, teacher, seed: round, again: () => setRound((r) => r + 1) };
  return (
    <div class="stack">
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="flow" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <Build key={round} {...props} />}
      {levelNo === 2 && <Drains key={round} {...props} />}
      {levelNo === 3 && <Forecast key={round} {...props} />}
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

// ---------------- The river drawings ----------------

const VB = { w: 600, h: 380 };

/** Level 1 channels: outer loop for real flows, inner loop for money flows (the student is not told which is which). */
const CHANNEL: Record<Flow, { d: string; slot: { x: number; y: number }; text: { x: number; y: number } }> = {
  factors: { d: 'M60 150 V40 H540 V150', slot: { x: 300, y: 40 }, text: { x: 300, y: 28 } },
  incomes: { d: 'M490 150 V100 H110 V150', slot: { x: 300, y: 100 }, text: { x: 300, y: 88 } },
  spending: { d: 'M110 230 V280 H490 V230', slot: { x: 300, y: 280 }, text: { x: 300, y: 304 } },
  goods: { d: 'M540 230 V340 H60 V230', slot: { x: 300, y: 340 }, text: { x: 300, y: 364 } },
};
/** The order the slots are numbered on screen (top to bottom). */
const SLOT_ORDER: Flow[] = ['factors', 'incomes', 'spending', 'goods'];

function Movers(props: { d: string; kind: 'coin' | 'good'; n?: number; dur?: number }) {
  if (reducedMotion()) return null;
  const n = props.n ?? 3, dur = props.dur ?? 6;
  return (
    <g aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          {props.kind === 'coin' ? (
            <g>
              <circle r="9" fill="#e8b923" stroke="#8a6a00" stroke-width="1.5" />
              <text y="4" text-anchor="middle" font-size="11" font-weight="700" fill="#5a4400">$</text>
            </g>
          ) : (
            <rect x="-7" y="-7" width="14" height="14" rx="2" fill="#c7d6fb" stroke="#1D4ED8" stroke-width="1.5" />
          )}
          <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${-(i * dur) / n}s`} {...({ path: props.d } as Record<string, string>)} />
        </g>
      ))}
    </g>
  );
}

function SectorBox(props: { x: number; y: number; w: number; h: number; label: string; icon: string }) {
  return (
    <g>
      <rect x={props.x} y={props.y} width={props.w} height={props.h} rx="12" fill="#eef3ff" stroke="#1D4ED8" stroke-width="2.5" />
      <text x={props.x + props.w / 2} y={props.y + props.h / 2 - 4} text-anchor="middle" font-size="24">{props.icon}</text>
      <text x={props.x + props.w / 2} y={props.y + props.h / 2 + 20} text-anchor="middle" font-size="15" font-weight="700" fill="#1D4ED8">{props.label}</text>
    </g>
  );
}

function Markers({ id }: { id: string }) {
  return (
    <defs>
      <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" fill="#1D4ED8" />
      </marker>
    </defs>
  );
}

/** Level 1 drawing. `placed` holds the flows already labelled; the river flows once every channel is right. */
function TwoSector(props: { placed: Partial<Record<Flow, boolean>>; flowNames: Record<Flow, string>; onSlot?: (f: Flow) => void; selected: boolean; wrong?: Flow | null }) {
  const all = FLOWS.every((f) => props.placed[f]);
  return (
    <div class="mr-river">
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} role="img" aria-label={all ? 'The two-sector circular flow, complete. Money and goods are flowing.' : 'Households on the left and firms on the right, joined by four channels to label.'}>
        <Markers id="mr1" />
        <rect x="0" y="0" width={VB.w} height={VB.h} rx="14" fill="#eaf4fb" />
        {FLOWS.map((f) => (
          <path key={f} d={CHANNEL[f].d} fill="none" stroke={props.placed[f] ? '#5b9bd1' : '#aab6c8'} stroke-width={props.placed[f] ? 12 : 8} stroke-linejoin="round" class={props.placed[f] ? 'mr-water' : ''} />
        ))}
        {FLOWS.map((f) => (
          <path key={`a${f}`} d={CHANNEL[f].d} fill="none" stroke="#1D4ED8" stroke-width="2" stroke-dasharray="1 0" marker-end="url(#mr1-arrow)" opacity="0.9" />
        ))}
        <SectorBox x={20} y={150} w={130} h={80} label="Households" icon="🏠" />
        <SectorBox x={450} y={150} w={130} h={80} label="Firms" icon="🏭" />
        {FLOWS.filter((f) => props.placed[f]).map((f) => (
          <text key={`t${f}`} x={CHANNEL[f].text.x} y={CHANNEL[f].text.y} text-anchor="middle" font-size="15" font-weight="700" fill="#1a1f29" class="mr-label-in">
            {props.flowNames[f]}
          </text>
        ))}
        {all && FLOWS.map((f) => <Movers key={`m${f}`} d={CHANNEL[f].d} kind={isMoney(f) ? 'coin' : 'good'} />)}
      </svg>
      {SLOT_ORDER.map((f, i) =>
        props.placed[f] ? null : (
          <button
            key={f}
            type="button"
            class={`mr-slot ${props.wrong === f ? 'shake' : ''}`}
            style={{ left: `${(CHANNEL[f].slot.x / VB.w) * 100}%`, top: `${(CHANNEL[f].slot.y / VB.h) * 100}%` }}
            aria-label={`Channel ${i + 1}: from ${FLOW_DIRECTION[f].from} to ${FLOW_DIRECTION[f].to}${props.selected ? '. Place the chosen label here.' : '. Choose a label first.'}`}
            disabled={!props.onSlot}
            onClick={() => props.onSlot?.(f)}
          >
            {i + 1}
          </button>
        ),
      )}
    </div>
  );
}

const SECTOR_X: Record<Sector, number> = { banks: 150, government: 300, foreign: 450 };
const SECTOR_ICON: Record<Sector, string> = { banks: '🏦', government: '🏛️', foreign: '🌍' };
const SECTOR_SHORT: Record<Sector, string> = { banks: 'Banks', government: 'Government', foreign: 'Foreign sector' };
/** Level 2 pipes: a drain from the spending flow down into each sector (upstream), and a spring back up (downstream). */
function pipePath(p: Pipe) {
  const cx = SECTOR_X[PIPE_SECTOR[p]];
  return isLeakage(p) ? `M${cx - 32} 128 V270` : `M${cx + 32} 270 V128`;
}
const PIPE_SLOT_ORDER: Pipe[] = ['savings', 'investment', 'taxes', 'government', 'imports', 'exports'];

/** Level 2 and Learn it drawing: households, firms and the three other sectors. */
export function FullFlow(props: {
  placed: Partial<Record<Pipe, boolean>>;
  pipeNames: Record<Pipe, string>;
  onSlot?: (p: Pipe) => void;
  selected?: boolean;
  wrong?: Pipe | null;
  flowing?: boolean;
}) {
  const id = useMemo(() => `mr${Math.random().toString(36).slice(2, 7)}`, []);
  const spend = 'M150 115 H450';
  const incomes = 'M490 80 V40 H110 V80';
  return (
    <div class="mr-river">
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} role="img" aria-label="Circular flow with leakages and injections. Households and firms at the top. Banks, government and the foreign sector below. A drain from consumer spending runs down to each sector, and a spring runs back up towards firms.">
        <Markers id={id} />
        <rect x="0" y="0" width={VB.w} height={VB.h} rx="14" fill="#eaf4fb" />
        <path d={incomes} fill="none" stroke="#5b9bd1" stroke-width="12" class="mr-water" />
        <path d={incomes} fill="none" stroke="#1D4ED8" stroke-width="2" marker-end={`url(#${id}-arrow)`} />
        <path d={spend} fill="none" stroke="#5b9bd1" stroke-width="12" class="mr-water" />
        <path d={spend} fill="none" stroke="#1D4ED8" stroke-width="2" marker-end={`url(#${id}-arrow)`} />
        <text x="300" y="28" text-anchor="middle" font-size="14" font-weight="700" fill="#1a1f29">Factor incomes</text>
        <text x="300" y="104" text-anchor="middle" font-size="14" font-weight="700" fill="#1a1f29">Consumer spending</text>
        {PIPES.map((p) => (
          <g key={p}>
            <path d={pipePath(p)} fill="none" stroke={props.placed[p] ? (isLeakage(p) ? '#c98a8a' : '#6fbf8a') : '#aab6c8'} stroke-width={props.placed[p] ? 11 : 7} />
            <path d={pipePath(p)} fill="none" stroke="#1D4ED8" stroke-width="2" marker-end={`url(#${id}-arrow)`} />
          </g>
        ))}
        <SectorBox x={20} y={80} w={130} h={70} label="Households" icon="🏠" />
        <SectorBox x={450} y={80} w={130} h={70} label="Firms" icon="🏭" />
        {SECTORS.map((s) => (
          <SectorBox key={s} x={SECTOR_X[s] - 68} y={270} w={136} h={70} label={SECTOR_SHORT[s]} icon={SECTOR_ICON[s]} />
        ))}
        {PIPES.filter((p) => props.placed[p]).map((p) => {
          const cx = SECTOR_X[PIPE_SECTOR[p]] + (isLeakage(p) ? -32 : 32);
          return (
            <text key={`t${p}`} x={cx} y={isLeakage(p) ? 168 : 238} text-anchor="middle" font-size="12.5" font-weight="700" fill="#1a1f29" class="mr-label-in mr-pipe-label">
              {p === 'government' ? 'Gov. spending' : props.pipeNames[p]}
            </text>
          );
        })}
        {props.flowing && (
          <>
            <Movers d={incomes} kind="coin" n={3} dur={6} />
            <Movers d={spend} kind="coin" n={3} dur={4} />
            {PIPES.map((p) => <Movers key={`m${p}`} d={pipePath(p)} kind="coin" n={1} dur={3} />)}
          </>
        )}
      </svg>
      {PIPE_SLOT_ORDER.map((p, i) =>
        props.placed[p] || !props.onSlot ? null : (
          <button
            key={p}
            type="button"
            class={`mr-slot ${props.wrong === p ? 'shake' : ''}`}
            style={{ left: `${((SECTOR_X[PIPE_SECTOR[p]] + (isLeakage(p) ? -32 : 32)) / VB.w) * 100}%`, top: `${(200 / VB.h) * 100}%` }}
            aria-label={`Pipe ${i + 1}: ${isLeakage(p) ? `from consumer spending down into the ${SECTOR_SHORT[PIPE_SECTOR[p]].toLowerCase()}` : `from the ${SECTOR_SHORT[PIPE_SECTOR[p]].toLowerCase()} up into the flow to firms`}${props.selected ? '. Place the chosen label here.' : '. Choose a label first.'}`}
            onClick={() => props.onSlot?.(p)}
          >
            {i + 1}
          </button>
        ),
      )}
    </div>
  );
}

// ---------------- Shared: label chips ----------------

function Chips<T extends string>(props: { items: T[]; names: Record<T, string>; details?: Record<T, string>; selected: T | null; onPick: (t: T) => void }) {
  return (
    <div class="mr-chips" role="group" aria-label="Labels">
      {props.items.map((t) => (
        <button key={t} type="button" class={`mr-chip ${props.selected === t ? 'on' : ''}`} aria-pressed={props.selected === t} onClick={() => props.onPick(t)}>
          <strong>{props.names[t]}</strong>
          {props.details && <span class="small">{props.details[t]}</span>}
        </button>
      ))}
    </div>
  );
}

function Fb(props: { ok: boolean; text: string }) {
  return (
    <div class={`callout ${props.ok ? 'callout-ok' : 'callout-try'}`} role="status">
      <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
        {props.ok ? <MarkIcon /> : <CrossIcon />} <span><Md text={props.text} inline /></span>
      </p>
    </div>
  );
}

/** Scenario quiz used after levels 1 and 2. Returns first-try results through onDone. */
function Spotter<T extends string>(props: {
  items: { id: string; text: string; answer: T; why?: string }[];
  options: T[];
  names: Record<T, string>;
  whyFor?: (t: T) => string;
  teacher: boolean;
  onDone: (firstRight: number) => void;
  step: number;
  wrongHint: string;
}) {
  const [i, setI] = useState(0);
  const [missed, setMissed] = useState(false);
  const [wrong, setWrong] = useState<T | null>(null);
  const [solved, setSolved] = useState(false);
  const [right, setRight] = useState(0);
  const it = props.items[i];
  const guess = (t: T) => {
    if (solved) return;
    if (t === it.answer) {
      setSolved(true);
      setWrong(null);
      if (!missed) setRight((n) => n + 1);
    } else {
      setMissed(true);
      setWrong(t);
    }
  };
  const next = () => {
    setSolved(false);
    setMissed(false);
    setWrong(null);
    if (i + 1 < props.items.length) setI(i + 1);
    else props.onDone(right);
  };
  return (
    <section class="panel stack" aria-labelledby="mr-spot-h">
      <h3 id="mr-spot-h"><StepNo n={props.step} /> Spot it: scenario {i + 1} of {props.items.length}</h3>
      <p class="mr-scenario card-deal" key={it.id}>{it.text}</p>
      <div class="choice-grid" role="group" aria-label="Which one is it?">
        {props.options.map((t) => (
          <button key={t} type="button" class={`choice-btn ${wrong === t ? 'shake' : ''} ${solved && t === it.answer ? 'choice-right' : ''}`} disabled={solved} onClick={() => guess(t)}>
            {props.names[t]}
            {props.teacher && t === it.answer && !solved && <span class="badge badge-done">Answer</span>}
          </button>
        ))}
      </div>
      {wrong && !solved && <Fb ok={false} text={`Not ${props.names[wrong].toLowerCase()}. ${props.wrongHint}`} />}
      {solved && (
        <>
          <Fb ok text={it.why ?? props.whyFor?.(it.answer) ?? ''} />
          <div><button class="btn" onClick={next}>{i + 1 < props.items.length ? 'Next scenario' : 'Finish'}</button></div>
        </>
      )}
      <p class="small muted" style={{ margin: 0 }}>Right first time: {right}</p>
    </section>
  );
}

// ---------------- Level 1 ----------------

function Build({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const [placed, setPlaced] = useState<Partial<Record<Flow, boolean>>>({});
  const [selected, setSelected] = useState<Flow | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [wrongSlot, setWrongSlot] = useState<Flow | null>(null);
  const [spotResult, setSpotResult] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  const chips = useMemo(() => shuffled(FLOWS, seed + 2), [seed]);
  const remaining = chips.filter((f) => !placed[f]);
  const built = FLOWS.every((f) => placed[f]);
  const spots = useMemo(() => shuffled(data.spots, seed + 5), [data.spots, seed]);

  const place = (slot: Flow) => {
    if (!selected) {
      setMsg({ ok: false, text: 'First tap a label above, then tap the channel it belongs on.' });
      return;
    }
    if (selected === slot) {
      const next = { ...placed, [slot]: true };
      setPlaced(next);
      setSelected(null);
      setWrongSlot(null);
      const done = FLOWS.every((f) => next[f]);
      setMsg({ ok: true, text: done ? 'The river is complete! Watch the money and the goods flow in opposite directions.' : `Right: **${data.flowNames[slot]}** go from ${FLOW_DIRECTION[slot].from} to ${FLOW_DIRECTION[slot].to}.` });
      setAnnounce(done ? 'The river is complete.' : 'Right.');
    } else {
      setMistakes((m) => m + 1);
      setWrongSlot(slot);
      const d = FLOW_DIRECTION[selected], s = FLOW_DIRECTION[slot];
      const text = d.from !== s.from
        ? `**${data.flowNames[selected]}** go from ${d.from} to ${d.to}. Channel ${SLOT_ORDER.indexOf(slot) + 1} goes the other way.`
        : `Both go from ${d.from} to ${d.to}. One channel carries **money** and the other carries **real things**. Which is **${data.flowNames[selected].toLowerCase()}**?`;
      setMsg({ ok: false, text });
      setAnnounce('Not that channel.');
    }
  };

  const finish = (right: number) => {
    setSpotResult(right);
    onComplete();
    if (buildWon(mistakes, right)) win(onGoal, 1);
  };

  if (spotResult !== null) {
    const won = buildWon(mistakes, spotResult);
    return (
      <div class="stack">
        <TwoSector placed={placed} flowNames={data.flowNames} selected={false} />
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'The river is flowing!' : 'Level finished.'}</strong> Building mistakes: {mistakes}. Scenarios right first time: {spotResult} of {spots.length}.
          </p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[0]} stamp needs no more than 2 building mistakes and {SPOT_GOAL} scenarios right first time.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <section class="panel stack" aria-labelledby="mr-build-h">
        <h3 id="mr-build-h"><StepNo n={2} /> Join the river: label each channel</h3>
        {!built && (
          <>
            <p style={{ margin: 0 }}>Tap a label, then tap the numbered channel it belongs on. The arrows show which way each channel flows.</p>
            <Chips items={remaining} names={data.flowNames} details={data.flowDetails} selected={selected} onPick={(f) => { setSelected(f); setMsg(null); }} />
          </>
        )}
        <TwoSector placed={placed} flowNames={data.flowNames} onSlot={built ? undefined : place} selected={!!selected} wrong={wrongSlot} />
        {teacher && !built && <p class="small muted">Answer: 1 factors of production, 2 factor incomes, 3 consumer spending, 4 goods and services.</p>}
        {msg && <Fb ok={msg.ok} text={msg.text} />}
        <p class="small muted" style={{ margin: 0 }}>Building mistakes: {mistakes} (the stamp allows 2).</p>
      </section>
      {built && (
        <Spotter items={spots} options={FLOWS} names={data.flowNames} teacher={teacher} onDone={finish} step={3} wrongHint="Ask: is it money or a real thing, and which way does it go?" />
      )}
    </div>
  );
}

// ---------------- Level 2 ----------------

function Drains({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const [placed, setPlaced] = useState<Partial<Record<Pipe, boolean>>>({});
  const [selected, setSelected] = useState<Pipe | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [wrongSlot, setWrongSlot] = useState<Pipe | null>(null);
  const [spotResult, setSpotResult] = useState<number | null>(null);
  const chips = useMemo(() => shuffled(PIPES, seed + 4), [seed]);
  const remaining = chips.filter((p) => !placed[p]);
  const built = PIPES.every((p) => placed[p]);
  const spots = useMemo(() => shuffled(data.leakSpots, seed + 9), [data.leakSpots, seed]);
  const options = useMemo(() => shuffled(PIPES, seed + 13), [seed]);

  const place = (slot: Pipe) => {
    if (!selected) {
      setMsg({ ok: false, text: 'First tap a label, then tap the numbered pipe it belongs on.' });
      return;
    }
    if (selected === slot) {
      const next = { ...placed, [slot]: true };
      setPlaced(next);
      setSelected(null);
      setWrongSlot(null);
      setMsg({ ok: true, text: `${isLeakage(slot) ? 'A drain (leakage)' : 'A spring (injection)'}: ${data.pipeWhy[slot]}` });
    } else {
      setMistakes((m) => m + 1);
      setWrongSlot(slot);
      const text = isLeakage(selected) !== isLeakage(slot)
        ? `**${data.pipeNames[selected]}** ${isLeakage(selected) ? 'is a leakage: money drains out of the flow' : 'is an injection: money flows into the flow'}. Pipe ${PIPE_SLOT_ORDER.indexOf(slot) + 1} ${isLeakage(slot) ? 'drains money out' : 'brings money in'}.`
        : `**${data.pipeNames[selected]}** goes through the **${data.sectorNames[PIPE_SECTOR[selected]].toLowerCase()}**, not the ${data.sectorNames[PIPE_SECTOR[slot]].toLowerCase()}.`;
      setMsg({ ok: false, text });
    }
  };

  const finish = (right: number) => {
    setSpotResult(right);
    onComplete();
    if (mistakes <= PIPE_MISTAKES_ALLOWED && right >= LEAK_SPOT_GOAL) win(onGoal, 2);
  };

  if (spotResult !== null) {
    const won = mistakes <= PIPE_MISTAKES_ALLOWED && spotResult >= LEAK_SPOT_GOAL;
    return (
      <div class="stack">
        <FullFlow placed={placed} pipeNames={data.pipeNames} flowing />
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'Every drain and spring is working!' : 'Level finished.'}</strong> Pipe mistakes: {mistakes}. Scenarios right first time: {spotResult} of {spots.length}.
          </p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[1]} stamp needs no more than 2 pipe mistakes and {LEAK_SPOT_GOAL} scenarios right first time.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  return (
    <div class="stack">
      <section class="panel stack" aria-labelledby="mr-drain-h">
        <h3 id="mr-drain-h"><StepNo n={2} /> Place the drains and springs</h3>
        {!built && (
          <>
            <p style={{ margin: 0 }}>Drains carry money <strong>out of</strong> consumer spending. Springs bring money <strong>back in</strong> on its way to firms. Tap a label, then its pipe.</p>
            <Chips items={remaining} names={data.pipeNames} selected={selected} onPick={(p) => { setSelected(p); setMsg(null); }} />
          </>
        )}
        <FullFlow placed={placed} pipeNames={data.pipeNames} onSlot={built ? undefined : place} selected={!!selected} wrong={wrongSlot} flowing={built} />
        {teacher && !built && <p class="small muted">Answer: 1 savings, 2 investment, 3 taxes, 4 government spending, 5 imports, 6 exports.</p>}
        {msg && <Fb ok={msg.ok} text={msg.text} />}
        <p class="small muted" style={{ margin: 0 }}>Pipe mistakes: {mistakes} (the stamp allows 2).</p>
      </section>
      {built && (
        <Spotter items={spots} options={options} names={data.pipeNames} whyFor={(p) => data.pipeWhy[p]} teacher={teacher} onDone={finish} step={3} wrongHint="Ask: does money leave the flow or enter it, and which sector is involved?" />
      )}
    </div>
  );
}

// ---------------- Level 3 ----------------

function Bars(props: { t: Totals; names: Record<Pipe, string>; reveal: boolean }) {
  const max = Math.max(...Object.values(props.t), 1);
  const row = (p: Pipe) => (
    <div key={p} class="mr-bar-row">
      <span class="mr-bar-name">{props.names[p]}</span>
      <span class="mr-bar-track" aria-hidden="true"><span class={`mr-bar ${isLeakage(p) ? 'leak' : 'inject'}`} style={{ width: `${(props.t[p] / max) * 100}%` }} /></span>
      <b>${props.t[p]}bn</b>
    </div>
  );
  return (
    <div class="mr-bars">
      <div class="stack" style={{ gap: 4 }}>
        <strong>Leakages (drains)</strong>
        {(['savings', 'taxes', 'imports'] as Pipe[]).map(row)}
        {props.reveal && <p class="small" style={{ margin: 0 }}>Total leakages: <b>${totalLeakages(props.t)}bn</b></p>}
      </div>
      <div class="stack" style={{ gap: 4 }}>
        <strong>Injections (springs)</strong>
        {(['investment', 'government', 'exports'] as Pipe[]).map(row)}
        {props.reveal && <p class="small" style={{ margin: 0 }}>Total injections: <b>${totalInjections(props.t)}bn</b></p>}
      </div>
    </div>
  );
}

function Gauge(props: { level: number }) {
  return (
    <div class="mr-gauge" role="img" aria-label={`River level: ${props.level} out of 10`}>
      <div class="mr-gauge-water" style={{ height: `${props.level * 10}%` }}>
        <span class="mr-gauge-wave" />
      </div>
      <span class="mr-gauge-label">National income</span>
    </div>
  );
}

function Forecast({ data, onComplete, onGoal, teacher, again }: LevelProps) {
  const rounds = data.rounds;
  const [i, setI] = useState(0);
  const [pickd, setPickd] = useState<Change | null>(null);
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [right, setRight] = useState(0);
  const [level, setLevel] = useState(5);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const r = rounds[i];
  let after = r.totals;
  if (r.change) after = applyChange(after, r.change.pipe, r.change.by);
  if (r.change2) after = applyChange(after, r.change2.pipe, r.change2.by);
  const truth = incomeChange(after);

  const guess = (c: Change) => {
    if (solved) return;
    setPickd(c);
    if (c === truth) {
      setSolved(true);
      if (!missed) setRight((n) => n + 1);
      setLevel((l) => Math.max(1, Math.min(9, l + (truth === 'rise' ? 2 : truth === 'fall' ? -2 : 0))));
      setAnnounce(`Right. ${data.changeNames[truth]}.`);
    } else {
      setMissed(true);
      setAnnounce('Not yet. Add up each side again.');
    }
  };

  const next = () => {
    setPickd(null);
    setMissed(false);
    setSolved(false);
    setLevel(5);
    if (i + 1 < rounds.length) setI(i + 1);
    else {
      setDone(true);
      onComplete();
      if (right >= FORECAST_GOAL) win(onGoal, 3);
    }
  };

  if (done) {
    const won = right >= FORECAST_GOAL;
    return (
      <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
        <p style={{ margin: 0 }}><strong>{won ? 'Sharp forecasting!' : 'Forecasts finished.'}</strong> Right first time: {right} of {rounds.length}.</p>
        {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[2]} stamp needs {FORECAST_GOAL} right first time.</p>}
        <div><button class="btn" onClick={again}>Play again</button></div>
      </div>
    );
  }

  const changeText = (c: { pipe: Pipe; by: number }) => `${data.pipeNames[c.pipe]} ${c.by > 0 ? '+' : '−'}$${Math.abs(c.by)}bn`;
  const d = totalInjections(after) - totalLeakages(after);

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>Level 3. Forecast {i + 1} of {rounds.length}. Right first time: {right} (goal {FORECAST_GOAL}).</p>
      <div class="play">
        <section class="panel stack" aria-labelledby="mr-fc-h">
          <h3 id="mr-fc-h"><StepNo n={2} /> Read the river report</h3>
          <Md text={r.story} />
          <Bars t={solved ? after : r.totals} names={data.pipeNames} reveal={solved} />
          {(r.change || r.change2) && (
            <p class="mr-change" style={{ margin: 0 }}>
              <strong>Change:</strong> {[r.change, r.change2].filter(Boolean).map((c) => changeText(c!)).join(', ')}
            </p>
          )}
        </section>
        <section class="panel stack" aria-labelledby="mr-fc2-h">
          <h3 id="mr-fc2-h"><StepNo n={3} /> Forecast national income</h3>
          <div class="mr-forecast">
            <Gauge level={level} />
            <div class="stack" role="group" aria-label="Your forecast" style={{ flex: 1 }}>
              {(['rise', 'fall', 'same'] as Change[]).map((c) => (
                <button key={c} type="button" class={`choice-btn ${pickd === c && !solved ? 'shake' : ''} ${solved && c === truth ? 'choice-right' : ''}`} disabled={solved} onClick={() => guess(c)}>
                  {data.changeNames[c]}
                  {teacher && c === truth && !solved && <span class="badge badge-done">Answer</span>}
                </button>
              ))}
            </div>
          </div>
          {pickd && !solved && <Fb ok={false} text="Not yet. Add the three leakages, then the three injections (after any change). Which total is bigger?" />}
          {solved && (
            <>
              <Fb ok text={`Leakages **$${totalLeakages(after)}bn**, injections **$${totalInjections(after)}bn**. ${d > 0 ? 'More money flows in than drains out, so national income **rises**.' : d < 0 ? 'More money drains out than flows in, so national income **falls**.' : 'The same amount flows in as drains out, so national income **stays the same**.'}`} />
              <div><button class="btn" onClick={next}>{i + 1 < rounds.length ? 'Next forecast' : 'See how you did'}</button></div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------- Learn it ----------------

function LearnDiagram({ content }: { content: { try: unknown } }) {
  const data = content.try as TryContent;
  const all = Object.fromEntries(PIPES.map((p) => [p, true])) as Record<Pipe, boolean>;
  return <FullFlow placed={all} pipeNames={data.pipeNames} flowing />;
}

export { Try, LearnDiagram };
