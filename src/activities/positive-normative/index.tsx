/**
 * Fact Lab (1.2): positive and normative economics, the economic method and the history of ideas.
 *
 * Level 1: statements roll in on a conveyor belt; stamp each one positive or normative. Some are traps.
 * Level 2: hunt for the value word that makes a statement normative, or say there is none.
 * Level 3: order the steps of the method, rewrite opinions as testable claims, and build the timeline of ideas.
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
  BELT_GOAL, beltWon, Century, CENTURIES, isValueWord, Kind, KINDS, LAB_GOAL, labMax, labWon, nextMethodStep, tokenize, VALUE_GOAL, valueWon,
} from './model';
import './lab.css';

const STAMP_NAMES = ['Fact Finder', 'Value Spotter', 'Lab Scientist'];

interface Statement { id: string; text: string; kind: Kind; trap: boolean; why: string }
interface ValueRound { id: string; text: string; values: string[]; why: string }
interface Rewrite { id: string; claim: string; options: { text: string; correct?: boolean; feedback: string }[] }
interface Idea { id: string; icon: string; text: string; century: Century }

interface TryContent {
  levels: LevelInfo[];
  kindNames: Record<Kind, string>;
  kindHints: Record<Kind, string>;
  statements: Statement[];
  valueRounds: ValueRound[];
  methodSteps: { id: string; icon: string; text: string }[];
  methodWrong: string;
  rewrites: Rewrite[];
  ideas: Idea[];
  centuryNames: Record<Century, string>;
  ideaWrong: string;
}

const KIND_ICON: Record<Kind, string> = { positive: '🔬', normative: '💭' };

/** A nudge when a statement gets the wrong stamp: what to look for. */
const WRONG_HINT: Record<Kind, string> = {
  positive: 'Look again for a value word, such as should, fair, best or too. A statement with a value judgement is normative.',
  normative: 'Is there a value word? If we could check it with evidence, it is positive, even if it sounds wrong.',
};

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
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="flask" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <Belt key={round} seed={round} {...props} />}
      {levelNo === 2 && <ValueHunt key={round} seed={round} {...props} />}
      {levelNo === 3 && <Lab key={round} seed={round} {...props} />}
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

// ---------------- Level 1: the sorting belt ----------------

function Belt({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const items = useMemo(() => shuffled(data.statements, seed + 5), [data.statements, seed]);
  const [idx, setIdx] = useState(0);
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<Kind | null>(null);
  const [firstRight, setFirstRight] = useState(0);
  const [bins, setBins] = useState<Record<Kind, number>>({ positive: 0, normative: 0 });
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const s = items[idx];
  const goal = Math.min(BELT_GOAL, items.length);

  const stamp = (k: Kind) => {
    if (solved) return;
    if (k === s.kind) {
      setSolved(true);
      setWrong(null);
      if (!missed) setFirstRight((n) => n + 1);
      setBins({ ...bins, [k]: bins[k] + 1 });
      setAnnounce(`Right: ${data.kindNames[k]}.${s.trap ? ' That one was a trap.' : ''}`);
    } else {
      setMissed(true);
      setWrong(k);
      setAnnounce(`Not ${data.kindNames[k]}. ${WRONG_HINT[k]}`);
    }
  };

  const next = () => {
    setSolved(false);
    setMissed(false);
    setWrong(null);
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setAnnounce('A new statement rolls in.');
    } else {
      setDone(true);
      onComplete();
      if (beltWon(firstRight, goal)) win(onGoal, 1);
    }
  };

  if (done) {
    const won = beltWon(firstRight, goal);
    return (
      <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
        <p style={{ margin: 0 }}>
          <strong>{won ? 'The belt is clear!' : 'Belt finished.'}</strong> Stamped right first time: {firstRight} of {items.length}.
        </p>
        {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[0]} stamp needs {goal} right first time. Play again: the statements come in a new order.</p>}
        <div><button class="btn" onClick={again}>Play again</button></div>
      </div>
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1. Statement {idx + 1} of {items.length}. Right first time: {firstRight} (goal {goal}).
      </p>
      <section class="panel stack" aria-labelledby="fl-belt-h">
        <h3 id="fl-belt-h"><StepNo n={2} /> Read the statement on the belt</h3>
        <div class="fl-line">
          <div class={`fl-belt ${solved ? '' : 'fl-belt-run'}`} aria-hidden="true" />
          <div key={s.id} class={`fl-capsule ${solved ? 'fl-out' : 'fl-in'}`}>
            <p class="fl-capsule-text">{s.text}</p>
            {solved && <span class={`fl-stamp fl-stamp-${s.kind}`}>{data.kindNames[s.kind]}</span>}
          </div>
        </div>
        <div class="fl-bins" aria-label="Sorted so far">
          {KINDS.map((k) => (
            <div key={k} class="fl-bin">
              <span aria-hidden="true">{KIND_ICON[k]}</span> {data.kindNames[k]}: <strong>{bins[k]}</strong>
            </div>
          ))}
        </div>
      </section>
      <section class="panel stack" aria-labelledby="fl-stamp-h">
        <h3 id="fl-stamp-h"><StepNo n={3} /> Stamp it</h3>
        <div class="fl-stampers" role="group" aria-label="Stamps">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              class={`fl-stamper ${wrong === k ? 'shake' : ''} ${solved && s.kind === k ? 'fl-stamper-right' : ''}`}
              disabled={solved}
              onClick={() => stamp(k)}
            >
              <span class="fl-stamper-icon" aria-hidden="true">{KIND_ICON[k]}</span>
              <strong>{data.kindNames[k]}</strong>
              <span class="small">{data.kindHints[k]}</span>
              {teacher && s.kind === k && !solved && <span class="badge badge-done">Answer</span>}
            </button>
          ))}
        </div>
        {wrong && !solved && <Fb ok={false}>Not {data.kindNames[wrong].toLowerCase()}. {WRONG_HINT[wrong]}</Fb>}
        {solved && (
          <div class="callout callout-ok stack" role="status">
            <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
              <MarkIcon /> <span><strong>{data.kindNames[s.kind]}.</strong> <Md text={s.why} inline /></span>
            </p>
            <div><button class="btn" onClick={next}>{idx + 1 < items.length ? 'Next statement' : 'Finish'}</button></div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------- Level 2: value word hunt ----------------

const NONE = -1;

function ValueHunt({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const rounds = useMemo(() => shuffled(data.valueRounds, seed + 11), [data.valueRounds, seed]);
  const [ri, setRi] = useState(0);
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);
  const [firstRight, setFirstRight] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const r = rounds[ri];
  const words = tokenize(r.text);
  const positive = r.values.length === 0;

  const tap = (i: number) => {
    if (solved) return;
    const ok = i === NONE ? positive : isValueWord(words[i], r.values);
    if (ok) {
      setSolved(true);
      setWrong(null);
      if (!missed) setFirstRight((n) => n + 1);
      setAnnounce(positive ? 'Right: no value word. This statement is positive.' : `Right: ${words[i]} is the value word.`);
    } else {
      setMissed(true);
      setWrong(i);
      setAnnounce('Not quite. Read the hint and look again.');
    }
  };

  const next = () => {
    setSolved(false);
    setMissed(false);
    setWrong(null);
    if (ri + 1 < rounds.length) setRi(ri + 1);
    else {
      setDone(true);
      onComplete();
      if (valueWon(firstRight)) win(onGoal, 2);
    }
  };

  if (done) {
    const won = valueWon(firstRight);
    return (
      <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
        <p style={{ margin: 0 }}>
          <strong>{won ? 'Sharp eyes!' : 'Hunt finished.'}</strong> Right first time: {firstRight} of {rounds.length}.
        </p>
        {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[1]} stamp needs {VALUE_GOAL} right first time. Play again: the statements come in a new order.</p>}
        <div><button class="btn" onClick={again}>Play again</button></div>
      </div>
    );
  }

  const wrongText = wrong === null ? '' : wrong === NONE
    ? 'There is a word here that judges what is good, right or fair. Read it again.'
    : positive
      ? `"${words[wrong]}" is not a judgement. Could we test this whole statement with evidence?`
      : `"${words[wrong]}" does not judge. Look for a word that says what is good, bad, fair or right.`;

  const isAnswer = (i: number) => (i === NONE ? positive : isValueWord(words[i], r.values));

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2. Statement {ri + 1} of {rounds.length}. Right first time: {firstRight} (goal {VALUE_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="fl-hunt-h">
        <h3 id="fl-hunt-h"><StepNo n={2} /> Tap the value word</h3>
        <p class="small muted" style={{ margin: 0 }}>Which word makes this statement a value judgement? If there is none, tap <strong>No value word</strong>.</p>
        <div key={r.id} class="fl-sentence fl-in" role="group" aria-label="Words in the statement">
          <span class="fl-lens" aria-hidden="true">🔍</span>
          {words.map((w, i) => {
            const hit = solved && !positive && isValueWord(w, r.values);
            return (
              <button
                key={`${r.id}-${i}`}
                type="button"
                class={`fl-word ${wrong === i ? 'shake fl-word-miss' : ''} ${hit ? 'fl-word-hit' : ''}`}
                disabled={solved}
                onClick={() => tap(i)}
              >
                {w}
                {hit && <span class="fl-word-tag">value word</span>}
                {teacher && !solved && isAnswer(i) && <span class="badge badge-done">Answer</span>}
              </button>
            );
          })}
        </div>
        <div>
          <button type="button" class={`choice-btn ${wrong === NONE ? 'shake' : ''} ${solved && positive ? 'choice-right' : ''}`} disabled={solved} onClick={() => tap(NONE)}>
            No value word: this is positive
            {teacher && !solved && positive && <span class="badge badge-done">Answer</span>}
          </button>
        </div>
        {wrong !== null && !solved && <Fb ok={false}>{wrongText}</Fb>}
      </section>
      {solved && (
        <section class="panel stack" aria-labelledby="fl-why-h">
          <h3 id="fl-why-h"><StepNo n={3} /> Read why</h3>
          <Fb ok><strong>{positive ? 'Positive.' : 'Normative.'}</strong> <Md text={r.why} inline /></Fb>
          <div><button class="btn" onClick={next}>{ri + 1 < rounds.length ? 'Next statement' : 'Finish'}</button></div>
        </section>
      )}
    </div>
  );
}

// ---------------- Level 3: lab scientist ----------------

type LabPhase = 'method' | 'rewrite' | 'timeline' | 'done';

function Beaker(props: { points: number; max: number }) {
  const pct = Math.round((props.points / props.max) * 100);
  return (
    <div class="fl-beaker-wrap">
      <div class="fl-beaker" aria-hidden="true">
        <div class="fl-liquid" style={{ height: `${pct}%` }}>
          <span class="fl-bubble" /><span class="fl-bubble fl-bubble2" /><span class="fl-bubble fl-bubble3" />
        </div>
        <div class="fl-goal-line" style={{ bottom: `${Math.round((LAB_GOAL / props.max) * 100)}%` }} />
      </div>
      <p class="small" style={{ margin: 0 }}>
        <strong>{props.points}</strong> of {props.max} points. Goal line: {LAB_GOAL}.
      </p>
    </div>
  );
}

function Lab({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const steps = data.methodSteps;
  const stepOrder = useMemo(() => shuffled(steps.map((_, i) => i), seed + 17), [steps, seed]);
  const ideas = useMemo(() => shuffled(data.ideas, seed + 23), [data.ideas, seed]);
  const max = labMax(steps.length, data.rewrites.length, data.ideas.length);
  const [phase, setPhase] = useState<LabPhase>('method');
  const [points, setPoints] = useState(0);
  const [placed, setPlaced] = useState(0);
  const [stepMissed, setStepMissed] = useState(false);
  const [wrongStep, setWrongStep] = useState<number | null>(null);
  const [rw, setRw] = useState(0);
  const [rwPick, setRwPick] = useState<number | null>(null);
  const [rwMissed, setRwMissed] = useState(false);
  const [ii, setIi] = useState(0);
  const [ideaMissed, setIdeaMissed] = useState(false);
  const [wrongCentury, setWrongCentury] = useState<Century | null>(null);
  const [shelf, setShelf] = useState<Record<Century, Idea[]>>({ 18: [], 19: [], 20: [], 21: [] });
  const [announce, setAnnounce] = useState('');

  const score = () => setPoints((p) => p + 1);

  const tapStep = (i: number) => {
    if (phase !== 'method') return;
    const n = nextMethodStep(placed, i);
    if (n < 0) {
      setStepMissed(true);
      setWrongStep(i);
      setAnnounce(data.methodWrong);
      return;
    }
    if (!stepMissed) score();
    setStepMissed(false);
    setWrongStep(null);
    setPlaced(n);
    setAnnounce(`Step ${n}: ${steps[i].text}.`);
  };

  const r = data.rewrites[rw];
  const rwSolved = rwPick !== null && !!r.options[rwPick].correct;
  const pickRewrite = (i: number) => {
    if (rwSolved) return;
    setRwPick(i);
    const ok = !!r.options[i].correct;
    if (ok && !rwMissed) score();
    if (!ok) setRwMissed(true);
    setAnnounce(r.options[i].feedback);
  };
  const nextRewrite = () => {
    setRwPick(null);
    setRwMissed(false);
    if (rw + 1 < data.rewrites.length) setRw(rw + 1);
    else {
      setPhase('timeline');
      setAnnounce('Rewrites done. Now build the timeline.');
    }
  };

  const idea = ideas[ii];
  const placeIdea = (c: Century) => {
    if (phase !== 'timeline') return;
    if (c !== idea.century) {
      setIdeaMissed(true);
      setWrongCentury(c);
      setAnnounce(`Not the ${data.centuryNames[c]}. ${data.ideaWrong}`);
      return;
    }
    const gained = ideaMissed ? 0 : 1;
    if (gained) score();
    setShelf({ ...shelf, [c]: [...shelf[c], idea] });
    setIdeaMissed(false);
    setWrongCentury(null);
    setAnnounce(`${idea.text}: ${data.centuryNames[c]}.`);
    if (ii + 1 < ideas.length) setIi(ii + 1);
    else {
      setPhase('done');
      onComplete();
      if (labWon(points + gained)) win(onGoal, 3);
    }
  };

  const won = labWon(points);

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3. Score a point for each step, rewrite and idea you get right first time.
      </p>
      <div class="fl-lab-top">
        <Beaker points={points} max={max} />
        <ol class="fl-stations" aria-label="Lab stations">
          <li class={phase === 'method' ? 'on' : 'done'}>Method</li>
          <li class={phase === 'rewrite' ? 'on' : phase === 'method' ? '' : 'done'}>Rewrites</li>
          <li class={phase === 'timeline' ? 'on' : phase === 'done' ? 'done' : ''}>Timeline</li>
        </ol>
      </div>

      <section class="panel stack" aria-labelledby="fl-method-h">
        <h3 id="fl-method-h"><StepNo n={2} /> Station 1: put the method in order</h3>
        <p class="small muted" style={{ margin: 0 }}>How does positive economics test an idea? Tap the steps in order, starting with the first.</p>
        <ol class="fl-method-done">
          {steps.slice(0, placed).map((st) => (
            <li key={st.id} class="fl-slide"><span aria-hidden="true">{st.icon}</span> {st.text}</li>
          ))}
        </ol>
        {phase === 'method' && (
          <div class="choice-grid" role="group" aria-label="Steps to place">
            {stepOrder.filter((i) => i >= placed).map((i) => (
              <button key={steps[i].id} type="button" class={`choice-btn ${wrongStep === i ? 'shake' : ''}`} onClick={() => tapStep(i)}>
                <span aria-hidden="true">{steps[i].icon}</span> {steps[i].text}
                {teacher && i === placed && <span class="badge badge-done">Answer</span>}
              </button>
            ))}
          </div>
        )}
        {phase === 'method' && wrongStep !== null && <Fb ok={false}>{data.methodWrong}</Fb>}
        {phase === 'method' && placed === steps.length && (
          <div class="stack">
            <Fb ok>The method is complete. If the evidence refutes the theory, economists go back and try a new hypothesis.</Fb>
            <div><button class="btn" onClick={() => { setPhase('rewrite'); }}>Go to station 2</button></div>
          </div>
        )}
      </section>

      {phase === 'rewrite' && (
        <section class="panel stack" aria-labelledby="fl-rw-h">
          <h3 id="fl-rw-h"><StepNo n={3} /> Station 2: make it testable ({rw + 1} of {data.rewrites.length})</h3>
          <p style={{ margin: 0 }}>This claim is normative: <strong>"{r.claim}"</strong></p>
          <p class="small muted" style={{ margin: 0 }}>Which version could an economist test with evidence?</p>
          <div class="stack" role="group" aria-label="Rewrites">
            {r.options.map((o, i) => (
              <button
                key={`${r.id}-${i}`}
                type="button"
                class={`choice-btn ${rwPick === i && !o.correct ? 'shake chosen' : ''} ${rwSolved && o.correct ? 'choice-right' : ''}`}
                disabled={rwSolved}
                onClick={() => pickRewrite(i)}
              >
                {o.text}
                {teacher && o.correct && !rwSolved && <span class="badge badge-done">Answer</span>}
              </button>
            ))}
          </div>
          {rwPick !== null && <Fb ok={rwSolved}>{r.options[rwPick].feedback}</Fb>}
          {rwSolved && (
            <div><button class="btn" onClick={nextRewrite}>{rw + 1 < data.rewrites.length ? 'Next claim' : 'Go to station 3'}</button></div>
          )}
        </section>
      )}

      {(phase === 'timeline' || phase === 'done') && (
        <section class="panel stack" aria-labelledby="fl-tl-h">
          <h3 id="fl-tl-h"><StepNo n={4} /> Station 3: build the timeline of ideas</h3>
          {phase === 'timeline' && (
            <>
              <div key={idea.id} class="fl-idea fl-in">
                <span class="fl-idea-icon" aria-hidden="true">{idea.icon}</span>
                <p style={{ margin: 0 }}><strong>{idea.text}</strong></p>
              </div>
              <p class="small muted" style={{ margin: 0 }}>Idea {ii + 1} of {ideas.length}. Tap the century it belongs to.</p>
            </>
          )}
          <div class="fl-timeline" role="group" aria-label="Centuries">
            {CENTURIES.map((c) => (
              <div key={c} class="fl-century">
                <button type="button" class={`fl-century-btn ${wrongCentury === c ? 'shake' : ''}`} disabled={phase !== 'timeline'} onClick={() => placeIdea(c)}>
                  {data.centuryNames[c]}
                  {teacher && phase === 'timeline' && idea.century === c && <span class="badge badge-done">Answer</span>}
                </button>
                <ul class="fl-shelf">
                  {shelf[c].map((d) => (
                    <li key={d.id} class="fl-slide"><span aria-hidden="true">{d.icon}</span> {d.text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {phase === 'timeline' && wrongCentury && <Fb ok={false}>Not the {data.centuryNames[wrongCentury]}. {data.ideaWrong}</Fb>}
        </section>
      )}

      {phase === 'done' && (
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'Experiment complete!' : 'Lab finished.'}</strong> First-try points: {points} of {max}.
          </p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[2]} stamp needs {LAB_GOAL} points. Play again: everything comes in a new order.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      )}
    </div>
  );
}

// ---------------- Learn it ----------------

const LEARN_SPEC: DiagramSpec = {
  xMax: 100,
  yMax: 60,
  xLabel: '',
  yLabel: '',
  noAxes: true,
  title: 'The method of positive economics',
  description: 'Observe, then make a hypothesis, then build a model holding other things constant (ceteris paribus), then test it with empirical evidence, then accept or refute it. If refuted, an arrow goes back to a new hypothesis.',
  boxes: [
    { at: { q: 14, p: 48 }, w: 22, h: 11, text: 'Observe' },
    { at: { q: 50, p: 48 }, w: 24, h: 11, text: 'Hypothesis' },
    { at: { q: 85, p: 48 }, w: 22, h: 11, text: 'Model' },
    { at: { q: 80, p: 12 }, w: 32, h: 11, text: 'Test with evidence' },
    { at: { q: 35, p: 12 }, w: 32, h: 11, text: 'Accept or refute' },
  ],
  arrows: [
    { from: { q: 26, p: 48 }, to: { q: 37, p: 48 } },
    { from: { q: 63, p: 48 }, to: { q: 73, p: 48 } },
    { from: { q: 88, p: 42 }, to: { q: 88, p: 18.5 } },
    { from: { q: 63, p: 12 }, to: { q: 52, p: 12 } },
    { from: { q: 40, p: 18.5 }, to: { q: 48, p: 42 } },
  ],
  texts: [
    { at: { q: 86, p: 30 }, text: 'ceteris paribus', anchor: 'end' },
    { at: { q: 30, p: 30 }, text: 'if refuted', anchor: 'end' },
  ],
};

function LearnDiagram() {
  return <SpecDiagram spec={LEARN_SPEC} />;
}

export { Try, LearnDiagram };
