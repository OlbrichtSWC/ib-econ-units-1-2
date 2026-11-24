/**
 * Diagram Doctor (exam skills): diagrams arrive at the clinic with mistakes.
 *
 * Level 1 (Check-up): one problem per diagram. Tap the lettered tag that is wrong, then choose the cure.
 * Level 2 (Busy ward): two problems per diagram, so keep examining after the first cure.
 * Level 3 (Exam triage): no tags. Tick every problem on the checklist, or say the diagram is healthy.
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
  CHECKUP_GOAL, checkupWon, health, mistakePoint, ProblemId, PROBLEMS, sameDiagnosis, toggleProblem, TRIAGE_GOAL, triageWon, WARD_GOAL, wardWon,
} from './model';
import './doctor.css';

const STAMP_NAMES = ['Check-up Doctor', 'Ward Doctor', 'Triage Chief'];

interface Cure { text: string; correct?: boolean; feedback: string }
interface Mistake { letter: string; cures: Cure[] }
export interface Patient { id: string; task: string; sick: DiagramSpec; healed: DiagramSpec; mistakes: Mistake[]; why: string }
interface TriagePatient { id: string; task: string; spec: DiagramSpec; problems: ProblemId[]; why: string }
interface TryContent {
  levels: LevelInfo[];
  checkups: Patient[];
  ward: Patient[];
  problems: Record<ProblemId, string>;
  triage: TriagePatient[];
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
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="stethoscope" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <Clinic key={`c${round}`} seed={round} level={1} patients={data.checkups} {...props} />}
      {levelNo === 2 && <Clinic key={`w${round}`} seed={round} level={2} patients={data.ward} {...props} />}
      {levelNo === 3 && <Triage key={`t${round}`} seed={round} {...props} />}
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

/** A heart monitor: a jagged red trace while the diagram is sick, a calm blue one once it is healed. */
function Monitor(props: { well: number; label: string }) {
  const healed = props.well >= 1;
  const path = healed
    ? 'M0 30 H40 L48 18 L56 42 L64 30 H120 L128 18 L136 42 L144 30 H200'
    : 'M0 30 H20 L26 6 L32 54 L38 12 L44 48 L50 30 H80 L86 4 L92 56 L98 10 L104 50 L110 30 H140 L146 6 L152 54 L158 14 L164 46 L170 30 H200';
  return (
    <div class={`dd-monitor ${healed ? 'dd-calm' : 'dd-sick'}`}>
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d={path} fill="none" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
      </svg>
      <div class="dd-health" aria-hidden="true">
        <span style={{ width: `${Math.round(props.well * 100)}%` }} />
      </div>
      <p class="dd-monitor-label">{props.label}</p>
    </div>
  );
}

function Chart(props: { n: number; total: number; task: string }) {
  return (
    <div class="dd-chart">
      <span class="dd-clip" aria-hidden="true" />
      <p class="dd-chart-head">Patient {props.n} of {props.total}</p>
      <p class="dd-chart-task">
        <strong>The task:</strong> <Md text={props.task} inline />
      </p>
    </div>
  );
}

// ---------------- Levels 1 and 2: the clinic ----------------

function Clinic({ seed, level, patients, onComplete, onGoal, teacher, again }: LevelProps & { level: 1 | 2; patients: Patient[] }) {
  const order = useMemo(() => shuffled(patients, seed + level * 7), [patients, seed, level]);
  const [idx, setIdx] = useState(0);
  const [cured, setCured] = useState<string[]>([]);
  const [ruledOut, setRuledOut] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [huntMisses, setHuntMisses] = useState(0);
  const [cureMisses, setCureMisses] = useState(0);
  const [wrongTag, setWrongTag] = useState<string | null>(null);
  const [wrongCure, setWrongCure] = useState<number | null>(null);
  const [points, setPoints] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [patientPoints, setPatientPoints] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');

  const p = order[idx];
  const letters = (p.sick.tags ?? []).map((t) => t.letter);
  const sickLetters = p.mistakes.map((m) => m.letter);
  const healed = cured.length === p.mistakes.length;
  const mistake = p.mistakes.find((m) => m.letter === active);
  const cures = useMemo(() => (mistake ? shuffled(mistake.cures, seed + idx * 3 + letters.indexOf(mistake.letter)) : []), [mistake, seed, idx]);
  const maxPoints = order.reduce((n, x) => n + x.mistakes.length, 0);
  const goal = level === 1 ? CHECKUP_GOAL : WARD_GOAL;

  const tap = (letter: string) => {
    if (healed || active || cured.includes(letter) || ruledOut.includes(letter)) return;
    if (sickLetters.includes(letter)) {
      setActive(letter);
      setWrongTag(null);
      setWrongCure(null);
      setAnnounce(`Tag ${letter} is a problem. Now choose the cure.`);
    } else {
      setRuledOut([...ruledOut, letter]);
      setHuntMisses((n) => n + 1);
      setWrongTag(letter);
      setAnnounce(`Tag ${letter} is healthy. Examine another tag.`);
    }
  };

  const choose = (i: number) => {
    if (!mistake) return;
    const c = cures[i];
    if (!c.correct) {
      setCureMisses((n) => n + 1);
      setWrongCure(i);
      setAnnounce(`Not that cure. ${c.feedback}`);
      return;
    }
    const pt = mistakePoint(huntMisses, cureMisses);
    const nowCured = [...cured, mistake.letter];
    setCured(nowCured);
    setPoints((n) => n + pt);
    setPatientPoints((n) => n + pt);
    if (nowCured.length === p.mistakes.length && patientPoints + pt === p.mistakes.length) setFirstTry((n) => n + 1);
    setActive(null);
    setHuntMisses(0);
    setCureMisses(0);
    setWrongCure(null);
    setWrongTag(null);
    setAnnounce(nowCured.length === p.mistakes.length ? 'Cured. The diagram is healed.' : `Cured tag ${mistake.letter}. This patient has one more problem. Keep examining.`);
  };

  const next = () => {
    setCured([]);
    setRuledOut([]);
    setActive(null);
    setHuntMisses(0);
    setCureMisses(0);
    setWrongTag(null);
    setWrongCure(null);
    setPatientPoints(0);
    if (idx + 1 < order.length) {
      setIdx(idx + 1);
      setAnnounce('The next patient arrives.');
    } else {
      setDone(true);
      onComplete();
      if (level === 1 ? checkupWon(firstTry) : wardWon(points)) win(onGoal, level);
    }
  };

  if (done) {
    const won = level === 1 ? checkupWon(firstTry) : wardWon(points);
    return (
      <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
        <p style={{ margin: 0 }}>
          <strong>{won ? 'Every patient is healthy again!' : 'Clinic closed for the day.'}</strong>{' '}
          {level === 1 ? `Cured right first time: ${firstTry} of ${order.length}.` : `First-try points: ${points} of ${maxPoints}.`}
        </p>
        {!won && (
          <p style={{ margin: 0 }}>
            The {STAMP_NAMES[level - 1]} stamp needs {goal} {level === 1 ? 'patients cured right first time' : 'first-try points'}. Play again: the patients come in a new order.
          </p>
        )}
        <div><button class="btn" onClick={again}>Play again</button></div>
      </div>
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level {level}. {level === 1 ? `Cured right first time: ${firstTry} (goal ${goal}).` : `First-try points: ${points} of ${maxPoints} (goal ${goal}).`}
        {level === 2 && ' Every patient here has two problems.'}
      </p>
      <div class="play">
        <div class="stack">
          <Monitor well={health(cured.length, p.mistakes.length)} label={healed ? 'Healed' : `Problems cured: ${cured.length} of ${p.mistakes.length}`} />
          <div key={`${p.id}-${healed}`} class={`dd-patient ${healed ? 'dd-healed' : 'dd-arrive'}`}>
            <SpecDiagram spec={healed ? p.healed : p.sick} />
            {healed && <span class="dd-discharged" aria-hidden="true">Healed</span>}
          </div>
        </div>
        <div class="stack">
          <section class="panel stack" aria-labelledby="dd-chart-h">
            <h3 id="dd-chart-h"><StepNo n={2} /> Read the patient's chart</h3>
            <Chart n={idx + 1} total={order.length} task={p.task} />
          </section>
          <section class="panel stack" aria-labelledby="dd-exam-h">
            <h3 id="dd-exam-h"><StepNo n={3} /> Examine: tap the tag that is wrong</h3>
            <div class="dd-tags" role="group" aria-label="Tags on the diagram">
              {letters.map((l) => {
                const isCured = cured.includes(l), out = ruledOut.includes(l), now = active === l;
                return (
                  <button
                    key={l}
                    type="button"
                    class={`dd-tag ${isCured ? 'dd-tag-cured' : ''} ${out ? 'dd-tag-fine' : ''} ${now ? 'dd-tag-now' : ''} ${wrongTag === l ? 'shake' : ''}`}
                    disabled={healed || !!active || isCured || out}
                    aria-pressed={now}
                    onClick={() => tap(l)}
                  >
                    <span class="dd-tag-letter">{l}</span>
                    <span class="small">{isCured ? 'Cured' : out ? 'Healthy' : now ? 'Problem' : 'Examine'}</span>
                    {teacher && !isCured && sickLetters.includes(l) && <span class="badge badge-done">Answer</span>}
                  </button>
                );
              })}
            </div>
            {wrongTag && !active && !healed && <Fb ok={false}>Tag {wrongTag} looks healthy. Check it against the task and the checklist, then examine another tag.</Fb>}
            {level === 2 && cured.length === 1 && !healed && !active && <Fb ok>One problem cured. This patient has one more. Keep examining.</Fb>}
          </section>
          {mistake && (
            <section class="panel stack" aria-labelledby="dd-cure-h">
              <h3 id="dd-cure-h"><StepNo n={4} /> Choose the cure for tag {mistake.letter}</h3>
              <div class="dd-cures" role="group" aria-label={`Cures for tag ${mistake.letter}`}>
                {cures.map((c, i) => (
                  <button key={i} type="button" class={`dd-cure ${wrongCure === i ? 'shake dd-cure-no' : ''}`} onClick={() => choose(i)} disabled={wrongCure === i}>
                    <span aria-hidden="true">💊</span> {c.text}
                    {teacher && c.correct && <span class="badge badge-done">Answer</span>}
                  </button>
                ))}
              </div>
              {wrongCure !== null && <Fb ok={false}>{cures[wrongCure].feedback}</Fb>}
            </section>
          )}
          {healed && (
            <div class="callout callout-ok stack" role="status">
              <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                <MarkIcon /> <span><strong>Healed.</strong> <Md text={p.why} inline /></span>
              </p>
              <div><button class="btn" onClick={next}>{idx + 1 < order.length ? 'Next patient' : 'Finish'}</button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Level 3: exam triage ----------------

function Triage({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const order = useMemo(() => shuffled(data.triage, seed + 23), [data.triage, seed]);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [healthy, setHealthy] = useState(false);
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [wrongMsg, setWrongMsg] = useState('');
  const [firstTry, setFirstTry] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const t = order[idx];

  const toggle = (id: ProblemId) => {
    if (solved) return;
    setHealthy(false);
    setChosen(toggleProblem(chosen, id));
  };

  const diagnose = () => {
    if (solved) return;
    const ok = sameDiagnosis(healthy ? [] : chosen, t.problems);
    if (ok) {
      setSolved(true);
      setWrongMsg('');
      if (!missed) setFirstTry((n) => n + 1);
      setAnnounce('Right diagnosis.');
    } else {
      setMissed(true);
      const n = t.problems.length;
      const msg = n === 0
        ? 'Not quite. Check the diagram against the task again. Could it be healthy?'
        : `Not quite. This diagram has ${n === 1 ? 'one problem' : `${n} problems`}. Check it against the task and each line of the checklist.`;
      setWrongMsg(msg);
      setAnnounce(msg);
    }
  };

  const next = () => {
    setChosen([]);
    setHealthy(false);
    setMissed(false);
    setSolved(false);
    setWrongMsg('');
    if (idx + 1 < order.length) {
      setIdx(idx + 1);
      setAnnounce('The next patient arrives.');
    } else {
      setDone(true);
      onComplete();
      if (triageWon(firstTry)) win(onGoal, 3);
    }
  };

  if (done) {
    const won = triageWon(firstTry);
    return (
      <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
        <p style={{ margin: 0 }}>
          <strong>{won ? 'Triage complete. Sharp diagnosis!' : 'Triage finished.'}</strong> Right first time: {firstTry} of {order.length}.
        </p>
        {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[2]} stamp needs {TRIAGE_GOAL} right first time. Play again: the patients come in a new order.</p>}
        <div><button class="btn" onClick={again}>Play again</button></div>
      </div>
    );
  }

  const answerText = t.problems.length ? t.problems.map((p) => data.problems[p]).join('; ') : 'Healthy';
  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3. Right first time: {firstTry} (goal {TRIAGE_GOAL}). No tags here: read it like an examiner.
      </p>
      <div class="play">
        <div class="stack">
          <Monitor well={solved ? 1 : 0.5} label={solved ? 'Diagnosed' : 'Waiting for a diagnosis'} />
          <div key={t.id} class="dd-patient dd-arrive">
            <SpecDiagram spec={t.spec} />
          </div>
        </div>
        <div class="stack">
          <section class="panel stack" aria-labelledby="dd-tchart-h">
            <h3 id="dd-tchart-h"><StepNo n={2} /> Read the patient's chart</h3>
            <Chart n={idx + 1} total={order.length} task={t.task} />
          </section>
          <section class="panel stack" aria-labelledby="dd-tri-h">
            <h3 id="dd-tri-h"><StepNo n={3} /> Mark every problem, or choose healthy</h3>
            <fieldset class="dd-checklist" disabled={solved}>
              <legend class="sr-only">Problems with the diagram</legend>
              {PROBLEMS.map((id) => (
                <label key={id} class={`dd-check ${chosen.includes(id) && !healthy ? 'on' : ''}`}>
                  <input type="checkbox" checked={chosen.includes(id) && !healthy} onChange={() => toggle(id)} />
                  <span>{data.problems[id]}</span>
                </label>
              ))}
              <label class={`dd-check dd-check-healthy ${healthy ? 'on' : ''}`}>
                <input type="checkbox" checked={healthy} onChange={() => { setHealthy(!healthy); setChosen([]); }} />
                <span><strong>Healthy:</strong> nothing to fix</span>
              </label>
            </fieldset>
            {teacher && !solved && <p class="small"><span class="badge badge-done">Answer</span> {answerText}</p>}
            <div><button class="btn" onClick={diagnose} disabled={solved || (!healthy && chosen.length === 0)}><StepNo n={4} /> Diagnose</button></div>
            {wrongMsg && !solved && <Fb ok={false}>{wrongMsg}</Fb>}
            {solved && (
              <div class="callout callout-ok stack" role="status">
                <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                  <MarkIcon /> <span><strong>{t.problems.length ? 'Right diagnosis.' : 'Right: healthy.'}</strong> <Md text={t.why} inline /></span>
                </p>
                <div><button class="btn" onClick={next}>{idx + 1 < order.length ? 'Next patient' : 'Finish'}</button></div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------------- Learn it ----------------

const LEARN_SPEC: DiagramSpec = {
  xMax: 10,
  yMax: 10,
  xLabel: 'Quantity (Q)',
  yLabel: 'Price (P)',
  title: 'Market for cinema tickets: a full-mark diagram of an increase in demand',
  description: 'Labelled axes. Demand shifts right from the dashed D₁ to D₂, shown by an arrow. Supply S slopes up. Dashed lines mark P₁ and Q₁ where D₁ meets S, and P₂ and Q₂ where D₂ meets S.',
  curves: [
    { points: [{ q: 1, p: 9 }, { q: 9, p: 1 }], label: 'D₁', tone: 'grey', dashed: true },
    { points: [{ q: 3, p: 9 }, { q: 10, p: 2 }], label: 'D₂', tone: 'navy' },
    { points: [{ q: 1, p: 1 }, { q: 9, p: 9 }], label: 'S', tone: 'red' },
  ],
  guides: [{ at: { q: 5, p: 5 }, xText: 'Q₁', yText: 'P₁' }, { at: { q: 6, p: 6 }, xText: 'Q₂', yText: 'P₂' }],
  dots: [{ at: { q: 5, p: 5 } }, { at: { q: 6, p: 6 } }],
  arrows: [{ from: { q: 6.2, p: 3.8 }, to: { q: 7.9, p: 3.8 } }],
};

function LearnDiagram() {
  return <SpecDiagram spec={LEARN_SPEC} />;
}

export { Try, LearnDiagram };
