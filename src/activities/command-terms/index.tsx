/**
 * Command terms (exam skills): a control tower where every exam question is a plane.
 *
 * Level 1 (Runways): land each plane on the runway for its command term's assessment objective (AO1 to AO4).
 * Level 2 (Flight plans): choose the answer plan that does what the command term asks.
 * Level 3 (Black box): read a student's answer, say what it is missing, then choose the fix.
 */
import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon, StepNo } from '../../shared/design/components';
import type { TryProps } from '../../shared/activity/types';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import type { LevelInfo } from '../../shared/activity/LevelPicker';
import { celebrate } from '../../shared/fun/celebrate';
import { shuffled } from '../island-economy/model';
import { Ao, aoOf, AOS, BOX_GOAL, boxMax, boxWon, PLAN_GOAL, planWon, RUNWAY_GOAL, runwayWon, Term, RUNWAY_DRAW
} from './model';
import './tower.css';
import { drawRound, newSeed } from '../../shared/activity/seed';

const STAMP_NAMES = ['Air Traffic Controller', 'Flight Planner', 'Crash Investigator'];

interface Option { text: string; correct?: boolean; feedback: string }
interface Plane { id: string; term: string; question: string; callsign: string }
interface Plan { id: string; question: string; options: Option[] }
interface Box { id: string; question: string; answer: string; verdict: string; why: string; fixes?: Option[] }
interface TryContent {
  levels: LevelInfo[];
  terms: Term[];
  runways: Record<Ao, { name: string; blurb: string }>;
  planes: Plane[];
  plans: Plan[];
  verdicts: Record<string, string>;
  boxes: Box[];
}

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
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="tower" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <Runways key={`r${round}`} seed={round} {...props} />}
      {levelNo === 2 && <Plans key={`p${round}`} seed={round} {...props} />}
      {levelNo === 3 && <BlackBox key={`b${round}`} seed={round} {...props} />}
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
      {!props.won && <p style={{ margin: 0 }}>{props.need} Play again: the questions come in a new order.</p>}
      <div><button class="btn" onClick={props.again}>Play again</button></div>
    </div>
  );
}

/** The sky with the current plane. A banner behind the plane carries the question. */
function Sky(props: { id: string; callsign: string; landed: boolean; children: ComponentChildren }) {
  return (
    <div class="ct-sky">
      <span class="ct-cloud ct-cloud1" aria-hidden="true" />
      <span class="ct-cloud ct-cloud2" aria-hidden="true" />
      <div key={props.id} class={`ct-flight ${props.landed ? 'ct-landed' : 'ct-arrive'}`}>
        <span class="ct-plane" aria-hidden="true">✈️</span>
        <span class="ct-callsign">Flight {props.callsign}</span>
        <div class="ct-banner">{props.children}</div>
      </div>
      <span class="ct-tower" aria-hidden="true">📡</span>
    </div>
  );
}

// ---------------- Level 1: runways ----------------

function Runways({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const planes = useMemo(() => drawRound(data.planes, RUNWAY_DRAW, seed + 3), [data.planes, seed]);
  const [idx, setIdx] = useState(0);
  const [missed, setMissed] = useState(false);
  const [landed, setLanded] = useState(false);
  const [wrong, setWrong] = useState<Ao | null>(null);
  const [firstTry, setFirstTry] = useState(0);
  const [parked, setParked] = useState<Record<Ao, string[]>>({ AO1: [], AO2: [], AO3: [], AO4: [] });
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const pl = planes[idx];
  const ao = aoOf(data.terms, pl.term)!;
  const meaning = data.terms.find((t) => t.term === pl.term)!.meaning;

  const land = (r: Ao) => {
    if (landed) return;
    if (r === ao) {
      setLanded(true);
      setWrong(null);
      if (!missed) setFirstTry((n) => n + 1);
      setParked({ ...parked, [r]: [...parked[r], pl.term] });
      setAnnounce(`Landed on ${r}, ${data.runways[r].name}.`);
    } else {
      setMissed(true);
      setWrong(r);
      setAnnounce(`Not ${r}. The plane goes round again. Read what ${pl.term.toLowerCase()} asks you to do.`);
    }
  };

  const next = () => {
    setLanded(false);
    setMissed(false);
    setWrong(null);
    if (idx + 1 < planes.length) {
      setIdx(idx + 1);
      setAnnounce('A new plane is on approach.');
    } else {
      setDone(true);
      onComplete();
      if (runwayWon(firstTry)) win(onGoal, 1);
    }
  };

  if (done) {
    return (
      <Done won={runwayWon(firstTry)} winText="Every plane is down safely!" doneText="The sky is clear." again={again}
        score={`Landed right first time: ${firstTry} of ${planes.length}.`} need={`The ${STAMP_NAMES[0]} stamp needs ${RUNWAY_GOAL} right first time.`} />
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1. Plane {idx + 1} of {planes.length}. Landed right first time: {firstTry} (goal {RUNWAY_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="ct-sky-h">
        <h3 id="ct-sky-h"><StepNo n={2} /> Read the question and find the command term</h3>
        <Sky id={pl.id} callsign={pl.callsign} landed={landed}>
          <Md text={pl.question} inline />
        </Sky>
        {missed && !landed && (
          <p class="small" style={{ margin: 0 }}>
            <strong>Tower hint:</strong> {pl.term} means: {meaning}
          </p>
        )}
      </section>
      <section class="panel stack" aria-labelledby="ct-rw-h">
        <h3 id="ct-rw-h"><StepNo n={3} /> Land it on the right runway</h3>
        <div class="ct-runways" role="group" aria-label="Runways">
          {AOS.map((r) => (
            <button key={r} type="button" class={`ct-runway ${wrong === r ? 'shake' : ''} ${landed && r === ao ? 'ct-runway-on' : ''}`} disabled={landed} onClick={() => land(r)}>
              <span class="ct-rw-ao">{r}</span>
              <strong>{data.runways[r].name}</strong>
              <span class="small">{data.runways[r].blurb}</span>
              <span class="ct-stripes" aria-hidden="true" />
              {parked[r].length > 0 && <span class="ct-parked small">Landed: {parked[r].join(', ')}</span>}
              {teacher && r === ao && !landed && <span class="badge badge-done">Answer</span>}
            </button>
          ))}
        </div>
        {wrong && !landed && <Fb ok={false}>Not the {wrong} runway. The plane goes round again. Read the tower hint and try another runway.</Fb>}
        {landed && (
          <div class="callout callout-ok stack" role="status">
            <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
              <MarkIcon /> <span><strong>{pl.term} is {ao}.</strong> In the IB guide, {pl.term.toLowerCase()} means: {meaning}</span>
            </p>
            <div><button class="btn" onClick={next}>{idx + 1 < planes.length ? 'Next plane' : 'Finish'}</button></div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------- Level 2: flight plans ----------------

function Plans({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const plans = useMemo(() => shuffled(data.plans, seed + 9), [data.plans, seed]);
  const [idx, setIdx] = useState(0);
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [tried, setTried] = useState<number[]>([]);
  const [firstTry, setFirstTry] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const pl = plans[idx];
  const options = useMemo(() => shuffled(pl.options, seed + idx * 5 + 1), [pl, seed, idx]);
  const last = tried[tried.length - 1];

  const choose = (i: number) => {
    if (solved || tried.includes(i)) return;
    setTried([...tried, i]);
    if (options[i].correct) {
      setSolved(true);
      if (!missed) setFirstTry((n) => n + 1);
      setAnnounce(`Cleared for take-off. ${options[i].feedback}`);
    } else {
      setMissed(true);
      setAnnounce(`Flight plan rejected. ${options[i].feedback}`);
    }
  };

  const next = () => {
    setSolved(false);
    setMissed(false);
    setTried([]);
    if (idx + 1 < plans.length) setIdx(idx + 1);
    else {
      setDone(true);
      onComplete();
      if (planWon(firstTry)) win(onGoal, 2);
    }
  };

  if (done) {
    return (
      <Done won={planWon(firstTry)} winText="Every flight plan approved!" doneText="All flights planned." again={again}
        score={`Right first time: ${firstTry} of ${plans.length}.`} need={`The ${STAMP_NAMES[1]} stamp needs ${PLAN_GOAL} right first time.`} />
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2. Flight {idx + 1} of {plans.length}. Right first time: {firstTry} (goal {PLAN_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="ct-q-h">
        <h3 id="ct-q-h"><StepNo n={2} /> Read the question. The command term is in bold.</h3>
        <Sky id={pl.id} callsign={String(idx + 101)} landed={solved}>
          <Md text={pl.question} inline />
        </Sky>
      </section>
      <section class="panel stack" aria-labelledby="ct-plan-h">
        <h3 id="ct-plan-h"><StepNo n={3} /> Choose the flight plan: how should the answer go?</h3>
        <div class="ct-passes" role="group" aria-label="Flight plans">
          {options.map((o, i) => {
            const t = tried.includes(i);
            return (
              <button key={i} type="button" class={`ct-pass ${t && !o.correct ? 'ct-pass-no' : ''} ${t && o.correct ? 'ct-pass-yes' : ''} ${last === i && !o.correct ? 'shake' : ''}`} disabled={solved || t} onClick={() => choose(i)}>
                <span class="ct-pass-head" aria-hidden="true">Flight plan {String.fromCharCode(65 + i)}</span>
                <span>{o.text}</span>
                {teacher && o.correct && !solved && <span class="badge badge-done">Answer</span>}
              </button>
            );
          })}
        </div>
        {last !== undefined && !options[last].correct && !solved && <Fb ok={false}>{options[last].feedback}</Fb>}
        {solved && (
          <div class="callout callout-ok stack" role="status">
            <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
              <MarkIcon /> <span><strong>Cleared for take-off.</strong> {options[last].feedback}</span>
            </p>
            <div><button class="btn" onClick={next}>{idx + 1 < plans.length ? 'Next flight' : 'Finish'}</button></div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------- Level 3: black box ----------------

function BlackBox({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const boxes = useMemo(() => shuffled(data.boxes, seed + 17), [data.boxes, seed]);
  const verdictIds = Object.keys(data.verdicts);
  const max = boxMax(data.boxes);
  const [idx, setIdx] = useState(0);
  const [verdictTried, setVerdictTried] = useState<string[]>([]);
  const [verdictOk, setVerdictOk] = useState(false);
  const [fixTried, setFixTried] = useState<number[]>([]);
  const [fixOk, setFixOk] = useState(false);
  const [points, setPoints] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const b = boxes[idx];
  const fixes = useMemo(() => (b.fixes ? shuffled(b.fixes, seed + idx * 7 + 2) : []), [b, seed, idx]);
  const needsFix = b.verdict !== 'ok';
  const finished = verdictOk && (!needsFix || fixOk);
  const lastV = verdictTried[verdictTried.length - 1];
  const lastF = fixTried[fixTried.length - 1];

  const judge = (v: string) => {
    if (verdictOk || verdictTried.includes(v)) return;
    const tries = [...verdictTried, v];
    setVerdictTried(tries);
    if (v === b.verdict) {
      setVerdictOk(true);
      if (tries.length === 1) setPoints((n) => n + 1);
      setAnnounce(`Right: ${data.verdicts[v]}. ${b.why}`);
    } else setAnnounce(`Not quite: ${data.verdicts[v]}. Read the command term's meaning and look again.`);
  };

  const fix = (i: number) => {
    if (fixOk || fixTried.includes(i)) return;
    const tries = [...fixTried, i];
    setFixTried(tries);
    if (fixes[i].correct) {
      setFixOk(true);
      if (tries.length === 1) setPoints((n) => n + 1);
    }
    setAnnounce(fixes[i].feedback);
  };

  const next = () => {
    setVerdictTried([]);
    setVerdictOk(false);
    setFixTried([]);
    setFixOk(false);
    if (idx + 1 < boxes.length) setIdx(idx + 1);
    else {
      setDone(true);
      onComplete();
      if (boxWon(points)) win(onGoal, 3);
    }
  };

  if (done) {
    return (
      <Done won={boxWon(points)} winText="Case closed. Every answer is fixed!" doneText="Investigation finished." again={again}
        score={`First-try points: ${points} of ${max}.`} need={`The ${STAMP_NAMES[2]} stamp needs ${BOX_GOAL} first-try points.`} />
    );
  }

  const term = data.terms.find((t) => b.question.toLowerCase().includes(`**${t.term.toLowerCase()}**`));
  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3. Black box {idx + 1} of {boxes.length}. First-try points: {points} of {max} (goal {BOX_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="ct-bb-h">
        <h3 id="ct-bb-h"><StepNo n={2} /> Open the black box: read the question and the answer</h3>
        <div key={b.id} class="ct-box ct-arrive">
          <p class="ct-box-label">Question</p>
          <p style={{ margin: 0 }}><Md text={b.question} inline /></p>
          {term && <p class="small ct-box-term"><strong>{term.term}</strong> ({term.ao}): {term.meaning}</p>}
          <p class="ct-box-label">A student's answer</p>
          <p class="ct-tape">{b.answer}</p>
        </div>
      </section>
      <section class="panel stack" aria-labelledby="ct-v-h">
        <h3 id="ct-v-h"><StepNo n={3} /> What is the verdict?</h3>
        <div class="ct-verdicts" role="group" aria-label="Verdicts">
          {verdictIds.map((v) => {
            const t = verdictTried.includes(v);
            return (
              <button key={v} type="button" class={`ct-verdict ${t && v !== b.verdict ? 'ct-pass-no' : ''} ${t && v === b.verdict ? 'ct-pass-yes' : ''} ${lastV === v && v !== b.verdict ? 'shake' : ''}`} disabled={verdictOk || t} onClick={() => judge(v)}>
                {v === 'ok' ? '✅ ' : '🔧 '}{data.verdicts[v]}
                {teacher && v === b.verdict && !verdictOk && <span class="badge badge-done">Answer</span>}
              </button>
            );
          })}
        </div>
        {lastV && !verdictOk && <Fb ok={false}>Not quite. Read what the command term asks, then check the answer against it.</Fb>}
        {verdictOk && <Fb ok>{b.why}</Fb>}
      </section>
      {verdictOk && needsFix && (
        <section class="panel stack" aria-labelledby="ct-f-h">
          <h3 id="ct-f-h"><StepNo n={4} /> Choose the fix</h3>
          <div class="ct-passes" role="group" aria-label="Fixes">
            {fixes.map((f, i) => {
              const t = fixTried.includes(i);
              return (
                <button key={i} type="button" class={`ct-pass ${t && !f.correct ? 'ct-pass-no' : ''} ${t && f.correct ? 'ct-pass-yes' : ''} ${lastF === i && !f.correct ? 'shake' : ''}`} disabled={fixOk || t} onClick={() => fix(i)}>
                  <span>{f.text}</span>
                  {teacher && f.correct && !fixOk && <span class="badge badge-done">Answer</span>}
                </button>
              );
            })}
          </div>
          {lastF !== undefined && <Fb ok={!!fixes[lastF].correct}>{fixes[lastF].feedback}</Fb>}
        </section>
      )}
      {finished && (
        <div><button class="btn" onClick={next}>{idx + 1 < boxes.length ? 'Next black box' : 'Finish'}</button></div>
      )}
    </div>
  );
}

// ---------------- Learn it ----------------

function LearnDiagram({ content }: { content: { try: Record<string, unknown> } }) {
  const data = content.try as unknown as TryContent;
  return (
    <div class="ct-ladder" role="img" aria-label="The four assessment objectives and their command terms. AO1 knowledge, AO2 application and analysis, AO3 synthesis and evaluation, AO4 skills.">
      {(['AO3', 'AO2', 'AO1', 'AO4'] as Ao[]).map((a) => (
        <div key={a} class={`ct-rung ct-rung-${a}`}>
          <p class="ct-rung-head"><strong>{a}</strong> {data.runways[a].blurb}</p>
          <p class="ct-rung-terms">{data.terms.filter((t) => t.ao === a).map((t) => t.term.toLowerCase()).join(', ')}</p>
        </div>
      ))}
    </div>
  );
}

export { Try, LearnDiagram };
