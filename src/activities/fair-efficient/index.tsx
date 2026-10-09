/**
 * Fair or Efficient? (2.12, HL): the market's inability to achieve equity.
 *
 * Level 1: sort cases as equity (fairness) or equality (everyone the same). Each one drops onto a balance scale.
 * Level 2: judge market outcomes as efficient, equitable, both or neither, then give the reason. The scale tips.
 * Level 3: follow the money round a circular flow: why each household's income is high or low,
 *          the share of income each group gets, and the government response that matches each cause.
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
import { shuffled } from '../island-economy/model';
import {
  Fairness, FAIRNESS, FLOW_GOAL, flowMax, flowWidth, flowWon, incomeShare, isEfficient, isEquitable, JUDGE_GOAL, judgeWon,
  numberRight, parseNumber, round2, SORT_GOAL, sortWon, tilt, total, Verdict, VERDICTS, verdictTilt,
} from './model';
import './scale.css';

const STAMP_NAMES = ['Equity Spotter', 'Fair Judge', 'Flow Detective'];

interface Case { id: string; icon: string; text: string; kind: Fairness; why: string }
interface Option { text: string; correct?: boolean; feedback: string }
interface Outcome { id: string; icon: string; title: string; story: string; verdict: Verdict; reasons: Option[] }
type CauseId = 'capital' | 'inherit' | 'skills' | 'lowskill' | 'none';
interface Household { id: string; name: string; icon: string; income: number; cause: CauseId; story: string }
interface Calc { id: string; prompt: string; group: number[]; answer: number; working: string; mistakes: { value: number; feedback: string }[] }
interface Response { id: string; icon: string; cause: string; options: Option[] }

interface TryContent {
  levels: LevelInfo[];
  kindNames: Record<Fairness, string>;
  kindHints: Record<Fairness, string>;
  cases: Case[];
  verdictNames: Record<Verdict, string>;
  verdictWrong: Record<Verdict, string>;
  outcomes: Outcome[];
  households: Household[];
  causes: Record<CauseId, { label: string; icon: string; wrong: string }>;
  causeOrder: CauseId[];
  calcs: Calc[];
  responses: Response[];
}

const KIND_ICON: Record<Fairness, string> = { equity: '🤝', equality: '🟰' };
const VERDICT_ICON: Record<Verdict, string> = { efficient: '⚙️', equitable: '🤝', both: '⚖️', neither: '✖️' };

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
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="scale" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <Sorter key={round} seed={round} {...props} />}
      {levelNo === 2 && <Judge key={round} seed={round} {...props} />}
      {levelNo === 3 && <FollowMoney key={round} seed={round} {...props} />}
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

function Finish(props: { won: boolean; title: string; line: string; need: string; again: () => void }) {
  return (
    <div class={`callout ${props.won ? 'callout-ok' : 'callout-try'} stack`} role="status">
      <p style={{ margin: 0 }}>
        <strong>{props.title}</strong> {props.line}
      </p>
      {!props.won && <p style={{ margin: 0 }}>{props.need} Play again: everything comes in a new order.</p>}
      <div><button class="btn" onClick={props.again}>Play again</button></div>
    </div>
  );
}

// ---------------- The balance scale ----------------

interface Weight { key: string; icon: string }

/**
 * A balance scale. `angle` is in degrees: positive tips the right pan down.
 * The beam turns and the pans move with CSS transitions, which stop under reduced motion.
 */
function BalanceScale(props: { left: string; right: string; leftWeights: Weight[]; rightWeights: Weight[]; angle: number; summary: string }) {
  const a = (props.angle * Math.PI) / 180;
  const arm = 118;
  const dyRight = arm * Math.sin(a), dxRight = arm * Math.cos(a) - arm;
  return (
    <svg class="fe-scale" viewBox="0 0 360 230" role="img" aria-labelledby="fe-scale-t fe-scale-d">
      <title id="fe-scale-t">Balance scale: {props.left} and {props.right}</title>
      <desc id="fe-scale-d">{props.summary}</desc>
      {/* Stand */}
      <path d="M180 52 L180 205" stroke="var(--navy)" stroke-width="7" stroke-linecap="round" />
      <path d="M130 214 Q180 196 230 214 Z" fill="var(--navy)" />
      {/* Beam */}
      <g class="fe-beam" style={{ transform: `rotate(${props.angle}deg)` }}>
        <rect x="56" y="47" width="248" height="9" rx="4.5" fill="#c9a227" stroke="#8a6d10" stroke-width="1.5" />
        <path d="M180 40 l-6 12 h12 z" fill="var(--red)" />
      </g>
      <circle cx="180" cy="51" r="7" fill="var(--white)" stroke="var(--navy)" stroke-width="3" />
      <Pan cx={62} dx={-dxRight} dy={-dyRight} label={props.left} weights={props.leftWeights} />
      <Pan cx={298} dx={dxRight} dy={dyRight} label={props.right} weights={props.rightWeights} />
    </svg>
  );
}

function Pan(props: { cx: number; dx: number; dy: number; label: string; weights: Weight[] }) {
  const { cx } = props;
  const shown = props.weights.slice(-8);
  return (
    <g class="fe-pan" style={{ transform: `translate(${props.dx}px, ${props.dy}px)` }}>
      <path d={`M${cx} 52 L${cx - 46} 128 M${cx} 52 L${cx + 46} 128`} stroke="#8a6d10" stroke-width="1.6" fill="none" />
      {shown.map((w, i) => {
        const row = Math.floor(i / 4), col = i % 4;
        const x = cx - 39 + col * 20 + (row % 2) * 8, y = 112 - row * 18;
        return (
          <g key={w.key} class="fe-drop">
            <rect x={x - 1} y={y - 1} width="20" height="17" rx="4" fill="var(--white)" stroke="var(--navy)" stroke-width="1.4" />
            <text x={x + 9} y={y + 12} text-anchor="middle" font-size="11">{w.icon}</text>
          </g>
        );
      })}
      <path d={`M${cx - 54} 128 Q${cx} 152 ${cx + 54} 128 Z`} fill="#e9d48a" stroke="#8a6d10" stroke-width="2" />
      <text x={cx} y={168} text-anchor="middle" font-size="15" font-weight="700" fill="var(--navy)">{props.label}</text>
      {props.weights.length > 0 && (
        <text x={cx} y={186} text-anchor="middle" font-size="13" fill="var(--ink-soft)">{props.weights.length}</text>
      )}
    </g>
  );
}

function tiltWords(angle: number, left: string, right: string): string {
  if (Math.abs(angle) < 1) return `The scale is level between ${left} and ${right}.`;
  return angle < 0 ? `The ${left} side is lower.` : `The ${right} side is lower.`;
}

// ---------------- Level 1: equity or equality? ----------------

function Sorter({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const items = useMemo(() => shuffled(data.cases, seed + 3), [data.cases, seed]);
  const [idx, setIdx] = useState(0);
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<Fairness | null>(null);
  const [firstRight, setFirstRight] = useState(0);
  const [pans, setPans] = useState<Record<Fairness, Weight[]>>({ equity: [], equality: [] });
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const c = items[idx];
  const goal = Math.min(SORT_GOAL, items.length);
  const angle = tilt(pans.equity.length, pans.equality.length, 3);

  const drop = (k: Fairness) => {
    if (solved) return;
    if (k === c.kind) {
      play('coin');
      setSolved(true);
      setWrong(null);
      if (!missed) setFirstRight((n) => n + 1);
      setPans({ ...pans, [k]: [...pans[k], { key: c.id, icon: c.icon }] });
      setAnnounce(`Right: ${data.kindNames[k]}.`);
    } else {
      play('wrong');
      setMissed(true);
      setWrong(k);
      setAnnounce(`Not ${data.kindNames[k]}. Read the hint and try again.`);
    }
  };

  const next = () => {
    play('whoosh');
    setSolved(false);
    setMissed(false);
    setWrong(null);
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setAnnounce('A new case.');
    } else {
      setDone(true);
      onComplete();
      if (sortWon(firstRight, goal)) win(onGoal, 1);
    }
  };

  if (done) {
    const won = sortWon(firstRight, goal);
    return (
      <Finish
        won={won}
        title={won ? 'Sorted!' : 'All cases sorted.'}
        line={`Right first time: ${firstRight} of ${items.length}. Equity: ${pans.equity.length}. Equality: ${pans.equality.length}.`}
        need={`The ${STAMP_NAMES[0]} stamp needs ${goal} right first time.`}
        again={again}
      />
    );
  }

  const wrongHint = wrong === 'equality'
    ? 'Does everyone get exactly the same here? Or do some people get more because they need more? Help based on need is equity.'
    : 'Is anyone treated differently because of their need? If everyone gets the same amount, it is equality.';

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1. Case {idx + 1} of {items.length}. Right first time: {firstRight} (goal {goal}).
      </p>
      <section class="panel stack" aria-labelledby="fe-case-h">
        <h3 id="fe-case-h"><StepNo n={2} /> Read the case</h3>
        <div key={c.id} class="fe-case fe-in">
          <span class="fe-case-icon" aria-hidden="true">{c.icon}</span>
          <p style={{ margin: 0 }}>{c.text}</p>
        </div>
        <BalanceScale
          left={data.kindNames.equity}
          right={data.kindNames.equality}
          leftWeights={pans.equity}
          rightWeights={pans.equality}
          angle={angle}
          summary={`${pans.equity.length} cases on the equity pan and ${pans.equality.length} on the equality pan. ${tiltWords(angle, 'equity', 'equality')}`}
        />
      </section>
      <section class="panel stack" aria-labelledby="fe-drop-h">
        <h3 id="fe-drop-h"><StepNo n={3} /> Drop it on a pan</h3>
        <div class="fe-pans" role="group" aria-label="Equity or equality">
          {FAIRNESS.map((k) => (
            <button
              key={k}
              type="button"
              class={`fe-pan-btn ${wrong === k ? 'shake' : ''} ${solved && c.kind === k ? 'fe-pan-right' : ''}`}
              disabled={solved}
              onClick={() => drop(k)}
            >
              <span class="fe-pan-icon" aria-hidden="true">{KIND_ICON[k]}</span>
              <strong>{data.kindNames[k]}</strong>
              <span class="small">{data.kindHints[k]}</span>
              {teacher && c.kind === k && !solved && <span class="badge badge-done">Answer</span>}
            </button>
          ))}
        </div>
        {wrong && !solved && <Fb ok={false}>Not {data.kindNames[wrong].toLowerCase()}. {wrongHint}</Fb>}
        {solved && (
          <div class="callout callout-ok stack" role="status">
            <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
              <MarkIcon /> <span><strong>{data.kindNames[c.kind]}.</strong> <Md text={c.why} inline /></span>
            </p>
            <div><button class="btn" onClick={next}>{idx + 1 < items.length ? 'Next case' : 'Finish'}</button></div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------- Level 2: judge the outcome ----------------

function Judge({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const rounds = useMemo(
    () => shuffled(data.outcomes, seed + 7).map((o, i) => ({ ...o, reasons: shuffled(o.reasons, seed + 31 + i) })),
    [data.outcomes, seed],
  );
  const [ri, setRi] = useState(0);
  const [missed, setMissed] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [wrongVerdict, setWrongVerdict] = useState<Verdict | null>(null);
  const [reason, setReason] = useState<number | null>(null);
  const [firstRight, setFirstRight] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const r = rounds[ri];
  const reasonSolved = reason !== null && !!r.reasons[reason].correct;
  const angle = verdict ? verdictTilt(verdict) : 0;

  const pickVerdict = (v: Verdict) => {
    if (verdict) return;
    if (v === r.verdict) {
      play('coin');
      setVerdict(v);
      setWrongVerdict(null);
      setAnnounce(`Right: ${data.verdictNames[v]}. Now choose the reason.`);
    } else {
      play('wrong');
      setMissed(true);
      setWrongVerdict(v);
      setAnnounce(`Not ${data.verdictNames[v]}. ${data.verdictWrong[v]}`);
    }
  };

  const pickReason = (i: number) => {
    if (reasonSolved) return;
    setReason(i);
    const ok = !!r.reasons[i].correct;
    play(ok ? 'correct' : 'wrong');
    if (ok && !missed) setFirstRight((n) => n + 1);
    if (!ok) setMissed(true);
    setAnnounce(r.reasons[i].feedback);
  };

  const next = () => {
    play('whoosh');
    setMissed(false);
    setVerdict(null);
    setWrongVerdict(null);
    setReason(null);
    if (ri + 1 < rounds.length) setRi(ri + 1);
    else {
      setDone(true);
      onComplete();
      if (judgeWon(firstRight)) win(onGoal, 2);
    }
  };

  if (done) {
    const won = judgeWon(firstRight);
    return (
      <Finish
        won={won}
        title={won ? 'Fair judging!' : 'All outcomes judged.'}
        line={`Verdict and reason right first time: ${firstRight} of ${rounds.length}.`}
        need={`The ${STAMP_NAMES[1]} stamp needs ${JUDGE_GOAL} rounds with no wrong try.`}
        again={again}
      />
    );
  }

  const leftW: Weight[] = verdict && isEfficient(verdict) ? [{ key: `${r.id}-ef`, icon: '⚙️' }] : [];
  const rightW: Weight[] = verdict && isEquitable(verdict) ? [{ key: `${r.id}-eq`, icon: '🤝' }] : [];

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2. Outcome {ri + 1} of {rounds.length}. Right first time: {firstRight} (goal {JUDGE_GOAL}).
      </p>
      <div class="play">
        <section class="panel stack" aria-labelledby="fe-out-h">
          <h3 id="fe-out-h"><StepNo n={2} /> Read the market outcome</h3>
          <div key={r.id} class="fe-case fe-in">
            <span class="fe-case-icon" aria-hidden="true">{r.icon}</span>
            <div>
              <p style={{ margin: 0 }}><strong>{r.title}</strong></p>
              <p style={{ margin: 0 }}>{r.story}</p>
            </div>
          </div>
          <BalanceScale
            left="Efficiency"
            right="Equity"
            leftWeights={leftW}
            rightWeights={rightW}
            angle={angle}
            summary={verdict ? `${data.verdictNames[verdict]}. ${tiltWords(angle, 'efficiency', 'equity')}` : 'Not judged yet. The scale is level.'}
          />
          {verdict === 'neither' && <p class="small muted" style={{ margin: 0 }}>Both pans are empty: this outcome is neither efficient nor equitable.</p>}
          {verdict === 'both' && <p class="small muted" style={{ margin: 0 }}>Both pans have a weight: the outcome is efficient and equitable.</p>}
        </section>

        <div class="stack">
          <section class="panel stack" aria-labelledby="fe-verdict-h">
            <h3 id="fe-verdict-h"><StepNo n={3} /> Give your verdict</h3>
            <div class="choice-grid fe-verdicts" role="group" aria-label="Verdicts">
              {VERDICTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  class={`choice-btn ${wrongVerdict === v ? 'shake chosen' : ''} ${verdict === v ? 'choice-right' : ''}`}
                  disabled={verdict !== null}
                  onClick={() => pickVerdict(v)}
                >
                  <span aria-hidden="true">{VERDICT_ICON[v]}</span> {data.verdictNames[v]}
                  {teacher && !verdict && r.verdict === v && <span class="badge badge-done">Answer</span>}
                </button>
              ))}
            </div>
            {wrongVerdict && !verdict && <Fb ok={false}>Not {data.verdictNames[wrongVerdict].toLowerCase()}. {data.verdictWrong[wrongVerdict]}</Fb>}
          </section>

          {verdict && (
            <section class="panel stack" aria-labelledby="fe-reason-h">
              <h3 id="fe-reason-h"><StepNo n={4} /> Choose the reason</h3>
              <div class="stack" role="group" aria-label="Reasons">
                {r.reasons.map((o, i) => (
                  <button
                    key={`${r.id}-${i}`}
                    type="button"
                    class={`choice-btn ${reason === i && !o.correct ? 'shake chosen' : ''} ${reasonSolved && o.correct ? 'choice-right' : ''}`}
                    disabled={reasonSolved}
                    onClick={() => pickReason(i)}
                  >
                    {o.text}
                    {teacher && o.correct && !reasonSolved && <span class="badge badge-done">Answer</span>}
                  </button>
                ))}
              </div>
              {reason !== null && <Fb ok={reasonSolved}>{r.reasons[reason].feedback}</Fb>}
              {reasonSolved && <div><button class="btn" onClick={next}>{ri + 1 < rounds.length ? 'Next outcome' : 'Finish'}</button></div>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Level 3: follow the money ----------------

type FlowPhase = 'causes' | 'calc' | 'respond' | 'done';

/** The circular flow: firms pay factor incomes to five households. Wider flows carry more money. */
function MoneyFlow(props: { households: Household[]; focus: number | null; solved: Set<string>; causes: TryContent['causes'] }) {
  const hs = props.households;
  const biggest = Math.max(...hs.map((h) => h.income));
  const all = total(hs.map((h) => h.income));
  const rowY = (i: number) => 34 + i * 58;
  return (
    <svg class="fe-flow" viewBox="0 0 360 336" role="img" aria-labelledby="fe-flow-t fe-flow-d">
      <title id="fe-flow-t">Circular flow: factor incomes from firms to five households</title>
      <desc id="fe-flow-d">
        {`Firms on the right pay money to five households on the left, in $ thousand a year. ${hs.map((h) => `${h.name}: ${h.income}`).join('. ')}. Total ${all}. Households send their factors of production back to firms.`}
      </desc>
      {/* Factors go back to firms along the bottom */}
      <path d="M70 296 V322 H300 V196" fill="none" stroke="var(--ink-soft)" stroke-width="2" stroke-dasharray="5 5" marker-end="url(#fe-ah)" />
      <text x="185" y="316" text-anchor="middle" font-size="12" fill="var(--ink-soft)">factors of production go to firms</text>
      <defs>
        <marker id="fe-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--ink-soft)" />
        </marker>
      </defs>
      {hs.map((h, i) => {
        const y = rowY(i);
        const w = flowWidth(h.income, biggest);
        return (
          <g key={h.id}>
            <path d={`M262 160 C 210 160, 200 ${y}, 140 ${y}`} fill="none" stroke="#e7cf7a" stroke-width={w} stroke-linecap="round" />
            <path class="fe-coins" d={`M262 160 C 210 160, 200 ${y}, 140 ${y}`} fill="none" stroke="#a37f12" stroke-width={Math.max(2, w / 3)} stroke-dasharray="2 14" stroke-linecap="round" />
          </g>
        );
      })}
      <rect x="262" y="128" width="88" height="64" rx="10" fill="#eef3ff" stroke="var(--navy)" stroke-width="2.5" />
      <text x="306" y="158" text-anchor="middle" font-size="16" font-weight="700" fill="var(--navy)">Firms</text>
      <text x="306" y="176" text-anchor="middle" font-size="11" fill="var(--ink-soft)">pay incomes</text>
      {hs.map((h, i) => {
        const y = rowY(i);
        const on = props.focus === i;
        const done = props.solved.has(h.id);
        return (
          <g key={`b${h.id}`}>
            <rect x="6" y={y - 24} width="134" height="48" rx="10" fill={on ? 'var(--warn-50)' : 'var(--white)'} stroke={on ? 'var(--red)' : 'var(--navy)'} stroke-width={on ? 3 : 1.6} />
            <text x="22" y={y + 6} font-size="20" aria-hidden="true">{h.icon}</text>
            <text x="50" y={y - 3} font-size="14" font-weight="700" fill="var(--ink)">{h.name}</text>
            <text x="50" y={y + 14} font-size="12" fill="var(--ink)">${h.income}k a year</text>
            {done && <text x="134" y={y - 8} text-anchor="end" font-size="13" aria-hidden="true">{props.causes[h.cause].icon}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function FollowMoney({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const hs = data.households;
  const order = useMemo(() => shuffled(hs.map((_, i) => i), seed + 13), [hs, seed]);
  const causeChoices = useMemo(() => shuffled(data.causeOrder, seed + 19), [data.causeOrder, seed]);
  const responses = useMemo(
    () => shuffled(data.responses, seed + 23).map((r, i) => ({ ...r, options: shuffled(r.options, seed + 41 + i) })),
    [data.responses, seed],
  );
  const max = flowMax(hs.length, data.calcs.length, data.responses.length);
  const [phase, setPhase] = useState<FlowPhase>('causes');
  const [points, setPoints] = useState(0);
  const [announce, setAnnounce] = useState('');
  // Station 1
  const [hi, setHi] = useState(0);
  const [hMissed, setHMissed] = useState(false);
  const [hWrong, setHWrong] = useState<CauseId | null>(null);
  const [hSolved, setHSolved] = useState(false);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  // Station 2
  const [ci, setCi] = useState(0);
  const [typed, setTyped] = useState('');
  const [cMissed, setCMissed] = useState(false);
  const [cFb, setCFb] = useState('');
  const [cSolved, setCSolved] = useState(false);
  // Station 3
  const [ri, setRi] = useState(0);
  const [rPick, setRPick] = useState<number | null>(null);
  const [rMissed, setRMissed] = useState(false);
  const [matched, setMatched] = useState<Weight[]>([]);

  const score = () => setPoints((p) => p + 1);
  const incomes = hs.map((h) => h.income);

  const hIdx = order[hi];
  const h = hs[hIdx];
  const pickCause = (k: CauseId) => {
    if (hSolved) return;
    if (k === h.cause) {
      play('coin');
      if (!hMissed) score();
      setHSolved(true);
      setHWrong(null);
      setSolvedIds(new Set([...solvedIds, h.id]));
      setAnnounce(`Right. ${h.name}: ${data.causes[k].label}.`);
    } else {
      play('wrong');
      setHMissed(true);
      setHWrong(k);
      setAnnounce(data.causes[h.cause].wrong);
    }
  };
  const nextHousehold = () => {
    play('whoosh');
    setHSolved(false);
    setHMissed(false);
    setHWrong(null);
    if (hi + 1 < order.length) setHi(hi + 1);
    else {
      setPhase('calc');
      setAnnounce('Station 2: work out the income shares.');
    }
  };

  const calc = data.calcs[ci];
  const answer = round2(incomeShare(incomes, calc.group));
  const checkCalc = () => {
    if (cSolved) return;
    const v = parseNumber(typed);
    if (Number.isNaN(v)) {
      setCFb('Type a number, for example 25 or 12.5.');
      return;
    }
    if (numberRight(v, answer)) {
      play('correct');
      if (!cMissed) score();
      setCSolved(true);
      setCFb('');
      setAnnounce(`Right: ${answer}%.`);
      return;
    }
    play('wrong');
    setCMissed(true);
    const m = calc.mistakes.find((x) => Math.abs(x.value - v) < 0.01);
    const fb = m ? m.feedback : 'Not quite. Add the incomes of the group, divide by the total income of all five households, then multiply by 100.';
    setCFb(fb);
    setAnnounce(fb);
  };
  const nextCalc = () => {
    play('whoosh');
    setTyped('');
    setCMissed(false);
    setCSolved(false);
    setCFb('');
    if (ci + 1 < data.calcs.length) setCi(ci + 1);
    else {
      setPhase('respond');
      setAnnounce('Station 3: match a government response to each cause.');
    }
  };

  const resp = responses[ri];
  const rSolved = rPick !== null && !!resp.options[rPick].correct;
  const pickResponse = (i: number) => {
    if (rSolved) return;
    setRPick(i);
    const ok = !!resp.options[i].correct;
    play(ok ? 'coin' : 'wrong');
    if (ok) {
      if (!rMissed) score();
      setMatched([...matched, { key: resp.id, icon: resp.icon }]);
    } else setRMissed(true);
    setAnnounce(resp.options[i].feedback);
  };
  const nextResponse = () => {
    play('whoosh');
    setRPick(null);
    setRMissed(false);
    if (ri + 1 < responses.length) setRi(ri + 1);
    else {
      setPhase('done');
      onComplete();
      if (flowWon(points)) win(onGoal, 3);
    }
  };

  // Station 3 scale: top incomes start heavy; each matched response adds weight to the bottom incomes.
  const gapStart = responses.length + 3;
  const bottomW: Weight[] = [{ key: 'b1', icon: '💰' }, { key: 'b2', icon: '💰' }, { key: 'b3', icon: '💰' }, ...matched];
  const topW: Weight[] = Array.from({ length: gapStart }, (_, i) => ({ key: `t${i}`, icon: '💰' }));
  const angle = tilt(topW.length, bottomW.length, 2.5);
  const won = flowWon(points);

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3. Score a point for each cause, share and response right first time. Points: {points} of {max} (goal {FLOW_GOAL}).
      </p>
      <ol class="fe-stations" aria-label="Stations">
        <li class={phase === 'causes' ? 'on' : 'done'}>Causes</li>
        <li class={phase === 'calc' ? 'on' : phase === 'causes' ? '' : 'done'}>Income shares</li>
        <li class={phase === 'respond' ? 'on' : phase === 'done' ? 'done' : ''}>Responses</li>
      </ol>

      {(phase === 'causes' || phase === 'calc') && (
        <div class="play">
          <section class="panel stack" aria-labelledby="fe-flow-h">
            <h3 id="fe-flow-h"><StepNo n={2} /> Follow the money</h3>
            <MoneyFlow households={hs} focus={phase === 'causes' ? hIdx : null} solved={solvedIds} causes={data.causes} />
            <p class="small muted" style={{ margin: 0 }}>Wider flows carry more money. Incomes are in $ thousand a year.</p>
          </section>

          {phase === 'causes' && (
            <section class="panel stack" aria-labelledby="fe-cause-h">
              <h3 id="fe-cause-h"><StepNo n={3} /> Why is this income {h.income >= 35 ? 'high' : 'low'}? ({hi + 1} of {order.length})</h3>
              <div key={h.id} class="fe-case fe-in">
                <span class="fe-case-icon" aria-hidden="true">{h.icon}</span>
                <p style={{ margin: 0 }}><strong>{h.name}: ${h.income}k a year.</strong> {h.story}</p>
              </div>
              <div class="stack" role="group" aria-label="Causes">
                {causeChoices.map((k) => (
                  <button
                    key={k}
                    type="button"
                    class={`choice-btn ${hWrong === k ? 'shake chosen' : ''} ${hSolved && h.cause === k ? 'choice-right' : ''}`}
                    disabled={hSolved}
                    onClick={() => pickCause(k)}
                  >
                    <span aria-hidden="true">{data.causes[k].icon}</span> {data.causes[k].label}
                    {teacher && !hSolved && h.cause === k && <span class="badge badge-done">Answer</span>}
                  </button>
                ))}
              </div>
              {hWrong && !hSolved && <Fb ok={false}>{data.causes[h.cause].wrong}</Fb>}
              {hSolved && (
                <div class="stack">
                  <Fb ok><strong>{data.causes[h.cause].label}.</strong> {data.causes[h.cause].wrong}</Fb>
                  <div><button class="btn" onClick={nextHousehold}>{hi + 1 < order.length ? 'Next household' : 'Go to station 2'}</button></div>
                </div>
              )}
            </section>
          )}

          {phase === 'calc' && (
            <section class="panel stack" aria-labelledby="fe-calc-h">
              <h3 id="fe-calc-h"><StepNo n={3} /> Work out the income share ({ci + 1} of {data.calcs.length})</h3>
              <table class="fe-table">
                <caption class="small">Yearly income of each household ($ thousand)</caption>
                <thead><tr><th scope="col">Household</th><th scope="col">Income</th></tr></thead>
                <tbody>
                  {hs.map((x) => <tr key={x.id}><td>{x.name}</td><td>{x.income}</td></tr>)}
                  <tr class="fe-total"><td>Total</td><td>{total(incomes)}</td></tr>
                </tbody>
              </table>
              <p style={{ margin: 0 }}><Md text={calc.prompt} inline /></p>
              <p class="small muted" style={{ margin: 0 }}>Share (%) = income of the group ÷ total income × 100</p>
              <div class="row">
                <label for="fe-calc-in">Share (%)</label>
                <input
                  id="fe-calc-in"
                  type="text"
                  inputMode="decimal"
                  class="fe-input"
                  value={typed}
                  disabled={cSolved}
                  onInput={(ev) => setTyped((ev.target as HTMLInputElement).value)}
                  onKeyDown={(ev) => ev.key === 'Enter' && checkCalc()}
                />
                {!cSolved && <button class="btn" onClick={checkCalc}>Check</button>}
                {teacher && !cSolved && <span class="badge badge-done">Answer: {answer}</span>}
              </div>
              {!cSolved && cFb && <Fb ok={false}>{cFb}</Fb>}
              {cSolved && (
                <div class="stack">
                  <Fb ok><Md text={calc.working} inline /></Fb>
                  <div><button class="btn" onClick={nextCalc}>{ci + 1 < data.calcs.length ? 'Next share' : 'Go to station 3'}</button></div>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {phase === 'respond' && (
        <div class="play">
          <section class="panel stack" aria-labelledby="fe-gap-h">
            <h3 id="fe-gap-h"><StepNo n={2} /> The income gap</h3>
            <BalanceScale
              left="Top incomes"
              right="Bottom incomes"
              leftWeights={topW}
              rightWeights={bottomW}
              angle={angle}
              summary={`Each matched response adds weight to the bottom incomes. ${tiltWords(angle, 'top incomes', 'bottom incomes')}`}
            />
            <p class="small muted" style={{ margin: 0 }}>Each response you match narrows the gap a little.</p>
          </section>
          <section class="panel stack" aria-labelledby="fe-resp-h">
            <h3 id="fe-resp-h"><StepNo n={3} /> Match the response to the cause ({ri + 1} of {responses.length})</h3>
            <div key={resp.id} class="fe-case fe-in">
              <span class="fe-case-icon" aria-hidden="true">{resp.icon}</span>
              <p style={{ margin: 0 }}><strong>Cause:</strong> {resp.cause}</p>
            </div>
            <div class="stack" role="group" aria-label="Government responses">
              {resp.options.map((o, i) => (
                <button
                  key={`${resp.id}-${i}`}
                  type="button"
                  class={`choice-btn ${rPick === i && !o.correct ? 'shake chosen' : ''} ${rSolved && o.correct ? 'choice-right' : ''}`}
                  disabled={rSolved}
                  onClick={() => pickResponse(i)}
                >
                  {o.text}
                  {teacher && o.correct && !rSolved && <span class="badge badge-done">Answer</span>}
                </button>
              ))}
            </div>
            {rPick !== null && <Fb ok={rSolved}>{resp.options[rPick].feedback}</Fb>}
            {rSolved && <div><button class="btn" onClick={nextResponse}>{ri + 1 < responses.length ? 'Next cause' : 'Finish'}</button></div>}
          </section>
        </div>
      )}

      {phase === 'done' && (
        <Finish
          won={won}
          title={won ? 'Case cracked!' : 'Money followed.'}
          line={`First-try points: ${points} of ${max}.`}
          need={`The ${STAMP_NAMES[2]} stamp needs ${FLOW_GOAL} points.`}
          again={again}
        />
      )}
    </div>
  );
}

// ---------------- Learn it ----------------

const LEARN_SPEC: DiagramSpec = {
  xMax: 100,
  yMax: 80,
  xLabel: '',
  yLabel: '',
  noAxes: true,
  title: 'Why a free market gives unequal incomes',
  description:
    'Owners of land and capital (top left) and workers (bottom left) both sell factors to firms (right). Firms pay rent, interest and profit back to owners, and wages back to workers. Owners with a lot of capital, scarce skills or inherited wealth receive much more.',
  boxes: [
    { at: { q: 18, p: 66 }, w: 26, h: 12, text: 'Owners' },
    { at: { q: 18, p: 14 }, w: 26, h: 12, text: 'Workers' },
    { at: { q: 84, p: 40 }, w: 24, h: 12, text: 'Firms' },
  ],
  arrows: [
    { from: { q: 72, p: 48 }, to: { q: 31, p: 68 }, tone: 'red' },
    { from: { q: 31, p: 60 }, to: { q: 72, p: 44 } },
    { from: { q: 72, p: 36 }, to: { q: 31, p: 20 }, tone: 'red' },
    { from: { q: 31, p: 12 }, to: { q: 72, p: 32 } },
  ],
  texts: [
    { at: { q: 52, p: 66 }, text: 'rent, interest,', tone: 'red', anchor: 'start' },
    { at: { q: 52, p: 61 }, text: 'profit', tone: 'red', anchor: 'start' },
    { at: { q: 40, p: 49 }, text: 'land, capital', anchor: 'middle' },
    { at: { q: 56, p: 36 }, text: 'wages', tone: 'red', anchor: 'start' },
    { at: { q: 52, p: 13 }, text: 'labour', anchor: 'start' },
    { at: { q: 4, p: 46 }, text: 'big gap:', tone: 'red', anchor: 'start' },
    { at: { q: 4, p: 41 }, text: 'unequal', tone: 'red', anchor: 'start' },
    { at: { q: 4, p: 36 }, text: 'incomes', tone: 'red', anchor: 'start' },
  ],
};

function LearnDiagram() {
  return <SpecDiagram spec={LEARN_SPEC} />;
}

export { Try, LearnDiagram };
