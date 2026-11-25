/**
 * Build, Break, Judge (exam skills): chains of reasoning as bridges across a river.
 *
 * Level 1 (Build it): tap the planks in order, from the event to the answer.
 * Level 2 (Break it): find the cracked plank in a finished bridge, then choose the plank that fixes it.
 * Level 3 (Judge it): the bridge is built. Choose the strongest evaluation point, then the best supported conclusion.
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
import { BREAK_GOAL, breakWon, BUILD_GOAL, buildMax, buildWon, JUDGE_GOAL, judgeWon, nextPlank, plankPoint } from './model';
import './bridge.css';
import { newSeed } from '../../shared/activity/seed';
import { reportAnswer } from '../../shared/activity/levelEvents';

const STAMP_NAMES = ['Bridge Builder', 'Crack Finder', 'Fair Judge'];

interface Option { text: string; correct?: boolean; feedback: string }
interface Build { id: string; event: string; question: string; planks: string[] }
interface Break { id: string; event: string; planks: string[]; crack: number; fixes: Option[]; why: string }
interface Judge { id: string; claim: string; analysis: string; evals: Option[]; conclusions: Option[] }
interface TryContent { levels: LevelInfo[]; builds: Build[]; breaks: Break[]; judges: Judge[] }

function Try({ content, onComplete, onGoal, stamps, teacher }: TryProps) {
  const data = content.try as unknown as TryContent;
  const [levelNo, setLevelNo] = useState(1);
  const [round, setRound] = useState(newSeed);
  const pick = (n: number) => {
    setLevelNo(n);
    setRound((r) => r + 1);
  };
  const props = { data, onComplete, onGoal, teacher, again: () => setRound((r) => r + 1) };
  return (
    <div class="stack">
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="bridge" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <BuildIt key={`b${round}`} seed={round} {...props} />}
      {levelNo === 2 && <BreakIt key={`k${round}`} seed={round} {...props} />}
      {levelNo === 3 && <JudgeIt key={`j${round}`} seed={round} {...props} />}
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

function Done(props: { won: boolean; winText: string; doneText: string; score: string; need: string; again: () => void }) {
  return (
    <div class={`callout ${props.won ? 'callout-ok' : 'callout-try'} stack`} role="status">
      <p style={{ margin: 0 }}>
        <strong>{props.won ? props.winText : props.doneText}</strong> {props.score}
      </p>
      {!props.won && <p style={{ margin: 0 }}>{props.need} Play again: the bridges come in a new order.</p>}
      <div><button class="btn" onClick={props.again}>Play again</button></div>
    </div>
  );
}

/** The river scene: the event on the left bank, the bridge across, and the question on the right bank. */
function River(props: { event: string; goal: string; crossed: boolean; children: ComponentChildren }) {
  return (
    <div class="bb-scene">
      <div class="bb-bank bb-left">
        <span class="bb-bank-label">The event</span>
        <p>{props.event}</p>
      </div>
      <div class="bb-river">
        <span class="bb-wave" aria-hidden="true" />
        <div class="bb-deck">{props.children}</div>
        {props.crossed && <span class="bb-walker" aria-hidden="true">🚶</span>}
      </div>
      <div class="bb-bank bb-right">
        <span class="bb-bank-label">The question</span>
        <p>{props.goal}</p>
      </div>
    </div>
  );
}

// ---------------- Level 1: build it ----------------

function BuildIt({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const bridges = useMemo(() => shuffled(data.builds, seed + 4), [data.builds, seed]);
  const max = buildMax(data.builds);
  const [idx, setIdx] = useState(0);
  const [placed, setPlaced] = useState(0);
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [points, setPoints] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const b = bridges[idx];
  const pile = useMemo(() => shuffled(b.planks.map((text, i) => ({ text, i })), seed + idx * 11 + 3), [b, seed, idx]);
  const total = b.planks.length;
  const built = placed === total;

  const tap = (i: number) => {
    if (built) return;
    const n = nextPlank(placed, i);
    if (n < 0) {
      setMisses((m) => m + 1);
      setWrong(i);
      setAnnounce('That plank does not fit there yet. Which step must come next?');
      return;
    }
    const gained = plankPoint(misses);
    let now = n;
    // The last plank places itself: there is only one place it can go.
    if (now === total - 1) now = total;
    setPlaced(now);
    reportAnswer(gained === 1);
    setPoints((p) => p + gained);
    setMisses(0);
    setWrong(null);
    setAnnounce(now === total ? 'The bridge is complete. The walker crosses.' : `Plank ${n} placed.`);
  };

  const next = () => {
    setPlaced(0);
    setMisses(0);
    setWrong(null);
    if (idx + 1 < bridges.length) {
      setIdx(idx + 1);
      setAnnounce('A new river to cross.');
    } else {
      setDone(true);
      onComplete();
      if (buildWon(points)) win(onGoal, 1);
    }
  };

  if (done) {
    return (
      <Done won={buildWon(points)} winText="Every bridge stands!" doneText="All bridges built." again={again}
        score={`Planks placed right first time: ${points} of ${max}.`} need={`The ${STAMP_NAMES[0]} stamp needs ${BUILD_GOAL}.`} />
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1. Bridge {idx + 1} of {bridges.length}. Planks right first time: {points} of {max} (goal {BUILD_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="bb-scene-h">
        <h3 id="bb-scene-h"><StepNo n={2} /> Read the event and the question</h3>
        <River event={b.event} goal={b.question} crossed={built}>
          <ol class="bb-slots" aria-label="The bridge so far">
            {b.planks.map((p, i) => (
              <li key={i} class={`bb-slot ${i < placed ? 'bb-slot-on' : ''}`}>
                {i < placed ? <span class="bb-plank-in">{p}</span> : <span class="sr-only">Empty</span>}
              </li>
            ))}
          </ol>
        </River>
      </section>
      <section class="panel stack" aria-labelledby="bb-pile-h">
        <h3 id="bb-pile-h"><StepNo n={3} /> Tap the planks in order, starting from the event</h3>
        {!built && (
          <div class="bb-pile" role="group" aria-label="Planks to place">
            {pile.filter((p) => p.i >= placed).map((p) => (
              <button key={p.i} type="button" class={`bb-plank ${wrong === p.i ? 'shake' : ''}`} onClick={() => tap(p.i)}>
                {p.text}
                {teacher && p.i === placed && <span class="badge badge-done">Next</span>}
              </button>
            ))}
          </div>
        )}
        {wrong !== null && !built && <Fb ok={false}>Not yet. Each plank must follow from the one before it. Which step comes next?</Fb>}
        {built && (
          <div class="callout callout-ok stack" role="status">
            <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
              <MarkIcon /> <span><strong>The bridge holds.</strong> Every step follows from the one before.</span>
            </p>
            <div><button class="btn" onClick={next}>{idx + 1 < bridges.length ? 'Next bridge' : 'Finish'}</button></div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------- Level 2: break it ----------------

function BreakIt({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const bridges = useMemo(() => shuffled(data.breaks, seed + 8), [data.breaks, seed]);
  const max = data.breaks.length * 2;
  const [idx, setIdx] = useState(0);
  const [tapped, setTapped] = useState<number[]>([]);
  const [found, setFound] = useState(false);
  const [fixTried, setFixTried] = useState<number[]>([]);
  const [fixed, setFixed] = useState(false);
  const [points, setPoints] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const b = bridges[idx];
  const fixes = useMemo(() => shuffled(b.fixes, seed + idx * 13 + 5), [b, seed, idx]);
  const lastTap = tapped[tapped.length - 1];
  const lastFix = fixTried[fixTried.length - 1];

  const inspect = (i: number) => {
    if (found || tapped.includes(i)) return;
    const t = [...tapped, i];
    setTapped(t);
    if (i === b.crack) {
      setFound(true);
      reportAnswer(t.length === 1);
      if (t.length === 1) setPoints((p) => p + 1);
      setAnnounce(`Plank ${i + 1} is cracked. Now choose the plank that fixes it.`);
    } else setAnnounce(`Plank ${i + 1} holds. It follows from the one before.`);
  };

  const fix = (i: number) => {
    if (fixed || fixTried.includes(i)) return;
    const t = [...fixTried, i];
    setFixTried(t);
    if (fixes[i].correct) {
      setFixed(true);
      reportAnswer(t.length === 1);
      if (t.length === 1) setPoints((p) => p + 1);
    }
    setAnnounce(fixes[i].feedback);
  };

  const next = () => {
    setTapped([]);
    setFound(false);
    setFixTried([]);
    setFixed(false);
    if (idx + 1 < bridges.length) setIdx(idx + 1);
    else {
      setDone(true);
      onComplete();
      if (breakWon(points)) win(onGoal, 2);
    }
  };

  if (done) {
    return (
      <Done won={breakWon(points)} winText="Every crack is fixed!" doneText="Inspection finished." again={again}
        score={`First-try points: ${points} of ${max}.`} need={`The ${STAMP_NAMES[1]} stamp needs ${BREAK_GOAL} first-try points.`} />
    );
  }

  const fixText = fixed ? fixes.find((f) => f.correct)!.text : null;
  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2. Bridge {idx + 1} of {bridges.length}. First-try points: {points} of {max} (goal {BREAK_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="bk-h">
        <h3 id="bk-h"><StepNo n={2} /> Inspect the bridge: tap the cracked plank</h3>
        <River event={b.event} goal="Does every step follow?" crossed={fixed}>
          <ol class="bb-slots" aria-label="Planks of the bridge">
            {b.planks.map((p, i) => {
              const t = tapped.includes(i);
              const isCrack = i === b.crack;
              return (
                <li key={i} class="bb-slot bb-slot-on">
                  <button
                    type="button"
                    class={`bb-plank-in bb-inspect ${t && !isCrack ? 'bb-holds' : ''} ${t && isCrack ? (fixed ? 'bb-mended' : 'bb-cracked') : ''} ${lastTap === i && !isCrack ? 'shake' : ''}`}
                    disabled={found || t}
                    onClick={() => inspect(i)}
                  >
                    <span class="sr-only">Plank {i + 1}: </span>
                    {isCrack && fixText ? fixText : p}
                    {t && !isCrack && <span class="bb-note">Holds</span>}
                    {t && isCrack && <span class="bb-note">{fixed ? 'Fixed' : 'Cracked'}</span>}
                    {teacher && isCrack && !found && <span class="badge badge-done">Answer</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </River>
        {lastTap !== undefined && lastTap !== b.crack && !found && <Fb ok={false}>That plank holds: it follows from the one before. Check the others.</Fb>}
      </section>
      {found && (
        <section class="panel stack" aria-labelledby="bk-fix-h">
          <h3 id="bk-fix-h"><StepNo n={3} /> Choose the plank that fixes it</h3>
          <div class="bb-pile" role="group" aria-label="Replacement planks">
            {fixes.map((f, i) => {
              const t = fixTried.includes(i);
              return (
                <button key={i} type="button" class={`bb-plank ${t && !f.correct ? 'bb-plank-no' : ''} ${lastFix === i && !f.correct ? 'shake' : ''}`} disabled={fixed || t} onClick={() => fix(i)}>
                  {f.text}
                  {teacher && f.correct && !fixed && <span class="badge badge-done">Answer</span>}
                </button>
              );
            })}
          </div>
          {lastFix !== undefined && <Fb ok={!!fixes[lastFix].correct}>{fixes[lastFix].feedback}</Fb>}
          {fixed && (
            <div class="callout callout-ok stack" role="status">
              <p style={{ margin: 0 }}><Md text={b.why} inline /></p>
              <div><button class="btn" onClick={next}>{idx + 1 < bridges.length ? 'Next bridge' : 'Finish'}</button></div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ---------------- Level 3: judge it ----------------

function JudgeIt({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const cases = useMemo(() => shuffled(data.judges, seed + 15), [data.judges, seed]);
  const max = data.judges.length * 2;
  const [idx, setIdx] = useState(0);
  const [evalTried, setEvalTried] = useState<number[]>([]);
  const [evalOk, setEvalOk] = useState(false);
  const [concTried, setConcTried] = useState<number[]>([]);
  const [concOk, setConcOk] = useState(false);
  const [points, setPoints] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const c = cases[idx];
  const evals = useMemo(() => shuffled(c.evals, seed + idx * 3 + 1), [c, seed, idx]);
  const concs = useMemo(() => shuffled(c.conclusions, seed + idx * 3 + 2), [c, seed, idx]);
  const lastE = evalTried[evalTried.length - 1];
  const lastC = concTried[concTried.length - 1];

  const pickEval = (i: number) => {
    if (evalOk || evalTried.includes(i)) return;
    const t = [...evalTried, i];
    setEvalTried(t);
    if (evals[i].correct) {
      setEvalOk(true);
      reportAnswer(t.length === 1);
      if (t.length === 1) setPoints((p) => p + 1);
    }
    setAnnounce(evals[i].feedback);
  };
  const pickConc = (i: number) => {
    if (concOk || concTried.includes(i)) return;
    const t = [...concTried, i];
    setConcTried(t);
    if (concs[i].correct) {
      setConcOk(true);
      reportAnswer(t.length === 1);
      if (t.length === 1) setPoints((p) => p + 1);
    }
    setAnnounce(concs[i].feedback);
  };

  const next = () => {
    setEvalTried([]);
    setEvalOk(false);
    setConcTried([]);
    setConcOk(false);
    if (idx + 1 < cases.length) setIdx(idx + 1);
    else {
      setDone(true);
      onComplete();
      if (judgeWon(points)) win(onGoal, 3);
    }
  };

  if (done) {
    return (
      <Done won={judgeWon(points)} winText="Fair and well judged!" doneText="All claims judged." again={again}
        score={`First-try points: ${points} of ${max}.`} need={`The ${STAMP_NAMES[2]} stamp needs ${JUDGE_GOAL} first-try points.`} />
    );
  }

  const choices = (opts: Option[], tried: number[], ok: boolean, onPick: (i: number) => void, label: string) => (
    <div class="bb-pile" role="group" aria-label={label}>
      {opts.map((o, i) => {
        const t = tried.includes(i);
        return (
          <button key={i} type="button" class={`bb-plank bb-rail ${t && !o.correct ? 'bb-plank-no' : ''} ${t && o.correct ? 'bb-plank-yes' : ''} ${tried[tried.length - 1] === i && !o.correct ? 'shake' : ''}`} disabled={ok || t} onClick={() => onPick(i)}>
            {o.text}
            {teacher && o.correct && !ok && <span class="badge badge-done">Answer</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3. Claim {idx + 1} of {cases.length}. First-try points: {points} of {max} (goal {JUDGE_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="bj-h">
        <h3 id="bj-h"><StepNo n={2} /> Read the claim and the analysis</h3>
        <div key={c.id} class="bb-claim">
          <p class="bb-claim-label">The claim</p>
          <p class="bb-claim-text">“{c.claim}”</p>
          <p class="bb-claim-label">The bridge so far (analysis)</p>
          <p style={{ margin: 0 }}>{c.analysis}</p>
        </div>
      </section>
      <section class="panel stack" aria-labelledby="bj-e-h">
        <h3 id="bj-e-h"><StepNo n={3} /> Choose the strongest evaluation point</h3>
        {choices(evals, evalTried, evalOk, pickEval, 'Evaluation points')}
        {lastE !== undefined && <Fb ok={!!evals[lastE].correct}>{evals[lastE].feedback}</Fb>}
      </section>
      {evalOk && (
        <section class="panel stack" aria-labelledby="bj-c-h">
          <h3 id="bj-c-h"><StepNo n={4} /> Choose the best supported conclusion</h3>
          {choices(concs, concTried, concOk, pickConc, 'Conclusions')}
          {lastC !== undefined && <Fb ok={!!concs[lastC].correct}>{concs[lastC].feedback}</Fb>}
          {concOk && <div><button class="btn" onClick={next}>{idx + 1 < cases.length ? 'Next claim' : 'Finish'}</button></div>}
        </section>
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
  title: 'Build, break and judge a chain of reasoning',
  description: 'Four boxes joined by arrows: Event, then Cause, then Effect, then Answer. Under them, a box labelled Judge it: how far? for whom? when?',
  boxes: [
    { at: { q: 12, p: 44 }, w: 20, h: 12, text: 'Event' },
    { at: { q: 37, p: 44 }, w: 20, h: 12, text: 'Cause' },
    { at: { q: 62, p: 44 }, w: 20, h: 12, text: 'Effect' },
    { at: { q: 87, p: 44 }, w: 20, h: 12, text: 'Answer' },
    { at: { q: 50, p: 14 }, w: 62, h: 12, text: 'Judge it: how far? for whom? when?' },
  ],
  arrows: [
    { from: { q: 22.5, p: 44 }, to: { q: 26.5, p: 44 } },
    { from: { q: 47.5, p: 44 }, to: { q: 51.5, p: 44 } },
    { from: { q: 72.5, p: 44 }, to: { q: 76.5, p: 44 } },
    { from: { q: 87, p: 37.5 }, to: { q: 80, p: 20.5 } },
  ],
  texts: [{ at: { q: 50, p: 30 }, text: 'so ... because ... this means that', anchor: 'middle' }],
};

function LearnDiagram() {
  return <SpecDiagram spec={LEARN_SPEC} />;
}

export { Try, LearnDiagram };
