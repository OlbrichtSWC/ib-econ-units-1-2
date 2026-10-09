/**
 * Rival Pricing (2.11, HL only): market power, profit maximization and a pricing duel.
 *
 * Two coffee cafés face each other on one street. Customers walk to the cheaper one.
 * Level 1: map each market to its structure from its characteristics, and work out concentration ratios.
 * Level 2: read a cost and revenue schedule. Find the output where MC = MR, the price, the profit,
 *          and say whether it is abnormal profit, normal profit or a loss.
 * Level 3: read a payoff matrix (a prisoner's dilemma), play five weeks against a rival that copies you,
 *          then judge why collusion is tempting, why it breaks down and why cartels are illegal.
 */
import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon, StepNo } from '../../shared/design/components';
import { SpecDiagram } from '../../shared/diagrams/SpecDiagram';
import type { DiagramSpec } from '../../shared/diagrams/SpecDiagram';
import type { TryProps } from '../../shared/activity/types';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import type { LevelInfo } from '../../shared/activity/LevelPicker';
import { celebrate } from '../../shared/fun/celebrate';
import { play } from '../../shared/fun/sound';
import type { Pt } from '../../econ/calc';
import { shuffled } from '../island-economy/model';
import {
  bestOutput, bestReply, cell, concentrationRatio, crMistakes, CrSlip, customersToYou, DUEL_GOAL, duelMax, duelWon, equilibrium, MAP_GOAL,
  mapWon, Matrix, Move, MOVES, numberRight, outputSlip, parseNumber, PriceSlip, priceMistakes, priceTaker, PROFIT_GOAL, PROFIT_KINDS, ProfitKind,
  profitKind, profitMistakes, ProfitSlip, profitWon, POINTS_PER_PROFIT_ROUND, rowAt, rows, Schedule, Structure, STRUCTURES, titForTat,
  dominantStrategy,
} from './model';
import './street.css';

const STAMP_NAMES = ['Market Mapper', 'Profit Finder', 'Game Theorist'];

interface Opt { text: string; correct?: boolean; feedback: string }
interface Clues { firms: string; product: string; barriers: string }
interface MarketItem { id: string; kind: 'market'; icon: string; name: string; text: string; clues: Clues; structure: Structure; why: string }
interface CrItem {
  id: string;
  kind: 'cr';
  icon: string;
  name: string;
  text: string;
  firms: { name: string; share: number }[];
  others: number;
  n: number;
  clues: Clues;
  structure: Structure;
  why: string;
}
type MapItem = MarketItem | CrItem;
interface ProfitRound extends Schedule { id: string; icon: string; title: string; story: string; why: string }
interface Judgement { id: string; prompt: string; options: Opt[] }

interface TryContent {
  levels: LevelInfo[];
  structNames: Record<Structure, string>;
  structDefs: Record<Structure, string>;
  clueNames: Clues;
  takerWrong: { taker: string; maker: string };
  crText: Record<CrSlip | 'other', string>;
  items: MapItem[];
  rounds: ProfitRound[];
  outputText: Record<'trMax' | 'before' | 'after', string>;
  priceText: Record<PriceSlip | 'other', string>;
  profitText: Record<ProfitSlip | 'other', string>;
  kindNames: Record<ProfitKind, string>;
  kindWrong: Record<ProfitKind, string>;
  matrix: Matrix;
  weeks: number;
  judgements: Judgement[];
}

const money = (v: number) => {
  const a = Math.abs(v);
  const s = Math.abs(a - Math.round(a)) < 1e-9 ? Math.round(a).toLocaleString('en-US') : a.toFixed(2);
  return `${v < 0 ? '−' : ''}$${s}`;
};
const fmt = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2));
const MOVE_NAME: Record<Move, string> = { high: 'High price', low: 'Low price' };

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
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="crown" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <Mapper key={round} seed={round} {...props} />}
      {levelNo === 2 && <ProfitFinder key={round} seed={round} {...props} />}
      {levelNo === 3 && <PriceWar key={round} seed={round} {...props} />}
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

// ---------------- The coffee street ----------------

interface StreetProps {
  /** Your price, shown on your board. Undefined: not set yet. */
  you?: Move;
  /** The rival's price. Undefined: not shown yet. */
  rival?: Move;
  /** Only your café (Level 2): the rival's shop is shown as closed. */
  solo?: boolean;
  /** Text on your price board in Level 2, such as "$14". */
  youBoard?: string;
  /** Coins earned this week or round, one coin per $200. */
  coins?: { you: number; rival: number };
  /** A sad cloud over your café when it makes a loss. */
  loss?: boolean;
  banner?: string;
  town?: string;
}

function Person(props: { tone: string; hat?: boolean }) {
  return (
    <g>
      <circle cx="0" cy="-26" r="5" fill="#f1c9a5" stroke="#5b4636" stroke-width="1" />
      <rect x="-5" y="-20" width="10" height="13" rx="3" fill={props.tone} />
      <path class="rp-legs" d="M-3 -7l-2 7M3 -7l2 7" stroke="#3b3b3b" stroke-width="2.4" stroke-linecap="round" />
      {props.hat && <path d="M-6 -30h12l-6-5z" fill="#1d4ed8" />}
    </g>
  );
}

const WALKER_TONES = ['#7a5aa0', '#1e6b3a', '#c27a1e', '#4a5263', '#b0476b', '#2a7f9e'];

function Cafe(props: { x: number; mine: boolean; board?: string; closed?: boolean; coins: number; loss?: boolean }) {
  const { x, mine } = props;
  const main = mine ? '#1d4ed8' : '#c8102e';
  const stripes = Array.from({ length: 8 }, (_, i) => i);
  return (
    <g transform={`translate(${x} 0)`}>
      {/* Building */}
      <rect x="0" y="52" width="210" height="128" fill={props.closed ? '#d8d4ce' : '#f3e6d3'} stroke="#7a5a3a" stroke-width="2" />
      <rect x="0" y="40" width="210" height="16" fill="#7a5a3a" />
      {/* Sign */}
      <rect x="40" y="18" width="130" height="26" rx="6" fill="#fff" stroke={main} stroke-width="2.5" />
      <text x="105" y="36" text-anchor="middle" font-size="15" font-weight="700" fill={main}>{props.closed ? 'CLOSED' : mine ? 'YOUR CAFÉ' : 'RIVAL CAFÉ'}</text>
      {/* Awning */}
      {!props.closed && (
        <g>
          {stripes.map((i) => (
            <path key={i} d={`M${i * 26.25} 58h26.25v22a13 9 0 0 1 -26.25 0z`} fill={i % 2 ? '#fff' : main} stroke={main} stroke-width="1.5" />
          ))}
        </g>
      )}
      {/* Window and door */}
      <rect x="18" y="96" width="92" height="56" rx="4" fill={props.closed ? '#9aa1ab' : '#bfe0f5'} stroke="#7a5a3a" stroke-width="2" />
      <rect x="140" y="104" width="44" height="76" rx="3" fill={props.closed ? '#9aa1ab' : '#8a5a3a'} stroke="#5b4636" stroke-width="2" />
      <circle cx="176" cy="144" r="3" fill="#f2d27a" />
      {!props.closed && (
        <g>
          {/* A steaming cup in the window */}
          <path d="M48 122h28v12c0 7-6 11-14 11s-14-4-14-11z" fill="#fff" stroke={main} stroke-width="2.5" />
          <path d="M76 126h4a5 5 0 0 1 0 10h-4" fill="none" stroke={main} stroke-width="2.5" />
          <path class="rp-steam" d="M56 116q-4-6 0-12t0-12" stroke="#8a8f99" stroke-width="2.5" fill="none" stroke-linecap="round" />
          <path class="rp-steam rp-steam2" d="M64 116q-4-6 0-12t0-12" stroke="#8a8f99" stroke-width="2.5" fill="none" stroke-linecap="round" />
          <path class="rp-steam rp-steam3" d="M72 116q-4-6 0-12t0-12" stroke="#8a8f99" stroke-width="2.5" fill="none" stroke-linecap="round" />
        </g>
      )}
      {/* Price board on the pavement */}
      {!props.closed && (
        <g transform={mine ? 'translate(214 136)' : 'translate(-50 136)'}>
          <path d="M4 44l8-44h24l8 44" fill="none" stroke="#7a5a3a" stroke-width="3" />
          <rect x="0" y="0" width="48" height="34" rx="3" fill="#2f3b2f" stroke="#7a5a3a" stroke-width="2" />
          <text key={props.board} class="rp-flip" x="24" y="22" text-anchor="middle" font-size={props.board && props.board.length > 4 ? 12 : 15} font-weight="700" fill="#fff">
            {props.board ?? '?'}
          </text>
        </g>
      )}
      {/* Coins earned */}
      {Array.from({ length: props.coins }, (_, i) => (
        <g key={i} class="rp-coin" style={{ animationDelay: `${i * 0.12}s` }} transform={`translate(${30 + i * 26} 8)`}>
          <circle r="10" fill="#f6c12f" stroke="#8a5300" stroke-width="2" />
          <text y="5" text-anchor="middle" font-size="12" font-weight="700" fill="#8a5300">$</text>
        </g>
      ))}
      {props.loss && (
        <g class="rp-cloud" transform="translate(200 4)">
          <ellipse cx="0" cy="8" rx="26" ry="11" fill="#8e939c" />
          <ellipse cx="16" cy="2" rx="16" ry="10" fill="#9da1a9" />
          <path d="M-10 22l-3 8M2 22l-3 8M14 22l-3 8" stroke="#5b8bd6" stroke-width="2.5" stroke-linecap="round" />
        </g>
      )}
    </g>
  );
}

function Street(props: StreetProps) {
  const n = 6;
  const both = props.you && props.rival;
  const toYou = props.solo ? n : both ? customersToYou(props.you!, props.rival!, n) : 3;
  // Keep the exact split, mixed along the street: the first `toYou` walkers in this order go to you.
  const order = [0, 3, 1, 4, 2, 5];
  const goes = order.map((_, i) => (order.indexOf(i) < toYou ? 'l' : 'r'));
  const priceWord = (m?: Move) => (m ? (m === 'high' ? 'a high price' : 'a low price') : 'no price yet');
  const desc = props.solo
    ? `${props.town ? `${props.town}. ` : ''}Your café is open. The shop across the street is closed. ${props.youBoard ? `Your price board says ${props.youBoard}.` : 'Your price board is blank.'}${props.loss ? ' A rain cloud hangs over your café: a loss.' : ''}${props.coins?.you ? ` ${props.coins.you} coins above your café.` : ''}`
    : `Two cafés face each other. Your café has ${priceWord(props.you)}. The rival café has ${props.rival ? priceWord(props.rival) : 'a hidden price'}. ${toYou} of ${n} customers walk to your café.${props.banner ? ` ${props.banner}.` : ''}`;
  return (
    <svg class="rp-street" viewBox="0 0 640 236" role="img" aria-labelledby="rp-street-t rp-street-d">
      <title id="rp-street-t">The coffee street</title>
      <desc id="rp-street-d">{desc}</desc>
      <defs>
        <linearGradient id="rp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9fd0f2" />
          <stop offset="1" stop-color="#e3f2fb" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="640" height="190" fill="url(#rp-sky)" />
      <g class="rp-cloudy">
        <ellipse cx="320" cy="30" rx="34" ry="12" fill="#fff" opacity="0.9" />
        <ellipse cx="342" cy="22" rx="20" ry="10" fill="#fff" opacity="0.9" />
      </g>
      {/* Lamp post and tree in the middle */}
      <path d="M320 180V96" stroke="#4a5263" stroke-width="4" />
      <path d="M320 96h14" stroke="#4a5263" stroke-width="4" />
      <circle cx="336" cy="100" r="6" fill="#f6c12f" />
      {/* Pavement and road */}
      <rect x="0" y="180" width="640" height="22" fill="#d9d4cc" />
      <rect x="0" y="202" width="640" height="34" fill="#6b7280" />
      <path d="M0 219h640" stroke="#f4f4f4" stroke-width="2" stroke-dasharray="16 12" />
      <Cafe x={14} mine board={props.youBoard ?? (props.you ? (props.you === 'high' ? 'HIGH' : 'LOW') : undefined)} coins={props.coins?.you ?? 0} loss={props.loss} />
      <Cafe x={416} mine={false} closed={props.solo} board={props.rival ? (props.rival === 'high' ? 'HIGH' : 'LOW') : undefined} coins={props.coins?.rival ?? 0} />
      {/* Customers walking from the middle of the street to a café door */}
      {goes.map((g, i) => {
        const end = g === 'l' ? 176 : 590;
        const still = 320 + (end - 320) * (0.25 + (i % 3) * 0.25);
        return (
          <g key={`${i}-${g}`} transform={`translate(${still} 196)`}>
            <g
              class={`rp-walker rp-walk-${g}`}
              style={{ '--rp-from': `${320 - still}px`, '--rp-to': `${end - still}px`, animationDelay: `${i * 0.6}s` } as Record<string, string>}
            >
              <Person tone={WALKER_TONES[i]} hat={i === 2} />
            </g>
          </g>
        );
      })}
      {props.banner && (
        <g class="rp-banner">
          <rect x="230" y="50" width="180" height="32" rx="8" fill="#fff" stroke="#c8102e" stroke-width="2.5" />
          <text x="320" y="72" text-anchor="middle" font-size="16" font-weight="700" fill="#c8102e">{props.banner}</text>
        </g>
      )}
    </svg>
  );
}

// ---------------- Level 1: map the market ----------------

const STRUCT_ICON: Record<Structure, string> = { perfect: '🌾', monopolistic: '🎨', oligopoly: '♟️', monopoly: '👑' };

function PowerMap(props: { data: TryContent; placed: { id: string; icon: string; s: Structure }[]; focus?: Structure }) {
  return (
    <div class="rp-map" role="group" aria-label="Market power map">
      <div class="rp-map-bar" aria-hidden="true">
        <span>No market power</span>
        <span>Most market power</span>
      </div>
      <ol class="rp-map-stops">
        {STRUCTURES.map((s) => {
          const here = props.placed.filter((p) => p.s === s);
          return (
            <li key={s} class={`rp-stop ${props.focus === s ? 'rp-stop-on' : ''}`}>
              <span class="rp-stop-icon" aria-hidden="true">{STRUCT_ICON[s]}</span>
              <strong>{props.data.structNames[s]}</strong>
              <span class="rp-tokens">
                <span class="sr-only">{here.length} {here.length === 1 ? 'market' : 'markets'} mapped here.</span>
                {here.map((p) => (
                  <span key={p.id} class="rp-token" aria-hidden="true">{p.icon}</span>
                ))}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type MapPhase = 'struct' | 'taker' | 'cr' | 'solved';

function Mapper({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const items = useMemo(() => shuffled(data.items, seed + 3), [data.items, seed]);
  const [idx, setIdx] = useState(0);
  const it = items[idx];
  const [phase, setPhase] = useState<MapPhase>(it.kind === 'cr' ? 'cr' : 'struct');
  const [missed, setMissed] = useState(false);
  const [wrongS, setWrongS] = useState<Structure | null>(null);
  const [wrongT, setWrongT] = useState<boolean | null>(null);
  const [typed, setTyped] = useState('');
  const [crFb, setCrFb] = useState<string | null>(null);
  const [firstRight, setFirstRight] = useState(0);
  const [placed, setPlaced] = useState<{ id: string; icon: string; s: Structure }[]>([]);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const goal = Math.min(MAP_GOAL, items.length);
  const cr = it.kind === 'cr' ? concentrationRatio(it.firms.map((f) => f.share), it.n) : 0;

  const finishItem = () => {
    play('stamp');
    setPhase('solved');
    if (!missed) setFirstRight((n) => n + 1);
    setPlaced([...placed, { id: it.id, icon: it.icon, s: it.structure }]);
  };

  const pickStruct = (s: Structure) => {
    if (phase !== 'struct') return;
    if (s === it.structure) {
      setWrongS(null);
      if (it.kind === 'market') {
        play('correct');
        setPhase('taker');
        setAnnounce(`Right: ${data.structNames[s]}. Now say if a firm here is a price taker or a price maker.`);
      } else {
        finishItem();
        setAnnounce(`Right: ${data.structNames[s]}.`);
      }
    } else {
      play('wrong');
      setMissed(true);
      setWrongS(s);
      setAnnounce(`Not ${data.structNames[s]}. ${data.structDefs[s]}`);
    }
  };

  const pickTaker = (taker: boolean) => {
    if (phase !== 'taker') return;
    if (taker === priceTaker(it.structure)) {
      setWrongT(null);
      finishItem();
      setAnnounce(taker ? 'Right: a price taker.' : 'Right: a price maker.');
    } else {
      play('wrong');
      setMissed(true);
      setWrongT(taker);
      setAnnounce(taker ? data.takerWrong.taker : data.takerWrong.maker);
    }
  };

  const checkCr = () => {
    if (phase !== 'cr' || it.kind !== 'cr') return;
    const v = parseNumber(typed);
    if (Number.isNaN(v)) {
      setCrFb('Type a number, for example 65.');
      return;
    }
    if (numberRight(v, cr)) {
      play('correct');
      setCrFb(null);
      setPhase('struct');
      setAnnounce(`Right. The four-firm concentration ratio is ${fmt(cr)}%. Now choose the market structure.`);
      return;
    }
    play('wrong');
    setMissed(true);
    const slip = crMistakes(it.firms.map((f) => f.share), it.n).find((x) => numberRight(v, x.value));
    const text = slip ? data.crText[slip.kind] : data.crText.other;
    setCrFb(text);
    setAnnounce(text);
  };

  const next = () => {
    play('whoosh');
    setMissed(false);
    setWrongS(null);
    setWrongT(null);
    setTyped('');
    setCrFb(null);
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setPhase(items[idx + 1].kind === 'cr' ? 'cr' : 'struct');
      setAnnounce('A new market.');
    } else {
      setDone(true);
      onComplete();
      if (mapWon(firstRight, goal)) win(onGoal, 1);
    }
  };

  if (done) {
    const won = mapWon(firstRight, goal);
    return (
      <div class="stack">
        <PowerMap data={data} placed={placed} />
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'The market map is complete!' : 'Markets finished.'}</strong> Right first time: {firstRight} of {items.length}.
          </p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[0]} stamp needs {goal} right first time. Play again: the markets come in a new order.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  const n = it.kind === 'cr' ? it.n : 4;
  const sortedShares = it.kind === 'cr' ? [...it.firms].sort((a, b) => b.share - a.share).slice(0, n) : [];
  const showStruct = phase !== 'cr';
  let stepNo = 3;
  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1 (HL). Market {idx + 1} of {items.length}. Right first time: {firstRight} (goal {goal}).
      </p>
      <section class="panel stack" aria-labelledby="rp-read-h">
        <h3 id="rp-read-h"><StepNo n={2} /> Read about the market</h3>
        <PowerMap data={data} placed={placed} focus={phase === 'solved' ? it.structure : undefined} />
        <div key={it.id} class="rp-scenario rp-in">
          <span class="rp-scenario-icon" aria-hidden="true">{it.icon}</span>
          <div class="stack" style={{ gap: 6 }}>
            <p style={{ margin: 0 }}><strong>{it.name}.</strong> {it.text}</p>
            <dl class="rp-clues">
              {(['firms', 'product', 'barriers'] as const).map((k) => (
                <div key={k} class="rp-clue">
                  <dt>{data.clueNames[k]}</dt>
                  <dd>{it.clues[k]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {it.kind === 'cr' && (
        <section class="panel stack" aria-labelledby="rp-cr-h">
          <h3 id="rp-cr-h"><StepNo n={stepNo++} /> Calculate the {n}-firm concentration ratio</h3>
          <div class="table-scroll">
            <table class="table rp-share-table">
              <caption class="small muted" style={{ textAlign: 'left', paddingBottom: 4 }}>Market share of each firm (%)</caption>
              <thead>
                <tr><th scope="col">Firm</th><th scope="col">Share (%)</th></tr>
              </thead>
              <tbody>
                {it.firms.map((f) => (
                  <tr key={f.name} class={phase !== 'cr' && sortedShares.includes(f) ? 'rp-row-on' : ''}>
                    <td>{f.name}</td>
                    <td>{f.share}</td>
                  </tr>
                ))}
                <tr><td>All other firms (each very small)</td><td>{it.others}</td></tr>
              </tbody>
            </table>
          </div>
          <p class="small muted" style={{ margin: 0 }}>CR{n} = the total market share of the {n} largest firms.</p>
          <div class="row">
            <label for="rp-cr">CR{n} (%)</label>
            <input
              id="rp-cr"
              type="text"
              inputMode="decimal"
              class="rp-input"
              value={typed}
              disabled={phase !== 'cr'}
              onInput={(ev) => setTyped((ev.target as HTMLInputElement).value)}
              onKeyDown={(ev) => ev.key === 'Enter' && checkCr()}
            />
            {phase === 'cr' && <button class="btn" onClick={checkCr}>Check</button>}
            {teacher && phase === 'cr' && <span class="badge badge-done">Answer: {fmt(cr)}</span>}
          </div>
          {phase === 'cr' && crFb && <Fb ok={false}><Md text={crFb} inline /></Fb>}
          {phase !== 'cr' && (
            <Fb ok>
              CR{n} = {sortedShares.map((f) => f.share).join(' + ')} = <strong>{fmt(cr)}%</strong>. {cr >= 50 ? 'A few firms hold most of the market: it is highly concentrated.' : 'No firm has a big share: the market has low concentration.'}
            </Fb>
          )}
        </section>
      )}

      {showStruct && (
        <section class="panel stack" aria-labelledby="rp-struct-h">
          <h3 id="rp-struct-h"><StepNo n={stepNo++} /> Choose the market structure</h3>
          <div class="rp-grid2" role="group" aria-label="Market structures">
            {STRUCTURES.map((s) => (
              <button
                key={s}
                type="button"
                class={`choice-btn rp-choice ${wrongS === s ? 'shake chosen' : ''} ${phase !== 'struct' && it.structure === s ? 'choice-right' : ''}`}
                disabled={phase !== 'struct'}
                onClick={() => pickStruct(s)}
              >
                <span class="rp-choice-icon" aria-hidden="true">{STRUCT_ICON[s]}</span>
                <span>{data.structNames[s]}</span>
                {teacher && phase === 'struct' && it.structure === s && <Answer />}
              </button>
            ))}
          </div>
          {phase === 'struct' && wrongS && <Fb ok={false}>Not {data.structNames[wrongS].toLowerCase()}. <Md text={data.structDefs[wrongS]} inline /></Fb>}
        </section>
      )}

      {it.kind === 'market' && (phase === 'taker' || phase === 'solved') && (
        <section class="panel stack" aria-labelledby="rp-taker-h">
          <h3 id="rp-taker-h"><StepNo n={stepNo++} /> Price taker or price maker?</h3>
          <div class="rp-grid2" role="group" aria-label="Price setting">
            {[true, false].map((taker) => {
              const right = taker === priceTaker(it.structure);
              return (
                <button
                  key={String(taker)}
                  type="button"
                  class={`choice-btn ${wrongT === taker ? 'shake chosen' : ''} ${phase === 'solved' && right ? 'choice-right' : ''}`}
                  disabled={phase !== 'taker'}
                  onClick={() => pickTaker(taker)}
                >
                  <strong>{taker ? 'Price taker' : 'Price maker'}</strong>
                  <span class="small" style={{ display: 'block' }}>{taker ? 'It must accept the market price.' : 'It has some power to choose its price.'}</span>
                  {teacher && phase === 'taker' && right && <Answer />}
                </button>
              );
            })}
          </div>
          {phase === 'taker' && wrongT !== null && <Fb ok={false}><Md text={wrongT ? data.takerWrong.taker : data.takerWrong.maker} inline /></Fb>}
        </section>
      )}

      {phase === 'solved' && (
        <div class="callout callout-ok stack" role="status">
          <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
            <MarkIcon /> <span><strong>{data.structNames[it.structure]}.</strong> <Md text={it.why} inline /></span>
          </p>
          <div><button class="btn" onClick={next}>{idx + 1 < items.length ? 'Next market' : 'Finish'}</button></div>
        </div>
      )}
    </div>
  );
}

// ---------------- Level 2: find the profit ----------------

type ProfitPhase = 'output' | 'price' | 'profit' | 'kind' | 'solved';

function ScheduleTable(props: { r: ProfitRound; phase: ProfitPhase; wrongQ: number | null; onPick: (q: number) => void; teacher: boolean }) {
  const { r, phase } = props;
  const best = bestOutput(r);
  const rs = rows(r);
  return (
    <div class="table-scroll">
      <table class="table rp-table">
        <caption class="small muted" style={{ textAlign: 'left', paddingBottom: 4 }}>Cost and revenue schedule ($). One unit is a tray of 10 drinks.</caption>
        <thead>
          <tr>
            <th scope="col">Output (Q)</th>
            <th scope="col">Price = AR</th>
            <th scope="col">TR</th>
            <th scope="col">TC</th>
            <th scope="col">MR</th>
            <th scope="col">MC</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0</td><td>–</td><td>0</td><td>{r.costs[0]}</td><td>–</td><td>–</td>
          </tr>
          {rs.map((row) => {
            const on = phase !== 'output' && row.q === best;
            return (
              <tr key={row.q} class={`${on ? 'rp-row-on' : ''} ${props.wrongQ === row.q && phase === 'output' ? 'rp-row-miss' : ''}`}>
                <td>
                  {phase === 'output' ? (
                    <button
                      type="button"
                      class={`rp-q-btn ${props.wrongQ === row.q ? 'shake' : ''}`}
                      aria-label={`Choose output ${row.q}`}
                      onClick={() => props.onPick(row.q)}
                    >
                      {row.q}
                      {props.teacher && row.q === best && <Answer />}
                    </button>
                  ) : (
                    <strong>{row.q}{on ? ' ✓' : ''}</strong>
                  )}
                </td>
                <td>{row.p}</td>
                <td>{row.tr}</td>
                <td>{row.tc}</td>
                <td>{row.mr}</td>
                <td>{row.mc}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NumberStep(props: {
  id: string;
  label: string;
  hint: string;
  active: boolean;
  typed: string;
  setTyped: (v: string) => void;
  check: () => void;
  teacher: boolean;
  answer: number;
  fb: string | null;
}) {
  return (
    <>
      <p class="small muted" style={{ margin: 0 }}>{props.hint}</p>
      <div class="row">
        <label for={props.id}>{props.label}</label>
        <input
          id={props.id}
          type="text"
          inputMode="decimal"
          class="rp-input"
          value={props.typed}
          disabled={!props.active}
          onInput={(ev) => props.setTyped((ev.target as HTMLInputElement).value)}
          onKeyDown={(ev) => ev.key === 'Enter' && props.check()}
        />
        {props.active && <button class="btn" onClick={props.check}>Check</button>}
        {props.teacher && props.active && <span class="badge badge-done">Answer: {fmt(props.answer)}</span>}
      </div>
      {props.active && props.fb && <Fb ok={false}><Md text={props.fb} inline /></Fb>}
    </>
  );
}

function ProfitFinder({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const rounds = useMemo(() => shuffled(data.rounds, seed + 7), [data.rounds, seed]);
  const [ri, setRi] = useState(0);
  const [phase, setPhase] = useState<ProfitPhase>('output');
  const [wrongQ, setWrongQ] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [typed2, setTyped2] = useState('');
  const [fb, setFb] = useState<string | null>(null);
  const [wrongK, setWrongK] = useState<ProfitKind | null>(null);
  const [missed, setMissed] = useState(false);
  const [points, setPoints] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const r = rounds[ri];
  const q = bestOutput(r);
  const row = rowAt(r, q);
  const kind = profitKind(r);
  const max = rounds.length * POINTS_PER_PROFIT_ROUND;
  const nextRow = rows(r).find((x) => x.q === q + 1);

  const point = () => {
    if (!missed) setPoints((p) => p + 1);
    setMissed(false);
  };

  const pickQ = (pick: number) => {
    if (phase !== 'output') return;
    const slip = outputSlip(r, pick);
    if (slip === 'right') {
      play('correct');
      point();
      setWrongQ(null);
      setFb(null);
      setPhase('price');
      setAnnounce(`Right: ${q} units. Now read the price.`);
    } else {
      play('wrong');
      setMissed(true);
      setWrongQ(pick);
      const text = data.outputText[slip];
      setFb(text);
      setAnnounce(text);
    }
  };

  const checkPrice = () => {
    if (phase !== 'price') return;
    const v = parseNumber(typed);
    if (Number.isNaN(v)) return setFb('Type a number, for example 12.');
    if (numberRight(v, row.p)) {
      play('correct');
      point();
      setFb(null);
      setPhase('profit');
      setAnnounce(`Right. The price is ${money(row.p)}. Now calculate the profit.`);
      return;
    }
    play('wrong');
    setMissed(true);
    const slip = priceMistakes(r).find((x) => numberRight(v, x.value));
    const text = slip ? data.priceText[slip.kind] : data.priceText.other;
    setFb(text);
    setAnnounce(text);
  };

  const checkProfit = () => {
    if (phase !== 'profit') return;
    const v = parseNumber(typed2);
    if (Number.isNaN(v)) return setFb('Type a number. A loss is a negative number, for example -5.');
    if (numberRight(v, row.profit)) {
      play(row.profit > 0 ? 'coin' : 'correct');
      if (row.profit > 0) celebrate({ size: 'small' });
      point();
      setFb(null);
      setPhase('kind');
      setAnnounce(`Right. Profit is ${money(row.profit)}. Now name the kind of profit.`);
      return;
    }
    play('wrong');
    setMissed(true);
    const slip = profitMistakes(r).find((x) => numberRight(v, x.value));
    const text = slip ? data.profitText[slip.kind] : data.profitText.other;
    setFb(text);
    setAnnounce(text);
  };

  const pickKind = (k: ProfitKind) => {
    if (phase !== 'kind') return;
    if (k === kind) {
      play('stamp');
      point();
      setWrongK(null);
      setPhase('solved');
      setAnnounce(`Right: ${data.kindNames[k]}.`);
    } else {
      play('wrong');
      setMissed(true);
      setWrongK(k);
      setAnnounce(data.kindWrong[k]);
    }
  };

  const next = () => {
    play('whoosh');
    setPhase('output');
    setWrongQ(null);
    setTyped('');
    setTyped2('');
    setFb(null);
    setWrongK(null);
    setMissed(false);
    if (ri + 1 < rounds.length) {
      setRi(ri + 1);
      setAnnounce('A new town.');
    } else {
      setDone(true);
      onComplete();
      if (profitWon(points)) win(onGoal, 2);
    }
  };

  if (done) {
    const won = profitWon(points);
    return (
      <div class="stack">
        <Street solo youBoard="$$$" coins={{ you: 5, rival: 0 }} />
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'Every profit found!' : 'Towns finished.'}</strong> First-try points: {points} of {max}.
          </p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[1]} stamp needs {PROFIT_GOAL} first-try points. Play again: the towns come in a new order.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  const shown = phase !== 'output' && phase !== 'price';
  const coins = shown && row.profit > 0 ? Math.max(1, Math.min(6, Math.round(row.profit / 5))) : 0;
  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2 (HL). Town {ri + 1} of {rounds.length}. First-try points: {points} of {max} (goal {PROFIT_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="rp-town-h">
        <h3 id="rp-town-h"><StepNo n={2} /> Read about the town: {r.title}</h3>
        <Street solo town={r.title} youBoard={phase === 'output' ? undefined : `$${row.p}`} coins={{ you: coins, rival: 0 }} loss={shown && row.profit < 0} />
        <div key={r.id} class="rp-scenario rp-in">
          <span class="rp-scenario-icon" aria-hidden="true">{r.icon}</span>
          <p style={{ margin: 0 }}>{r.story}</p>
        </div>
      </section>

      <div class="play">
        <section class="panel stack" aria-labelledby="rp-out-h">
          <h3 id="rp-out-h"><StepNo n={3} /> Choose the profit-maximizing output</h3>
          <p class="small muted" style={{ margin: 0 }}>Profit is highest where <strong>MC = MR</strong>: make every unit where MR is at least MC, and stop before MC rises above MR. Tap the output.</p>
          <ScheduleTable r={r} phase={phase} wrongQ={wrongQ} onPick={pickQ} teacher={teacher} />
          {phase === 'output' && fb && <Fb ok={false}><Md text={fb} inline /></Fb>}
          {phase !== 'output' && (
            <Fb ok>
              At {q} units, MR ({money(row.mr)}) is {row.mr === row.mc ? 'equal to' : 'above'} MC ({money(row.mc)}), so this unit adds profit.
              {nextRow ? ` At ${q + 1} units, MC (${money(nextRow.mc)}) is above MR (${money(nextRow.mr)}), so that unit would cut profit.` : ''}
            </Fb>
          )}
        </section>

        <div class="stack">
          {phase !== 'output' && (
            <section class="panel stack" aria-labelledby="rp-price-h">
              <h3 id="rp-price-h"><StepNo n={4} /> Read the price</h3>
              <NumberStep
                id="rp-price"
                label="Price ($)"
                hint={`What price does the firm charge at ${q} units?`}
                active={phase === 'price'}
                typed={typed}
                setTyped={setTyped}
                check={checkPrice}
                teacher={teacher}
                answer={row.p}
                fb={fb}
              />
              {phase !== 'price' && <Fb ok>Price = AR = <strong>{money(row.p)}</strong>. The demand curve (AR) shows the price buyers pay for {q} units.</Fb>}
            </section>
          )}

          {(phase === 'profit' || phase === 'kind' || phase === 'solved') && (
            <section class="panel stack" aria-labelledby="rp-profit-h">
              <h3 id="rp-profit-h"><StepNo n={5} /> Calculate the profit</h3>
              <NumberStep
                id="rp-profit"
                label="Profit ($)"
                hint="Profit = TR − TC. A loss is a negative number."
                active={phase === 'profit'}
                typed={typed2}
                setTyped={setTyped2}
                check={checkProfit}
                teacher={teacher}
                answer={row.profit}
                fb={fb}
              />
              {phase !== 'profit' && (
                <Fb ok>
                  Profit = TR − TC = {money(row.tr)} − {money(row.tc)} = <strong>{money(row.profit)}</strong>. Check: AC = TC ÷ Q = {money(row.tc)} ÷ {q} = {money(row.ac)}, and (AR − AC) × Q = ({money(row.p)} − {money(row.ac)}) × {q} = {money(row.profit)}.
                </Fb>
              )}
            </section>
          )}

          {(phase === 'kind' || phase === 'solved') && (
            <section class="panel stack" aria-labelledby="rp-kind-h">
              <h3 id="rp-kind-h"><StepNo n={6} /> Name the kind of profit</h3>
              <div class="rp-kinds" role="group" aria-label="Kinds of profit">
                {PROFIT_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    class={`choice-btn ${wrongK === k ? 'shake chosen' : ''} ${phase === 'solved' && k === kind ? 'choice-right' : ''}`}
                    disabled={phase !== 'kind'}
                    onClick={() => pickKind(k)}
                  >
                    {data.kindNames[k]}
                    {teacher && phase === 'kind' && k === kind && <Answer />}
                  </button>
                ))}
              </div>
              {phase === 'kind' && wrongK && <Fb ok={false}><Md text={data.kindWrong[wrongK]} inline /></Fb>}
              {phase === 'solved' && (
                <div class="callout callout-ok stack" role="status">
                  <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                    <MarkIcon /> <span><strong>{data.kindNames[kind]}.</strong> <Md text={r.why} inline /></span>
                  </p>
                  <div><button class="btn" onClick={next}>{ri + 1 < rounds.length ? 'Next town' : 'Finish'}</button></div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Level 3: price war ----------------

function PayoffMatrix(props: { m: Matrix; pick?: (y: Move, r: Move) => void; teacher?: boolean; answer?: [Move, Move]; on?: [Move, Move]; wrong?: [Move, Move] | null }) {
  const { m } = props;
  return (
    <div class="table-scroll">
      <table class="rp-matrix">
        <caption class="small muted">Profit per day ($). In each cell: your profit, then the rival's profit.</caption>
        <thead>
          <tr>
            <td />
            <th scope="col" class="rp-rival-h">Rival: high price</th>
            <th scope="col" class="rp-rival-h">Rival: low price</th>
          </tr>
        </thead>
        <tbody>
          {MOVES.map((y) => (
            <tr key={y}>
              <th scope="row" class="rp-you-h">You: {y} price</th>
              {MOVES.map((r) => {
                const [a, b] = cell(m, y, r);
                const isOn = props.on && props.on[0] === y && props.on[1] === r;
                const isWrong = props.wrong && props.wrong[0] === y && props.wrong[1] === r;
                const inner = (
                  <>
                    <span class="rp-pay-you">You {money(a)}</span>
                    <span class="rp-pay-rival">Rival {money(b)}</span>
                  </>
                );
                return (
                  <td key={r} class={`${isOn ? 'rp-cell-on' : ''}`}>
                    {props.pick ? (
                      <button type="button" class={`rp-cell-btn ${isWrong ? 'shake chosen' : ''}`} onClick={() => props.pick!(y, r)} aria-label={`You ${y} price, rival ${r} price: you ${money(a)}, rival ${money(b)}`}>
                        {inner}
                        {props.teacher && props.answer && props.answer[0] === y && props.answer[1] === r && <Answer />}
                      </button>
                    ) : (
                      <div class="rp-cell">{inner}</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type DuelStage = 'matrix' | 'week' | 'judge' | 'done';
type WeekPhase = 'predict' | 'choose' | 'read' | 'result';

function PriceWar({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const m = data.matrix;
  const judgements = useMemo(
    () => shuffled(data.judgements, seed + 19).map((j, i) => ({ ...j, options: shuffled(j.options, seed + i * 7 + 2) })),
    [data.judgements, seed],
  );
  const [stage, setStage] = useState<DuelStage>('matrix');
  const [step, setStep] = useState(0);
  const [wrongMove, setWrongMove] = useState<Move | 'none' | null>(null);
  const [wrongCell, setWrongCell] = useState<[Move, Move] | null>(null);
  const [missed, setMissed] = useState(false);
  const [points, setPoints] = useState(0);
  const [week, setWeek] = useState(0);
  const [wPhase, setWPhase] = useState<WeekPhase>('predict');
  const [yours, setYours] = useState<Move[]>([]);
  const [wrongPay, setWrongPay] = useState<number | null>(null);
  const [ji, setJi] = useState(0);
  const [jPick, setJPick] = useState<number | null>(null);
  const [jSolved, setJSolved] = useState(false);
  const [announce, setAnnounce] = useState('');
  const dom = dominantStrategy(m)!;
  const eq = equilibrium(m)!;
  const max = duelMax(data.weeks, judgements.length);
  const rivalNow = titForTat(yours, week);
  const myNow = yours[week];
  const totals = yours.slice(0, wPhase === 'result' || stage !== 'week' ? yours.length : week).reduce(
    (t, y, w) => {
      const c = cell(m, y, titForTat(yours, w));
      return { you: t.you + c[0], rival: t.rival + c[1] };
    },
    { you: 0, rival: 0 },
  );

  const point = () => {
    if (!missed) setPoints((p) => p + 1);
    setMissed(false);
  };
  const miss = () => {
    play('wrong');
    setMissed(true);
  };

  // Steps 0 and 1: best reply to a high and to a low rival price. Step 2: dominant strategy. Step 3: the equilibrium cell.
  const replyFor = (s: number): Move => (s === 0 ? 'high' : 'low');
  const pickMove = (mv: Move | 'none') => {
    if (step <= 1) {
      const rival = replyFor(step);
      if (mv === bestReply(m, rival)) {
        play('correct');
        point();
        setWrongMove(null);
        setStep(step + 1);
        setAnnounce(`Right: a ${mv} price earns you more when the rival sets a ${rival} price.`);
      } else {
        miss();
        setWrongMove(mv);
        setAnnounce(`Look at the column for a ${rival} rival price.`);
      }
    } else if (step === 2) {
      if (mv === dom) {
        play('correct');
        point();
        setWrongMove(null);
        setStep(3);
        setAnnounce(`Right: a ${dom} price is your dominant strategy.`);
      } else {
        miss();
        setWrongMove(mv);
        setAnnounce('Look at your two answers above.');
      }
    }
  };

  const pickCell = (y: Move, r: Move) => {
    if (step !== 3) return;
    if (y === eq[0] && r === eq[1]) {
      play('stamp');
      point();
      setWrongCell(null);
      setStep(4);
      setAnnounce('Right. Both set a low price.');
    } else {
      miss();
      setWrongCell([y, r]);
      setAnnounce(cellWrongText(y, r));
    }
  };

  const cellWrongText = (y: Move, r: Move) => {
    if (y === 'high' && r === 'high') return `This cell is best for the two cafés together, but each one can earn more by cutting its price (${money(cell(m, 'low', 'high')[0])} instead of ${money(cell(m, 'high', 'high')[0])}). Without a deal, they do not stay here.`;
    if (y === 'high') return `Here you set a high price while the rival sets a low one. You would switch to a low price, because ${money(cell(m, 'low', 'low')[0])} is more than ${money(cell(m, 'high', 'low')[0])}.`;
    return `Here the rival sets a high price while you set a low one. The rival would switch to a low price, because ${money(cell(m, 'low', 'low')[1])} is more than ${money(cell(m, 'low', 'high')[1])}.`;
  };

  const predict = (mv: Move) => {
    if (wPhase !== 'predict') return;
    if (mv === rivalNow) {
      play('correct');
      point();
      setWrongMove(null);
      setWPhase('choose');
      setAnnounce(`Right: the rival will set a ${mv} price. Now choose your price.`);
    } else {
      miss();
      setWrongMove(mv);
      setAnnounce(week === 0 ? 'The rival starts with a high price.' : `The rival copies your price from last week: a ${yours[week - 1]} price.`);
    }
  };

  const choose = (mv: Move) => {
    if (wPhase !== 'choose') return;
    play('whoosh');
    setYours([...yours.slice(0, week), mv]);
    setWrongMove(null);
    setWPhase('read');
    setAnnounce(`You set a ${mv} price. The rival set a ${rivalNow} price. Read your profit from the matrix.`);
  };

  const readPay = (v: number) => {
    if (wPhase !== 'read') return;
    const [a] = cell(m, myNow, rivalNow);
    if (v === a) {
      play('coin');
      point();
      setWrongPay(null);
      setWPhase('result');
      setAnnounce(`Right: you earn ${money(a)} this week.`);
    } else {
      miss();
      setWrongPay(v);
      setAnnounce(payWrongText(v));
    }
  };

  const payWrongText = (v: number) => {
    const [, b] = cell(m, myNow, rivalNow);
    if (v === b) return 'That is the rival\'s profit. Your profit is the first number in the cell.';
    return `Find the row for your price (${myNow}) and the column for the rival's price (${rivalNow}).`;
  };

  const nextWeek = () => {
    play('whoosh');
    setWrongPay(null);
    setMissed(false);
    if (week + 1 < data.weeks) {
      setWeek(week + 1);
      setWPhase('predict');
      setAnnounce(`Week ${week + 2}.`);
    } else {
      setStage('judge');
      setAnnounce('All weeks played. Now judge what happened.');
    }
  };

  const pickJudge = (i: number) => {
    if (jSolved) return;
    setJPick(i);
    const o = judgements[ji].options[i];
    if (o.correct) {
      play('stamp');
      point();
      setJSolved(true);
    } else {
      miss();
    }
    setAnnounce(o.feedback);
  };

  const nextJudge = () => {
    play('whoosh');
    setJPick(null);
    setJSolved(false);
    setMissed(false);
    if (ji + 1 < judgements.length) setJi(ji + 1);
    else {
      setStage('done');
      onComplete();
      if (duelWon(points)) win(onGoal, 3);
    }
  };

  const allHigh = cell(m, 'high', 'high');
  const warWeeks = yours.filter((y, w) => y === 'low' && titForTat(yours, w) === 'low').length;
  const story = yours.length === 0 ? '' : yours.every((y) => y === 'high')
    ? `You kept a high price every week, and so did the rival. Neither café cut its price, with no deal at all. Prices stayed high, like a cartel, but this kind of cooperation can break at any time.`
    : warWeeks > 0
      ? `You cut your price, and the rival copied you. There were ${warWeeks} week${warWeeks === 1 ? '' : 's'} of a price war, where both cafés earned only ${money(cell(m, 'low', 'low')[0])}. Each café's price depends on the other's: this is interdependence.`
      : `You cut your price once and gained for a week, but the rival copied you the next week. In a game that repeats, cheating brings revenge.`;

  if (stage === 'done') {
    const won = duelWon(points);
    return (
      <div class="stack">
        <Street you={yours[yours.length - 1]} rival={titForTat(yours, yours.length - 1)} />
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'A true game theorist!' : 'Duel finished.'}</strong> First-try points: {points} of {max}.
          </p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[2]} stamp needs {DUEL_GOAL} first-try points. Play again: try a different pricing plan.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  const streetYou = stage === 'week' && (wPhase === 'read' || wPhase === 'result') ? myNow : stage === 'matrix' ? undefined : yours[yours.length - 1];
  const streetRival = stage === 'week' ? (wPhase === 'read' || wPhase === 'result' ? rivalNow : undefined) : stage === 'judge' ? titForTat(yours, yours.length - 1) : undefined;
  const weekPay = stage === 'week' && wPhase === 'result' ? cell(m, myNow, rivalNow) : null;
  const banner = streetYou === 'low' && streetRival === 'low' ? 'PRICE WAR!' : undefined;

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3 (HL). {stage === 'matrix' ? 'Read the matrix' : stage === 'week' ? `Week ${week + 1} of ${data.weeks}` : `Judgement ${ji + 1} of ${judgements.length}`}. First-try points: {points} of {max} (goal {DUEL_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="rp-duel-h">
        <h3 id="rp-duel-h"><StepNo n={2} /> The coffee street duel</h3>
        <Street you={streetYou} rival={streetRival} banner={banner} coins={weekPay ? { you: Math.round(weekPay[0] / 200), rival: Math.round(weekPay[1] / 200) } : undefined} />
        <p class="small" style={{ margin: 0 }}>
          <strong>The rival's rule:</strong> it starts with a high price. After that, it copies your price from the week before.
          {yours.length > 0 && stage !== 'matrix' && <> Total so far: you <strong>{money(totals.you)}</strong>, rival <strong>{money(totals.rival)}</strong>.</>}
        </p>
      </section>

      <div class="play">
        <section class="panel stack" aria-labelledby="rp-matrix-h">
          <h3 id="rp-matrix-h"><StepNo n={3} /> The payoff matrix</h3>
          <PayoffMatrix
            m={m}
            pick={stage === 'matrix' && step === 3 ? pickCell : undefined}
            teacher={teacher}
            answer={eq}
            wrong={wrongCell}
            on={stage === 'matrix' && step >= 4 ? eq : stage === 'week' && (wPhase === 'read' || wPhase === 'result') && wPhase === 'result' ? [myNow, rivalNow] : undefined}
          />
          <p class="small muted" style={{ margin: 0 }}>Rows are your price. Columns are the rival's price.</p>
        </section>

        <div class="stack">
          {stage === 'matrix' && (
            <section class="panel stack" aria-labelledby="rp-read-m-h">
              <h3 id="rp-read-m-h"><StepNo n={4} /> Find the best move</h3>
              {[0, 1].map((s) => step >= s && (
                <div key={s} class="stack" style={{ gap: 8 }}>
                  <p style={{ margin: 0 }}>The rival sets a <strong>{replyFor(s)}</strong> price. Which price earns <strong>you</strong> more?</p>
                  <div class="rp-grid2" role="group" aria-label={`Best reply to a ${replyFor(s)} price`}>
                    {MOVES.map((mv) => {
                      const right = mv === bestReply(m, replyFor(s));
                      return (
                        <button
                          key={mv}
                          type="button"
                          class={`choice-btn ${step === s && wrongMove === mv ? 'shake chosen' : ''} ${step > s && right ? 'choice-right' : ''}`}
                          disabled={step !== s}
                          onClick={() => pickMove(mv)}
                        >
                          {MOVE_NAME[mv]}
                          {teacher && step === s && right && <Answer />}
                        </button>
                      );
                    })}
                  </div>
                  {step === s && wrongMove && wrongMove !== 'none' && (
                    <Fb ok={false}>Look at the column for a {replyFor(s)} rival price. A {wrongMove} price earns you {money(cell(m, wrongMove as Move, replyFor(s))[0])}. What does the other price earn?</Fb>
                  )}
                  {step > s && <Fb ok>A {bestReply(m, replyFor(s))} price earns you {money(cell(m, bestReply(m, replyFor(s))!, replyFor(s))[0])}, more than {money(cell(m, bestReply(m, replyFor(s)) === 'high' ? 'low' : 'high', replyFor(s))[0])}.</Fb>}
                </div>
              ))}
              {step >= 2 && (
                <div class="stack" style={{ gap: 8 }}>
                  <p style={{ margin: 0 }}>A <strong>dominant strategy</strong> is the best move whatever the rival does. Which is yours?</p>
                  <div class="stack" role="group" aria-label="Dominant strategy" style={{ gap: 8 }}>
                    {([...MOVES, 'none'] as const).map((mv) => {
                      const right = mv === dom;
                      return (
                        <button
                          key={mv}
                          type="button"
                          class={`choice-btn ${step === 2 && wrongMove === mv ? 'shake chosen' : ''} ${step > 2 && right ? 'choice-right' : ''}`}
                          disabled={step !== 2}
                          onClick={() => pickMove(mv)}
                        >
                          {mv === 'none' ? 'None: it depends on what the rival does' : MOVE_NAME[mv]}
                          {teacher && step === 2 && right && <Answer />}
                        </button>
                      );
                    })}
                  </div>
                  {step === 2 && wrongMove && (
                    <Fb ok={false}>{wrongMove === 'none' ? 'Look at your two answers: the best price was the same both times.' : 'That price was not your best move in either case. Look at your two answers.'}</Fb>
                  )}
                  {step > 2 && <Fb ok>A low price is best whether the rival goes high or low. So a low price is your <strong>dominant strategy</strong>.</Fb>}
                </div>
              )}
              {step >= 3 && (
                <div class="stack" style={{ gap: 8 }}>
                  <p style={{ margin: 0 }}>The rival reads the same matrix, so a low price is its dominant strategy too. <strong>Tap the cell in the matrix</strong> where you both end up.</p>
                  {step === 3 && wrongCell && <Fb ok={false}>{cellWrongText(wrongCell[0], wrongCell[1])}</Fb>}
                  {step > 3 && (
                    <div class="callout callout-ok stack" role="status">
                      <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                        <MarkIcon />
                        <span>
                          Both cafés set a low price and earn {money(cell(m, 'low', 'low')[0])} each. Neither can do better by changing alone, so they stay there (a Nash equilibrium). But both would earn {money(allHigh[0])} with high prices. This is the <strong>prisoner's dilemma</strong>.
                        </span>
                      </p>
                      <div><button class="btn" onClick={() => { play('whoosh'); setStage('week'); setMissed(false); setAnnounce('Week 1. Predict the rival\'s price.'); }}>Start the duel</button></div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {stage === 'week' && (
            <section class="panel stack" aria-labelledby="rp-week-h">
              <h3 id="rp-week-h"><StepNo n={4} /> Week {week + 1}: predict, price, profit</h3>
              <p style={{ margin: 0 }}>What price will the rival set this week?</p>
              <div class="rp-grid2" role="group" aria-label="Predict the rival's price">
                {MOVES.map((mv) => (
                  <button
                    key={mv}
                    type="button"
                    class={`choice-btn ${wPhase === 'predict' && wrongMove === mv ? 'shake chosen' : ''} ${wPhase !== 'predict' && mv === rivalNow ? 'choice-right' : ''}`}
                    disabled={wPhase !== 'predict'}
                    onClick={() => predict(mv)}
                  >
                    {MOVE_NAME[mv]}
                    {teacher && wPhase === 'predict' && mv === rivalNow && <Answer />}
                  </button>
                ))}
              </div>
              {wPhase === 'predict' && wrongMove && (
                <Fb ok={false}>{week === 0 ? 'Read the rival\'s rule: it starts with a high price.' : `Read the rival's rule: it copies your price from last week. Last week you set a ${yours[week - 1]} price.`}</Fb>
              )}

              {wPhase !== 'predict' && (
                <>
                  <p style={{ margin: 0 }}>Now choose <strong>your</strong> price. There is no wrong choice here: see what happens.</p>
                  <div class="rp-grid2" role="group" aria-label="Your price">
                    {MOVES.map((mv) => (
                      <button
                        key={mv}
                        type="button"
                        class={`choice-btn rp-price-btn ${myNow === mv && wPhase !== 'choose' ? 'choice-right' : ''}`}
                        aria-pressed={wPhase !== 'choose' ? myNow === mv : undefined}
                        disabled={wPhase !== 'choose'}
                        onClick={() => choose(mv)}
                      >
                        {MOVE_NAME[mv]}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {(wPhase === 'read' || wPhase === 'result') && (
                <>
                  <p style={{ margin: 0 }}>You set a <strong>{myNow}</strong> price. The rival set a <strong>{rivalNow}</strong> price. What is your profit this week?</p>
                  <div class="rp-grid4" role="group" aria-label="Your profit this week">
                    {[...new Set(MOVES.flatMap((y) => MOVES.map((r) => cell(m, y, r)[0])))].sort((a, b) => a - b).map((v) => {
                      const right = v === cell(m, myNow, rivalNow)[0];
                      return (
                        <button
                          key={v}
                          type="button"
                          class={`choice-btn ${wrongPay === v && wPhase === 'read' ? 'shake chosen' : ''} ${wPhase === 'result' && right ? 'choice-right' : ''}`}
                          disabled={wPhase !== 'read'}
                          onClick={() => readPay(v)}
                        >
                          {money(v)}
                          {teacher && wPhase === 'read' && right && <Answer />}
                        </button>
                      );
                    })}
                  </div>
                  {wPhase === 'read' && wrongPay !== null && <Fb ok={false}>{payWrongText(wrongPay)}</Fb>}
                </>
              )}

              {wPhase === 'result' && weekPay && (
                <div class="callout callout-ok stack" role="status">
                  <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                    <MarkIcon />
                    <span>
                      You earn <strong>{money(weekPay[0])}</strong> and the rival earns <strong>{money(weekPay[1])}</strong>.{' '}
                      {myNow === 'low' && rivalNow === 'high' && 'You undercut the rival and won its customers. Next week it will copy you.'}
                      {myNow === 'high' && rivalNow === 'low' && 'The rival undercut you this week, because it copied your low price. Customers walked across the street.'}
                      {myNow === 'low' && rivalNow === 'low' && 'Both prices are low: a price war. Both cafés earn less.'}
                      {myNow === 'high' && rivalNow === 'high' && 'Both prices are high. Both cafés share the customers and earn well.'}
                    </span>
                  </p>
                  <div><button class="btn" onClick={nextWeek}>{week + 1 < data.weeks ? 'Next week' : 'See what happened'}</button></div>
                </div>
              )}
            </section>
          )}

          {stage === 'judge' && (
            <section class="panel stack" aria-labelledby="rp-judge-h">
              <h3 id="rp-judge-h"><StepNo n={4} /> Judge what happened</h3>
              {ji === 0 && (
                <p class="rp-story" style={{ margin: 0 }}>
                  {story} Over {data.weeks} weeks you earned <strong>{money(totals.you)}</strong>. With high prices every week, each café would earn {money(allHigh[0] * data.weeks)}.
                </p>
              )}
              <p style={{ margin: 0 }}><strong><Md text={judgements[ji].prompt} inline /></strong></p>
              <div class="stack" role="group" aria-label="Answers" style={{ gap: 8 }}>
                {judgements[ji].options.map((o, i) => (
                  <button
                    key={`${judgements[ji].id}-${i}`}
                    type="button"
                    class={`choice-btn ${jPick === i && !o.correct ? 'shake chosen' : ''} ${jSolved && o.correct ? 'choice-right' : ''}`}
                    disabled={jSolved}
                    onClick={() => pickJudge(i)}
                  >
                    {o.text}
                    {teacher && !jSolved && o.correct && <Answer />}
                  </button>
                ))}
              </div>
              {jPick !== null && <Fb ok={!!judgements[ji].options[jPick].correct}><Md text={judgements[ji].options[jPick].feedback} inline /></Fb>}
              {jSolved && <div><button class="btn" onClick={nextJudge}>{ji + 1 < judgements.length ? 'Next question' : 'Finish'}</button></div>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Learn it ----------------

/** Points along a curve, for drawing. */
function sample(f: (q: number) => number, from: number, to: number, step = 2.5): Pt[] {
  const out: Pt[] = [];
  for (let q = from; q <= to + 1e-9; q += step) out.push({ q, p: f(q) });
  return out;
}

// The drawn curves of the monopoly diagram. These shapes are only for drawing: students never see a function.
const AR = (q: number) => 22 - 0.2 * q;
const MC = (q: number) => 5 + ((q - 25) * (q - 25)) / 225;
const AC = (q: number) => 9 + (2 * (q - 55) * (q - 55)) / 225;
const QM = 40;
const Q_PC = 59.12; // where AR = MC: the output a competitive market would make

const LEARN_SPEC: DiagramSpec = {
  xMax: 100,
  yMax: 24,
  xLabel: 'Quantity',
  yLabel: 'Price, costs, revenue ($)',
  title: 'A monopoly making abnormal profit',
  description:
    'D = AR slopes down. MR slopes down twice as steeply. MC dips then rises and cuts through the lowest point of the U-shaped AC curve. The monopoly makes Qm where MC = MR, and charges Pm from the demand curve above Qm. AC at Qm is below Pm, so the rectangle between them is abnormal profit. A triangle between AR and MC, from Qm to where they meet, is the welfare loss.',
  areas: [
    { points: [{ q: 0, p: AC(QM) }, { q: QM, p: AC(QM) }, { q: QM, p: AR(QM) }, { q: 0, p: AR(QM) }], tone: 'green', pattern: 'dots', label: 'Abnormal profit', labelAt: { q: 11, p: 12.3 } },
    { points: [...sample(AR, QM, Q_PC, 2), ...sample(MC, QM, Q_PC, 2).reverse()], tone: 'red', pattern: 'hatch' },
  ],
  guides: [{ at: { q: QM, p: AR(QM) }, xText: 'Qm', yText: 'Pm' }, { at: { q: QM, p: AC(QM) }, yText: 'AC' }],
  curves: [
    { line: { a: { q: 0, p: 22 }, b: { q: 100, p: 2 } }, tone: 'navy', label: 'D = AR', labelOffset: { dx: -62, dy: -12 } },
    { line: { a: { q: 0, p: 22 }, b: { q: 55, p: 0 } }, tone: 'navy', dashed: true, label: 'MR', labelOffset: { dx: 4, dy: -8 } },
    { points: sample(MC, 0, 85), tone: 'red', label: 'MC', labelOffset: { dx: 6, dy: 6 } },
    { points: sample(AC, 16, 94), tone: 'green', label: 'AC', labelOffset: { dx: 6, dy: 6 } },
  ],
  dots: [{ at: { q: QM, p: MC(QM) }, label: 'MC = MR' }],
  texts: [{ at: { q: 62, p: 13.5 }, text: 'Welfare loss', tone: 'red', anchor: 'start' }],
};

function LearnDiagram() {
  return <SpecDiagram spec={LEARN_SPEC} />;
}

export { Try, LearnDiagram };
