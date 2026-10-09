/**
 * Mind Tricks Lab (2.4, HL only): critique of the maximizing behaviour of consumers and producers.
 *
 * Level 1: the student takes part in five short experiments. Then a curtain opens on the lab screen,
 *          which shows the trick. The student names the bias that was at work.
 * Level 2: spot the bias or limit to rational choice in everyday scenarios.
 * Level 3: choose choice architecture or a nudge for four policy goals and say why it works,
 *          then match firms to their business objectives.
 * Nothing the student chooses in an experiment is stored or sent. There are no timers.
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
import { shuffled } from '../island-economy/model';
import {
  ALL_EFFECTS, anchorFor, anchorGap, DESIGN_GOAL, designMax, designWon, Effect, EXPERIMENT_EFFECTS, HUNT_GOAL, huntWon, isHighAnchor,
  Objective, OBJECTIVES, SUBJECT_GOAL, subjectWon, Tool, TOOLS,
} from './model';
import './mind.css';

const STAMP_NAMES = ['Test Subject', 'Bias Hunter', 'Nudge Designer'];

interface Opt { text: string; correct?: boolean; feedback: string }
interface Experiment {
  id: string;
  kind: 'anchor' | 'pick' | 'headlines';
  effect: Effect;
  icon: string;
  title: string;
  setup: string;
  question: string;
  item?: string;
  headlines?: string[];
  options?: { text: string; reaction: string }[];
  trick: string;
  nameHint: string;
  why: string;
}
interface HuntScenario { id: string; icon: string; text: string; effect: Effect; hint: string; why: string }
interface DesignGoal {
  id: string;
  icon: string;
  title: string;
  brief: string;
  tool: Tool;
  toolWrong: Partial<Record<Tool, string>>;
  prototype: string[];
  reasons: Opt[];
}
interface Firm { id: string; icon: string; name: string; text: string; objective: Objective; why: string }

interface TryContent {
  levels: LevelInfo[];
  effectNames: Record<Effect, string>;
  effectIcons: Record<Effect, string>;
  effectMeaning: Record<Effect, string>;
  experiments: Experiment[];
  huntScenarios: HuntScenario[];
  toolNames: Record<Tool, string>;
  toolIcons: Record<Tool, string>;
  toolMeaning: Record<Tool, string>;
  designGoals: DesignGoal[];
  objectiveNames: Record<Objective, string>;
  objectiveMeaning: Record<Objective, string>;
  firms: Firm[];
}

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
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="brain" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <Subject key={round} seed={round} {...props} />}
      {levelNo === 2 && <Hunt key={round} seed={round} {...props} />}
      {levelNo === 3 && <Designer key={round} seed={round} {...props} />}
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

function Finish(props: { won: boolean; title: [string, string]; line: string; need: string; again: () => void }) {
  return (
    <div class={`callout ${props.won ? 'callout-ok' : 'callout-try'} stack`} role="status">
      <p style={{ margin: 0 }}>
        <strong>{props.won ? props.title[0] : props.title[1]}</strong> {props.line}
      </p>
      {!props.won && <p style={{ margin: 0 }}>{props.need}</p>}
      <div><button class="btn" onClick={props.again}>Play again</button></div>
    </div>
  );
}

// ---------------- Level 1: be the test subject ----------------

/** The curtain opens on the lab screen. With reduced motion the curtain is simply open. */
function Reveal(props: { children: ComponentChildren }) {
  return (
    <div class="ml-stage">
      <div class="ml-screen">
        <p class="ml-screen-head" aria-hidden="true"><span class="ml-dot" /> LAB SCREEN: THE TRICK</p>
        {props.children}
      </div>
      <div class="ml-curtain ml-curtain-l" aria-hidden="true" />
      <div class="ml-curtain ml-curtain-r" aria-hidden="true" />
    </div>
  );
}

/** A 0 to 100 scale with the lucky number and the student's price. Both have text, not only colour. */
function AnchorScale(props: { anchor: number; estimate: number }) {
  const gap = anchorGap(props.anchor, props.estimate);
  const line = gap === 'near'
    ? 'Your price landed close to your lucky number.'
    : `Your price was ${gap} your lucky number.`;
  return (
    <div class="ml-scale-wrap">
      <div class="ml-scale" role="img" aria-label={`Scale from 0 to 100. Lucky number ${props.anchor}. Your price $${props.estimate}. ${line}`}>
        <span class="ml-mark ml-mark-anchor" style={{ left: `${props.anchor}%` }}><span class="ml-mark-label">⚓ {props.anchor}</span></span>
        <span class="ml-mark ml-mark-est" style={{ left: `${props.estimate}%` }}><span class="ml-mark-label">${props.estimate}</span></span>
      </div>
      <div class="ml-scale-ends" aria-hidden="true"><span>0</span><span>100</span></div>
      <p class="small" style={{ margin: 0 }}>{line} Lucky number: <strong>{props.anchor}</strong> ({isHighAnchor(props.anchor) ? 'a high anchor' : 'a low anchor'}). Your price: <strong>${props.estimate}</strong>.</p>
    </div>
  );
}

function Wheel(props: { spun: boolean; value: number | null }) {
  return (
    <div class="ml-wheel-wrap" aria-hidden="true">
      <div class="ml-pointer" />
      <div class={`ml-wheel ${props.spun ? 'ml-wheel-spin' : ''}`} />
      <div class="ml-hub">{props.value !== null ? <span class="ml-hub-num">{props.value}</span> : '?'}</div>
    </div>
  );
}

function Subject({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const items = useMemo(() => shuffled(data.experiments, seed + 3), [data.experiments, seed]);
  const anchor = useMemo(() => anchorFor(seed), [seed]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'run' | 'name'>('run');
  const [spun, setSpun] = useState(false);
  const [estimate, setEstimate] = useState(50);
  const [reaction, setReaction] = useState('');
  const [wrong, setWrong] = useState<Effect | null>(null);
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [firstRight, setFirstRight] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const x = items[idx];
  const goal = Math.min(SUBJECT_GOAL, items.length);

  const finishRun = (text: string) => {
    setReaction(text);
    setPhase('name');
    setAnnounce(`The curtain opens. ${text} ${x.trick}`);
  };

  const spin = () => {
    setSpun(true);
    setAnnounce(`The wheel stops on ${anchor}.`);
  };

  const name = (e: Effect) => {
    if (solved) return;
    if (e === x.effect) {
      setSolved(true);
      setWrong(null);
      if (!missed) setFirstRight((n) => n + 1);
      setAnnounce(`Right: ${data.effectNames[e]}.`);
    } else {
      setMissed(true);
      setWrong(e);
      setAnnounce(`Not ${data.effectNames[e]}. ${x.nameHint}`);
    }
  };

  const next = () => {
    setSolved(false);
    setMissed(false);
    setWrong(null);
    setPhase('run');
    setReaction('');
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setAnnounce('A new experiment begins.');
    } else {
      setDone(true);
      onComplete();
      if (subjectWon(firstRight, goal)) win(onGoal, 1);
    }
  };

  if (done) {
    return (
      <Finish
        won={subjectWon(firstRight, goal)}
        title={['Experiments complete!', 'Experiments finished.']}
        line={`Named right first time: ${firstRight} of ${items.length}.`}
        need={`The ${STAMP_NAMES[0]} stamp needs ${goal} right first time. Play again: the experiments come in a new order.`}
        again={again}
      />
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1 (HL). Experiment {idx + 1} of {items.length}. Right first time: {firstRight} (goal {goal}).
      </p>
      <section class="panel stack ml-lab" aria-labelledby="ml-run-h">
        <h3 id="ml-run-h"><StepNo n={2} /> Take part: {x.title}</h3>
        <div key={x.id} class="ml-bench ml-in">
          <span class="ml-bench-icon" aria-hidden="true">{x.icon}</span>
          <p style={{ margin: 0 }}>{x.setup}</p>
        </div>

        {x.kind === 'anchor' && (
          <div class="stack">
            <div class="ml-wheel-row">
              <Wheel spun={spun} value={spun ? anchor : null} />
              <div class="stack" style={{ gap: 6 }}>
                {!spun && <div><button class="btn" onClick={spin}>Spin the wheel</button></div>}
                {spun && <p style={{ margin: 0 }} class="ml-pop">Your lucky number is <strong>{anchor}</strong>.</p>}
              </div>
            </div>
            {spun && (
              <div class="stack ml-in">
                <p style={{ margin: 0 }}><strong>{x.question}</strong></p>
                <p class="ml-item" style={{ margin: 0 }}>{x.item}</p>
                <label class="ml-slider">
                  <span>Your price: <strong>${estimate}</strong></span>
                  <input
                    type="range" min={0} max={100} step={1} value={estimate} disabled={phase !== 'run'}
                    onInput={(e) => setEstimate(Number((e.target as HTMLInputElement).value))}
                  />
                </label>
                {phase === 'run' && (
                  <div><button class="btn" onClick={() => finishRun(`Your lucky number was ${anchor}, and you would pay $${estimate}.`)}>Lock in my price</button></div>
                )}
              </div>
            )}
          </div>
        )}

        {x.kind === 'headlines' && (
          <div class="ml-paper" aria-label="Today's news">
            {x.headlines!.map((h, i) => (
              <p key={h} class={`ml-headline ml-headline-${i}`}>{h}</p>
            ))}
          </div>
        )}

        {x.kind !== 'anchor' && (
          <div class="stack">
            <p style={{ margin: 0 }}><strong>{x.question}</strong></p>
            <div class="choice-grid" role="group" aria-label="Your choice">
              {x.options!.map((o) => (
                <button
                  key={o.text}
                  type="button"
                  class={`choice-btn ml-pick ${reaction === o.reaction ? 'chosen' : ''}`}
                  disabled={phase !== 'run'}
                  onClick={() => { finishRun(o.reaction); }}
                >
                  {o.text}
                </button>
              ))}
            </div>
            {phase === 'run' && <p class="small muted" style={{ margin: 0 }}>There is no wrong answer here. Choose what you would do.</p>}
          </div>
        )}
      </section>

      {phase === 'name' && (
        <section class="panel stack" aria-labelledby="ml-reveal-h">
          <h3 id="ml-reveal-h"><StepNo n={3} /> The reveal</h3>
          <Reveal>
            <p style={{ margin: 0 }} class="ml-you">{reaction}</p>
            {x.kind === 'anchor' && <AnchorScale anchor={anchor} estimate={estimate} />}
            <p style={{ margin: 0 }}>{x.trick}</p>
          </Reveal>
        </section>
      )}

      {phase === 'name' && (
        <section class="panel stack" aria-labelledby="ml-name-h">
          <h3 id="ml-name-h"><StepNo n={4} /> Name what was at work</h3>
          <div class="ml-effects" role="group" aria-label="Biases and limits">
            {EXPERIMENT_EFFECTS.map((e) => (
              <button
                key={e}
                type="button"
                class={`ml-effect ${wrong === e ? 'shake ml-effect-miss' : ''} ${solved && x.effect === e ? 'ml-effect-right' : ''}`}
                disabled={solved}
                onClick={() => name(e)}
              >
                <span class="ml-effect-icon" aria-hidden="true">{data.effectIcons[e]}</span>
                <strong>{data.effectNames[e]}</strong>
                <span class="small">{data.effectMeaning[e]}</span>
                {teacher && !solved && x.effect === e && <Answer />}
              </button>
            ))}
          </div>
          {wrong && !solved && (
            <Fb ok={false}>Not {data.effectNames[wrong].toLowerCase()}. {data.effectNames[wrong]} means: {data.effectMeaning[wrong].toLowerCase()} That is not the trick here. {x.nameHint}</Fb>
          )}
          {solved && (
            <div class="stack">
              <Fb ok><Md text={x.why} inline /></Fb>
              <div><button class="btn" onClick={next}>{idx + 1 < items.length ? 'Next experiment' : 'Finish'}</button></div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ---------------- Level 2: bias hunter ----------------

function Hunt({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const items = useMemo(() => shuffled(data.huntScenarios, seed + 11), [data.huntScenarios, seed]);
  const [idx, setIdx] = useState(0);
  const [wrong, setWrong] = useState<Effect | null>(null);
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [firstRight, setFirstRight] = useState(0);
  const [caught, setCaught] = useState<Effect[]>([]);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const s = items[idx];
  const goal = Math.min(HUNT_GOAL, items.length);

  const tap = (e: Effect) => {
    if (solved) return;
    if (e === s.effect) {
      setSolved(true);
      setWrong(null);
      if (!missed) setFirstRight((n) => n + 1);
      setCaught([...caught, e]);
      setAnnounce(`Caught it: ${data.effectNames[e]}. ${s.why}`);
    } else {
      setMissed(true);
      setWrong(e);
      setAnnounce(`Not ${data.effectNames[e]}. ${s.hint}`);
    }
  };

  const next = () => {
    setSolved(false);
    setMissed(false);
    setWrong(null);
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setAnnounce('A new scenario.');
    } else {
      setDone(true);
      onComplete();
      if (huntWon(firstRight, goal)) win(onGoal, 2);
    }
  };

  if (done) {
    return (
      <Finish
        won={huntWon(firstRight, goal)}
        title={['Every bias caught!', 'Hunt finished.']}
        line={`Right first time: ${firstRight} of ${items.length}.`}
        need={`The ${STAMP_NAMES[1]} stamp needs ${goal} right first time. Play again: the scenarios come in a new order.`}
        again={again}
      />
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2 (HL). Scenario {idx + 1} of {items.length}. Right first time: {firstRight} (goal {goal}).
      </p>
      <section class="panel stack" aria-labelledby="ml-hunt-h">
        <h3 id="ml-hunt-h"><StepNo n={2} /> Read the scenario</h3>
        <div key={s.id} class="ml-specimen ml-in">
          <span class="ml-lens" aria-hidden="true">🔍</span>
          <span class="ml-bench-icon" aria-hidden="true">{s.icon}</span>
          <p style={{ margin: 0 }}>{s.text}</p>
          {solved && <span class="ml-caught">{data.effectNames[s.effect]}</span>}
        </div>
        <div class="ml-jars" aria-label="Caught so far">
          {caught.length === 0 && <span class="small muted">Caught so far: none yet.</span>}
          {caught.map((e, i) => (
            <span key={`${e}-${i}`} class="ml-jar ml-pop"><span aria-hidden="true">{data.effectIcons[e]}</span> {data.effectNames[e]}</span>
          ))}
        </div>
      </section>
      <section class="panel stack" aria-labelledby="ml-spot-h">
        <h3 id="ml-spot-h"><StepNo n={3} /> Spot the bias or limit</h3>
        <div class="ml-effects ml-effects-8" role="group" aria-label="Biases and limits">
          {ALL_EFFECTS.map((e) => (
            <button
              key={e}
              type="button"
              class={`ml-effect ${wrong === e ? 'shake ml-effect-miss' : ''} ${solved && s.effect === e ? 'ml-effect-right' : ''}`}
              disabled={solved}
              onClick={() => tap(e)}
            >
              <span class="ml-effect-icon" aria-hidden="true">{data.effectIcons[e]}</span>
              <strong>{data.effectNames[e]}</strong>
              {teacher && !solved && s.effect === e && <Answer />}
            </button>
          ))}
        </div>
        {wrong && !solved && (
          <Fb ok={false}>
            Not {data.effectNames[wrong].toLowerCase()}. {data.effectNames[wrong]} means: {data.effectMeaning[wrong].toLowerCase()} {s.hint}
          </Fb>
        )}
        {solved && (
          <div class="stack">
            <Fb ok><strong>{data.effectNames[s.effect]}.</strong> {s.why}</Fb>
            <div><button class="btn" onClick={next}>{idx + 1 < items.length ? 'Next scenario' : 'Finish'}</button></div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------- Level 3: nudge designer ----------------

function Meter(props: { points: number; max: number }) {
  const pct = Math.round((props.points / props.max) * 100);
  return (
    <div class="ml-meter-wrap">
      <div class="ml-meter" aria-hidden="true">
        <div class="ml-meter-fill" style={{ width: `${pct}%` }} />
        <div class="ml-meter-goal" style={{ left: `${Math.round((DESIGN_GOAL / props.max) * 100)}%` }} />
      </div>
      <p class="small" style={{ margin: 0 }}>
        <span aria-hidden="true">🧠 </span><strong>{props.points}</strong> of {props.max} first-try points. Goal: {DESIGN_GOAL}.
      </p>
    </div>
  );
}

function Designer({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const goals = useMemo(() => shuffled(data.designGoals, seed + 17), [data.designGoals, seed]);
  const firms = useMemo(() => shuffled(data.firms, seed + 23), [data.firms, seed]);
  const max = designMax(goals.length, firms.length);
  const [phase, setPhase] = useState<'goals' | 'firms' | 'done'>('goals');
  const [points, setPoints] = useState(0);
  const [announce, setAnnounce] = useState('');
  // Goals
  const [gi, setGi] = useState(0);
  const [toolWrong, setToolWrong] = useState<Tool | null>(null);
  const [toolMissed, setToolMissed] = useState(false);
  const [toolOk, setToolOk] = useState(false);
  const [reasonPick, setReasonPick] = useState<number | null>(null);
  const [reasonMissed, setReasonMissed] = useState(false);
  // Firms
  const [fi, setFi] = useState(0);
  const [objWrong, setObjWrong] = useState<Objective | null>(null);
  const [objMissed, setObjMissed] = useState(false);
  const [objOk, setObjOk] = useState(false);

  const g = goals[gi];
  const f = firms[fi];
  const reasonOk = reasonPick !== null && !!g.reasons[reasonPick].correct;

  const pickTool = (t: Tool) => {
    if (toolOk) return;
    if (t === g.tool) {
      setToolOk(true);
      setToolWrong(null);
      if (!toolMissed) setPoints((p) => p + 1);
      setAnnounce(`Right: ${data.toolNames[t]}. Your design is built: ${g.prototype.join('. ')}. Now say why it works.`);
    } else {
      setToolMissed(true);
      setToolWrong(t);
      setAnnounce(`Not ${data.toolNames[t]}. ${g.toolWrong[t] ?? ''}`);
    }
  };

  const pickReason = (i: number) => {
    if (reasonOk) return;
    setReasonPick(i);
    const ok = !!g.reasons[i].correct;
    if (ok && !reasonMissed) setPoints((p) => p + 1);
    if (!ok) setReasonMissed(true);
    setAnnounce(g.reasons[i].feedback);
  };

  const nextGoal = () => {
    setToolWrong(null);
    setToolMissed(false);
    setToolOk(false);
    setReasonPick(null);
    setReasonMissed(false);
    if (gi + 1 < goals.length) setGi(gi + 1);
    else {
      setPhase('firms');
      setAnnounce('Nudges done. Now match each firm to its business objective.');
    }
  };

  const pickObjective = (o: Objective) => {
    if (objOk) return;
    if (o === f.objective) {
      setObjOk(true);
      setObjWrong(null);
      if (!objMissed) setPoints((p) => p + 1);
      setAnnounce(`Right: ${data.objectiveNames[o]}. ${f.why}`);
    } else {
      setObjMissed(true);
      setObjWrong(o);
      setAnnounce(`Not ${data.objectiveNames[o]}. ${data.objectiveMeaning[o]}`);
    }
  };

  const nextFirm = () => {
    setObjWrong(null);
    setObjMissed(false);
    setObjOk(false);
    if (fi + 1 < firms.length) setFi(fi + 1);
    else {
      setPhase('done');
      onComplete();
      if (designWon(points)) win(onGoal, 3);
    }
  };

  const won = designWon(points);

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3 (HL). {phase === 'goals' ? `Goal ${gi + 1} of ${goals.length}.` : phase === 'firms' ? `Firm ${fi + 1} of ${firms.length}.` : 'Finished.'} Score a point for each tool, reason and objective right first time.
      </p>
      <div class="ml-lab-top">
        <Meter points={points} max={max} />
        <ol class="ml-stations" aria-label="Lab stations">
          <li class={phase === 'goals' ? 'on' : 'done'}>Nudge design</li>
          <li class={phase === 'firms' ? 'on' : phase === 'done' ? 'done' : ''}>Firm objectives</li>
        </ol>
      </div>

      {phase === 'goals' && (
        <>
          <section class="panel stack" aria-labelledby="ml-goal-h">
            <h3 id="ml-goal-h"><StepNo n={2} /> Read the policy goal: {g.title}</h3>
            <div key={g.id} class="ml-bench ml-in">
              <span class="ml-bench-icon" aria-hidden="true">{g.icon}</span>
              <p style={{ margin: 0 }}>{g.brief}</p>
            </div>
          </section>
          <section class="panel stack" aria-labelledby="ml-tool-h">
            <h3 id="ml-tool-h"><StepNo n={3} /> Choose the design</h3>
            <div class="ml-effects ml-effects-4" role="group" aria-label="Choice architecture and nudges">
              {TOOLS.map((t) => (
                <button
                  key={t}
                  type="button"
                  class={`ml-effect ${toolWrong === t ? 'shake ml-effect-miss' : ''} ${toolOk && g.tool === t ? 'ml-effect-right' : ''}`}
                  disabled={toolOk}
                  onClick={() => pickTool(t)}
                >
                  <span class="ml-effect-icon" aria-hidden="true">{data.toolIcons[t]}</span>
                  <strong>{data.toolNames[t]}</strong>
                  <span class="small">{data.toolMeaning[t]}</span>
                  {teacher && !toolOk && g.tool === t && <Answer />}
                </button>
              ))}
            </div>
            {toolWrong && !toolOk && <Fb ok={false}>Not {data.toolNames[toolWrong].toLowerCase()}. {g.toolWrong[toolWrong]}</Fb>}
            {toolOk && (
              <div class="ml-proto" aria-label="Your design">
                <p class="ml-proto-head"><span aria-hidden="true">🛠️</span> Prototype: {data.toolNames[g.tool]}</p>
                {g.prototype.map((line, i) => (
                  <p key={line} class={`ml-proto-line ml-proto-line-${i}`}>{line}</p>
                ))}
              </div>
            )}
          </section>
          {toolOk && (
            <section class="panel stack" aria-labelledby="ml-why-h">
              <h3 id="ml-why-h"><StepNo n={4} /> Say why it works</h3>
              <div class="ml-reasons" role="group" aria-label="Reasons">
                {g.reasons.map((o, i) => (
                  <button
                    key={`${g.id}-${i}`}
                    type="button"
                    class={`choice-btn ${reasonPick === i && !o.correct ? 'shake chosen' : ''} ${reasonOk && o.correct ? 'choice-right' : ''}`}
                    disabled={reasonOk}
                    onClick={() => pickReason(i)}
                  >
                    {o.text}
                    {teacher && o.correct && !reasonOk && <Answer />}
                  </button>
                ))}
              </div>
              {reasonPick !== null && <Fb ok={reasonOk}>{g.reasons[reasonPick].feedback}</Fb>}
              {reasonOk && (
                <div><button class="btn" onClick={nextGoal}>{gi + 1 < goals.length ? 'Next goal' : 'Go to firm objectives'}</button></div>
              )}
            </section>
          )}
        </>
      )}

      {phase === 'firms' && (
        <>
          <section class="panel stack" aria-labelledby="ml-firm-h">
            <h3 id="ml-firm-h"><StepNo n={2} /> Read about the firm: {f.name}</h3>
            <div key={f.id} class="ml-bench ml-in">
              <span class="ml-bench-icon" aria-hidden="true">{f.icon}</span>
              <p style={{ margin: 0 }}>{f.text}</p>
              {objOk && <span class="ml-caught">{data.objectiveNames[f.objective]}</span>}
            </div>
          </section>
          <section class="panel stack" aria-labelledby="ml-obj-h">
            <h3 id="ml-obj-h"><StepNo n={3} /> What is the firm aiming for?</h3>
            <div class="choice-grid" role="group" aria-label="Business objectives">
              {OBJECTIVES.map((o) => (
                <button
                  key={o}
                  type="button"
                  class={`choice-btn ${objWrong === o ? 'shake chosen' : ''} ${objOk && f.objective === o ? 'choice-right' : ''}`}
                  disabled={objOk}
                  onClick={() => pickObjective(o)}
                >
                  {data.objectiveNames[o]}
                  {teacher && !objOk && f.objective === o && <Answer />}
                </button>
              ))}
            </div>
            {objWrong && !objOk && (
              <Fb ok={false}>Not {data.objectiveNames[objWrong].toLowerCase()}. {data.objectiveNames[objWrong]} means: {data.objectiveMeaning[objWrong].toLowerCase()} Read the firm's aim again.</Fb>
            )}
            {objOk && (
              <div class="stack">
                <Fb ok><strong>{data.objectiveNames[f.objective]}.</strong> {f.why}</Fb>
                <div><button class="btn" onClick={nextFirm}>{fi + 1 < firms.length ? 'Next firm' : 'Finish'}</button></div>
              </div>
            )}
          </section>
        </>
      )}

      {phase === 'done' && (
        <Finish
          won={won}
          title={['Lab report approved!', 'Lab finished.']}
          line={`First-try points: ${points} of ${max}.`}
          need={`The ${STAMP_NAMES[2]} stamp needs ${DESIGN_GOAL} points. Play again: the goals and firms come in a new order.`}
          again={again}
        />
      )}
    </div>
  );
}

// ---------------- Learn it ----------------

const LEARN_SPEC: DiagramSpec = {
  xMax: 100,
  yMax: 62,
  xLabel: '',
  yLabel: '',
  noAxes: true,
  title: 'Rational choice assumptions and the limits found by behavioural economics',
  description: 'Left column, what rational consumer choice assumes: consumer rationality, utility maximization and perfect information. Arrows point right to the limits. Consumer rationality is limited by biases and bounded rationality. Utility maximization is limited by bounded self-control and bounded selfishness. Perfect information is limited by imperfect information.',
  boxes: [
    { at: { q: 18, p: 44.5 }, w: 34, h: 19, text: 'Rationality' },
    { at: { q: 18, p: 22.5 }, w: 34, h: 19, text: 'Max utility' },
    { at: { q: 18, p: 5 }, w: 34, h: 8, text: 'Perfect info' },
    { at: { q: 72, p: 50 }, w: 54, h: 8, text: 'Biases' },
    { at: { q: 72, p: 39 }, w: 54, h: 8, text: 'Bounded rationality' },
    { at: { q: 72, p: 28 }, w: 54, h: 8, text: 'Bounded self-control' },
    { at: { q: 72, p: 17 }, w: 54, h: 8, text: 'Bounded selfishness' },
    { at: { q: 72, p: 5 }, w: 54, h: 8, text: 'Imperfect info' },
  ],
  arrows: [
    { from: { q: 35.5, p: 47 }, to: { q: 44.5, p: 50 } },
    { from: { q: 35.5, p: 42 }, to: { q: 44.5, p: 39 } },
    { from: { q: 35.5, p: 25 }, to: { q: 44.5, p: 28 } },
    { from: { q: 35.5, p: 20 }, to: { q: 44.5, p: 17 } },
    { from: { q: 35.5, p: 5 }, to: { q: 44.5, p: 5 } },
  ],
  texts: [
    { at: { q: 18, p: 59 }, text: 'Rational choice assumes', anchor: 'middle' },
    { at: { q: 72, p: 59 }, text: 'Behavioural limits', anchor: 'middle' },
  ],
};

function LearnDiagram() {
  return <SpecDiagram spec={LEARN_SPEC} />;
}

export { Try, LearnDiagram };
