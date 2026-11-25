/**
 * IA Trailhead: plan the IA portfolio as a hiking trail.
 *
 * Level 1 (Compass): the student chooses Unit 2, 3 or 4 and answers five questions about it, which point
 *   to a topic and key concepts in that unit (one commentary per unit, so they can do all three). The
 *   Unit 2 strengths panel reads this browser's Check it scores. Then five trail rules and a three-commentary plan.
 * Level 2 (Article scout): keep or leave news articles; then say which unit, or why it must be left.
 * Level 3 (Lens and diagram): for Unit 2 articles, choose the diagram that fits and the full-mark key concept link.
 */
import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { CrossIcon, LiveRegion, MarkIcon, StepNo } from '../../shared/design/components';
import type { TryProps } from '../../shared/activity/types';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import type { LevelInfo } from '../../shared/activity/LevelPicker';
import { celebrate } from '../../shared/fun/celebrate';
import { shuffled } from '../island-economy/model';
import { drawRound, newSeed } from '../../shared/activity/seed';
import { ACTIVITIES } from '../../app/registry';
import {
  checkScore, CompassMemory, Concept, CONCEPT_NAMES, CONCEPTS, IA_UNITS, LeaveReason, LEAVE_REASONS, leaveReason, LENS_DRAW, LENS_GOAL, lensWon,
  PlanProblem, planFromCompass, planProblems, PlanRow, RULES_GOAL, SCOUT_DRAW, SCOUT_GOAL, scoutWon, ScoutArticle, TopicLean, trailWon, Unit, unitCompass, UNIT_NAMES,
} from './model';
import './trail.css';
import { reportAnswer } from '../../shared/activity/levelEvents';

const STAMP_NAMES = ['Trailblazer', 'Article Scout', 'Lens Master'];
const PLAN_KEY = 'ib-econ-1-2.ia-plan';
const COMPASS_KEY = 'ib-econ-1-2.ia-compass';
const PROGRESS_KEY = 'ib-econ-1-2.progress';

interface Option { text: string; correct?: boolean; feedback: string }
interface Question { id: string; prompt: string; options: (TopicLean & { text: string })[] }
interface Topic { id: string; name: string; codes: string[]; diagram: string; ideas: string[] }
interface UnitPack { questions: Question[]; topics: Topic[] }
interface Theme { id: string; name: string; codes: string[]; idea: string }
interface Rule { id: string; icon: string; text: string; options: Option[] }
interface Article extends ScoutArticle { id: string; icon: string; headline: string; sourceName: string; summary: string; why: string }
interface Lens { id: string; icon: string; headline: string; summary: string; concept: Concept; diagrams: Option[]; links: Option[] }
interface TryContent {
  levels: LevelInfo[];
  units: Record<string, UnitPack>;
  themes: Theme[];
  rules: Rule[];
  articles: Article[];
  reasonNames: Record<LeaveReason, string>;
  lenses: Lens[];
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
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="compass" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <CompassLevel key={`c${round}`} seed={round} {...props} />}
      {levelNo === 2 && <ScoutLevel key={`s${round}`} seed={round} {...props} />}
      {levelNo === 3 && <LensLevel key={`l${round}`} seed={round} {...props} />}
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

/** The trail bar: a hiker walks from the trailhead to the summit as the student moves through a level. */
function Trail(props: { at: number; total: number; label: string }) {
  const pct = props.total ? Math.min(100, Math.round((props.at / props.total) * 100)) : 0;
  return (
    <div class="ia-trail" role="img" aria-label={props.label}>
      <span class="ia-trail-end ia-trail-start" aria-hidden="true">⛺</span>
      <div class="ia-trail-path">
        <div class="ia-trail-done" style={{ width: `${pct}%` }} />
        <span class="ia-hiker" style={{ left: `${pct}%` }} aria-hidden="true">🥾</span>
      </div>
      <span class="ia-trail-end" aria-hidden="true">⛰️</span>
    </div>
  );
}

function OptionButtons(props: {
  options: Option[];
  tried: number[];
  solved: boolean;
  teacher: boolean;
  onPick: (i: number) => void;
  label: string;
}) {
  return (
    <div class="ia-options" role="group" aria-label={props.label}>
      {props.options.map((o, i) => {
        const wasWrong = props.tried.includes(i) && !o.correct;
        const isRight = props.solved && o.correct;
        return (
          <button
            key={i}
            type="button"
            class={`ia-option ${wasWrong ? 'ia-option-wrong' : ''} ${isRight ? 'ia-option-right' : ''}`}
            disabled={props.solved || wasWrong}
            onClick={() => props.onPick(i)}
          >
            <span>{o.text}</span>
            {props.teacher && o.correct && !props.solved && <span class="badge badge-done">Answer</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------------- Level 1: the compass ----------------

/** Unit 2 points north-west, Unit 3 north, Unit 4 north-east. */
const NEEDLE: Record<number, number> = { 2: -45, 3: 0, 4: 45 };

function CompassRose(props: { unit: Unit | null }) {
  const angle = props.unit ? NEEDLE[props.unit] : 0;
  return (
    <svg class="ia-compass" viewBox="0 0 200 140" role="img" aria-label={props.unit ? `The compass points to ${UNIT_NAMES[props.unit]}.` : 'The compass is waiting for you to choose a unit.'}>
      <path d="M20 130 A80 80 0 0 1 180 130" fill="#eef3ff" stroke="#1d4ed8" stroke-width="3" />
      <text x="38" y="58" text-anchor="middle" font-size="13" font-weight="700" fill="#1d4ed8">Unit 2</text>
      <text x="100" y="28" text-anchor="middle" font-size="13" font-weight="700" fill="#1d4ed8">Unit 3</text>
      <text x="162" y="58" text-anchor="middle" font-size="13" font-weight="700" fill="#1d4ed8">Unit 4</text>
      <g class={props.unit ? 'ia-needle ia-needle-set' : 'ia-needle'} style={{ transform: `rotate(${angle}deg)` }}>
        <path d="M100 52 L108 128 L100 122 L92 128 Z" fill="#c8102e" />
      </g>
      <circle cx="100" cy="126" r="7" fill="#1d4ed8" />
    </svg>
  );
}

interface ThemeScore { theme: Theme; score: number | null; played: number }

/** Read this browser's Check it scores for the Unit 2 games, grouped by IA-friendly theme. */
function readStrengths(themes: Theme[]): ThemeScore[] {
  let acts: Record<string, { correct?: number; total?: number }> = {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) acts = (JSON.parse(raw) as { activities?: typeof acts }).activities ?? {};
  } catch {
    /* storage blocked: no strengths to show */
  }
  return themes
    .map((theme) => {
      const ids = ACTIVITIES.filter((a) => a.unit === 2 && theme.codes.includes(a.code)).map((a) => a.id);
      let correct = 0, total = 0, played = 0;
      for (const id of ids) {
        const p = acts[id];
        if (!p || !p.total) continue;
        played++;
        correct += p.correct ?? 0;
        total += p.total;
      }
      return { theme, score: checkScore(correct, total), played };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

function loadCompass(): CompassMemory {
  try {
    const raw = localStorage.getItem(COMPASS_KEY);
    const m = raw ? (JSON.parse(raw) as CompassMemory) : {};
    const out: CompassMemory = {};
    for (const u of IA_UNITS) {
      const r = m?.[u];
      if (r && typeof r.topic === 'string' && Array.isArray(r.concepts)) out[u] = { topic: r.topic, concepts: r.concepts.filter((c) => CONCEPTS.includes(c)) };
    }
    return out;
  } catch {
    return {};
  }
}

function saveCompass(m: CompassMemory) {
  try {
    localStorage.setItem(COMPASS_KEY, JSON.stringify(m));
  } catch {
    /* storage blocked: the compass stays on screen only */
  }
}

function topicOf(data: TryContent, unit: Unit, id: string | undefined): Topic | undefined {
  return data.units[String(unit)]?.topics.find((t) => t.id === id);
}

function loadPlan(): PlanRow[] {
  const empty: PlanRow[] = [0, 1, 2].map(() => ({ unit: null, concept: null }));
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return empty;
    const rows = JSON.parse(raw) as PlanRow[];
    if (!Array.isArray(rows) || rows.length !== 3) return empty;
    return rows.map((r) => ({
      unit: [1, 2, 3, 4].includes(r?.unit as number) ? (r.unit as Unit) : null,
      concept: CONCEPTS.includes(r?.concept as Concept) ? (r.concept as Concept) : null,
    }));
  } catch {
    return empty;
  }
}

function savePlan(plan: PlanRow[]) {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {
    /* storage blocked: the plan stays on screen only */
  }
}

const PROBLEM_TEXT: Record<PlanProblem, string> = {
  missing: 'Choose a unit and a key concept for all three commentaries.',
  unit1: 'Unit 1 is not allowed. Use Units 2, 3 and 4.',
  sameUnit: 'Two commentaries are on the same unit. Each one must be on a different unit.',
  sameConcept: 'Two commentaries use the same key concept. Each one must use a different key concept, or you risk losing marks in criterion D.',
};

function CompassLevel({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<TopicLean[]>([]);
  const [redo, setRedo] = useState(false);
  const [mem, setMem] = useState<CompassMemory>(loadCompass);
  const [ri, setRi] = useState(-1);
  const [tried, setTried] = useState<number[]>([]);
  const [rulesRight, setRulesRight] = useState(0);
  const [plan, setPlan] = useState<PlanRow[]>(loadPlan);
  const [checked, setChecked] = useState<PlanProblem[] | null>(null);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');

  const rules = useMemo(() => shuffled(data.rules, seed + 3).map((r, i) => ({ ...r, options: shuffled(r.options, seed + 7 + i) })), [data.rules, seed]);
  const strengths = useMemo(() => readStrengths(data.themes), [data.themes]);
  const pack = unit ? data.units[String(unit)] : null;
  const questions = useMemo(
    () => (pack ? pack.questions.map((q, i) => ({ ...q, options: shuffled(q.options, seed + 11 + i) })) : []),
    [pack, seed],
  );
  const found = unit ? mem[unit] : undefined;
  const asking = !!unit && (!found || redo);
  const topic = unit && found ? topicOf(data, unit, found.topic) : undefined;
  const explored = IA_UNITS.filter((u) => mem[u]);
  const rulesDone = ri >= rules.length;
  const rule = ri >= 0 && ri < rules.length ? rules[ri] : null;
  const ruleSolved = !!rule && tried.some((i) => rule.options[i].correct);

  const chooseUnit = (u: Unit) => {
    setUnit(u);
    setQi(0);
    setAnswers([]);
    setRedo(false);
    setAnnounce(mem[u] ? `${UNIT_NAMES[u]}. Your compass for this unit is below.` : `${UNIT_NAMES[u]}. Question 1 of 5.`);
  };

  const answer = (o: TopicLean) => {
    if (!unit || !pack) return;
    const next = [...answers, o];
    setAnswers(next);
    if (qi + 1 < questions.length) {
      setQi(qi + 1);
      setAnnounce(`Question ${qi + 2} of ${questions.length}.`);
      return;
    }
    const r = unitCompass(next, pack.topics.map((t) => t.id));
    const m = { ...mem, [unit]: { topic: r.topics[0].topic, concepts: r.concepts.map((c) => c.concept) } };
    setMem(m);
    saveCompass(m);
    setRedo(false);
    setAnswers([]);
    setQi(0);
    setAnnounce(`Your compass for ${UNIT_NAMES[unit]} points to ${topicOf(data, unit, r.topics[0].topic)?.name ?? 'a topic'}.`);
  };

  const pickRule = (i: number) => {
    if (!rule || ruleSolved || tried.includes(i)) return;
    const t = [...tried, i];
    setTried(t);
    if (rule.options[i].correct) {
      if (t.length === 1) setRulesRight((n) => n + 1);
      setAnnounce('Right.');
    } else {
      setAnnounce('Not quite. Read the feedback and try again.');
    }
  };

  const nextRule = () => {
    setTried([]);
    setRi(ri + 1);
  };

  const fromCompass = () => {
    const p = planFromCompass(mem);
    setPlan(p);
    savePlan(p);
    setChecked(null);
    setAnnounce('Your plan is filled in from your compass. You can change any part of it.');
  };

  const setRow = (i: number, part: Partial<PlanRow>) => {
    const p = plan.map((r, k) => (k === i ? { ...r, ...part } : r));
    setPlan(p);
    savePlan(p);
    setChecked(null);
  };

  const checkPlan = () => {
    const problems = planProblems(plan);
    setChecked(problems);
    setAnnounce(problems.length ? 'The plan breaks a rule. Read the feedback.' : 'Your plan meets the rules.');
  };

  const finish = () => {
    setDone(true);
    onComplete();
    if (trailWon(rulesRight, plan)) win(onGoal, 1);
  };

  if (done) {
    const won = trailWon(rulesRight, plan);
    return (
      <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
        <p style={{ margin: 0 }}>
          <strong>{won ? 'You have a plan for the trail!' : 'Plan saved.'}</strong> Trail rules right first time: {rulesRight} of {rules.length}.
        </p>
        {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[0]} stamp needs {RULES_GOAL} trail rules right first time. Play again: the rules come in a new order.</p>}
        <PlanSummary plan={plan} />
        <p class="small muted" style={{ margin: 0 }}>Your plan is saved in this browser only. It is a starting point: you can change it any time.</p>
        <div><button class="btn" onClick={again}>Play again</button></div>
      </div>
    );
  }

  const stage = explored.length === 0 ? 0 : ri < 0 ? Math.min(explored.length, 2) : !rulesDone ? 2 + ri : 2 + rules.length;
  const stageTotal = 3 + rules.length;

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1. {ri >= 0 ? `Trail rules right first time: ${rulesRight} (goal ${RULES_GOAL} of ${rules.length}).` : `Units explored: ${explored.length} of 3. There are no wrong answers in the questions.`}
      </p>
      <Trail at={stage} total={stageTotal} label={`Trail progress: stop ${stage + 1} of ${stageTotal + 1}.`} />
      <div class="play">
        <section class="panel stack" aria-labelledby="ia-int-h">
          <h3 id="ia-int-h"><StepNo n={2} /> Choose a unit and answer five questions</h3>
          <p class="small" style={{ margin: 0 }}>You write one commentary for each of Units 2, 3 and 4. Explore each unit to find a topic for it.</p>
          <div class="ia-units" role="group" aria-label="Choose a unit">
            {IA_UNITS.map((u) => (
              <button key={u} type="button" class={`ia-unit ${unit === u ? 'on' : ''}`} aria-pressed={unit === u} onClick={() => chooseUnit(u)}>
                <strong>Unit {u}</strong>
                <span class="small">{UNIT_NAMES[u].replace(/^Unit \d: /, '')}</span>
                {mem[u] && <span class="ia-unit-done small"><MarkIcon /> Explored</span>}
              </button>
            ))}
          </div>
          {asking && questions[qi] && (
            <div class="stack">
              <p class="small muted" style={{ margin: 0 }}>{UNIT_NAMES[unit!]}. Question {qi + 1} of {questions.length}.</p>
              <p style={{ margin: 0 }}><strong>{questions[qi].prompt}</strong></p>
              <div class="ia-options" role="group" aria-label={questions[qi].prompt}>
                {questions[qi].options.map((o, i) => (
                  <button key={`${qi}-${i}`} type="button" class="ia-option" onClick={() => answer(o)}>{o.text}</button>
                ))}
              </div>
            </div>
          )}
          <CompassRose unit={unit} />
        </section>

        {unit && found && !asking && (
          <section class="panel stack" aria-labelledby="ia-res-h">
            <h3 id="ia-res-h"><StepNo n={3} /> Read your compass for Unit {unit}</h3>
            <p style={{ margin: 0 }}>
              Your answers point to <strong>{topic?.name ?? 'a topic'}</strong>
              {topic && <span class="small muted"> ({topic.codes.join(', ')})</span>}. Your top key concepts:{' '}
              <strong>{found.concepts.slice(0, 3).map((c) => CONCEPT_NAMES[c]).join(', ') || 'none yet'}</strong>.
            </p>
            {topic && (
              <>
                <div>
                  <p style={{ margin: 0 }}><strong>Article ideas to search for:</strong></p>
                  <ul class="ia-ideas">{topic.ideas.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
                <p style={{ margin: 0 }}><strong>Diagram to plan for:</strong> {topic.diagram}.</p>
              </>
            )}
            {unit === 2 && (
              <div class="ia-strengths">
                <p style={{ margin: 0 }}><strong>Your strengths so far in Unit 2</strong> <span class="small muted">(from your Check it answers in this browser)</span></p>
                {strengths.some((s) => s.score !== null) ? (
                  <ul class="ia-strength-list">
                    {strengths.map((s) => (
                      <li key={s.theme.id}>
                        <span>{s.theme.name}</span>
                        {s.score === null ? (
                          <span class="small muted">Not enough answers yet</span>
                        ) : (
                          <span class="ia-meter" role="img" aria-label={`${s.score}% right`}>
                            <span class="ia-meter-fill" style={{ width: `${s.score}%` }} />
                            <span class="ia-meter-text">{s.score}%</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p class="small" style={{ margin: 0 }}>Play the Check it questions in a few Unit 2 games, then come back. Your strongest topics will show here.</p>
                )}
                {strengths[0]?.score !== null && strengths[0] && (
                  <p class="small" style={{ margin: 0 }}><strong>Idea from your strengths:</strong> {strengths[0].theme.idea}</p>
                )}
              </div>
            )}
            <div class="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button type="button" class="btn btn-secondary" onClick={() => { setRedo(true); setQi(0); setAnswers([]); }}>Answer again</button>
              {explored.length < 3 && (
                <button type="button" class="btn btn-secondary" onClick={() => chooseUnit(IA_UNITS.find((u) => !mem[u])!)}>
                  Explore Unit {IA_UNITS.find((u) => !mem[u])} next
                </button>
              )}
              {ri < 0 && <button class="btn" onClick={nextRule}>Go on to the trail rules</button>}
            </div>
            {ri < 0 && explored.length < 3 && (
              <p class="small muted" style={{ margin: 0 }}>Tip: explore all three units before you make your plan. You can also come back to the others later.</p>
            )}
          </section>
        )}
      </div>

      {rule && (
        <section class="panel stack" aria-labelledby="ia-rule-h">
          <h3 id="ia-rule-h"><StepNo n={4} /> Check the trail rules</h3>
          <p class="small muted" style={{ margin: 0 }}>Rule {ri + 1} of {rules.length}.</p>
          <p style={{ margin: 0 }}><span aria-hidden="true">{rule.icon} </span>{rule.text}</p>
          <OptionButtons options={rule.options} tried={tried} solved={ruleSolved} teacher={teacher} onPick={pickRule} label="Answers" />
          {tried.length > 0 && <Fb ok={ruleSolved}>{rule.options[tried[tried.length - 1]].feedback}</Fb>}
          {ruleSolved && <div><button class="btn" onClick={nextRule}>{ri + 1 < rules.length ? 'Next rule' : 'Make my plan'}</button></div>}
        </section>
      )}

      {rulesDone && (
        <section class="panel stack" aria-labelledby="ia-plan-h">
          <h3 id="ia-plan-h"><StepNo n={5} /> Make your portfolio plan</h3>
          <p style={{ margin: 0 }}>Choose a unit and a key concept for each commentary. You can fill it in from your compass, then change it.</p>
          <div><button type="button" class="btn btn-ghost" onClick={fromCompass}>Fill in from my compass</button></div>
          <div class="ia-plan">
            {plan.map((row, i) => (
              <fieldset key={i} class="ia-plan-row">
                <legend>Commentary {i + 1}</legend>
                <label>
                  <span class="small">Unit</span>
                  <select value={row.unit ?? ''} onChange={(e) => setRow(i, { unit: Number((e.target as HTMLSelectElement).value) as Unit })}>
                    <option value="" disabled>Choose a unit</option>
                    {([1, 2, 3, 4] as Unit[]).map((u) => <option key={u} value={u}>{UNIT_NAMES[u]}</option>)}
                  </select>
                </label>
                <label>
                  <span class="small">Key concept</span>
                  <select value={row.concept ?? ''} onChange={(e) => setRow(i, { concept: (e.target as HTMLSelectElement).value as Concept })}>
                    <option value="" disabled>Choose a key concept</option>
                    {CONCEPTS.map((c) => <option key={c} value={c}>{CONCEPT_NAMES[c]}</option>)}
                  </select>
                </label>
                {row.unit && row.unit !== 1 && mem[row.unit] && (
                  <p class="small ia-plan-hint">Topic idea from your compass: {topicOf(data, row.unit, mem[row.unit]!.topic)?.name}</p>
                )}
              </fieldset>
            ))}
          </div>
          <div><button class="btn" onClick={checkPlan}>Check my plan</button></div>
          {checked && checked.length > 0 && (
            <div class="callout callout-try" role="status">
              <ul style={{ margin: 0 }}>{checked.map((p) => <li key={p}>{PROBLEM_TEXT[p]}</li>)}</ul>
            </div>
          )}
          {checked && checked.length === 0 && (
            <>
              <Fb ok>Your plan meets the rules: three different units and three different key concepts. Remember: three different sources, each article published within a year, and at most 800 words each.</Fb>
              <div><button class="btn" onClick={finish}>Finish</button></div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function PlanSummary(props: { plan: PlanRow[] }) {
  return (
    <ol class="ia-plan-summary">
      {props.plan.map((r, i) => (
        <li key={i}>
          {r.unit ? UNIT_NAMES[r.unit] : 'No unit yet'}, key concept: {r.concept ? CONCEPT_NAMES[r.concept] : 'not chosen yet'}
        </li>
      ))}
    </ol>
  );
}

// ---------------- Level 2: the article scout ----------------

const SOURCE_ICON: Record<string, string> = { newspaper: '📰', online: '💻', journal: '📘', tv: '📺', radio: '📻' };

function ageText(months: number) {
  return months === 1 ? '1 month before you write' : `${months} months before you write`;
}

function Clipping(props: { a: Article }) {
  const a = props.a;
  return (
    <article class="ia-clip" aria-label={`Article: ${a.headline}`}>
      <p class="ia-clip-meta small">
        <span aria-hidden="true">{SOURCE_ICON[a.source]} </span>{a.sourceName}. Published {ageText(a.ageMonths)}.
      </p>
      <p class="ia-clip-head"><span aria-hidden="true">{a.icon} </span>{a.headline}</p>
      <p style={{ margin: 0 }}>{a.summary}</p>
    </article>
  );
}

type Keep = 'keep' | 'leave';

function ScoutLevel({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const items = useMemo(() => drawRound(data.articles, SCOUT_DRAW, seed + 5), [data.articles, seed]);
  const max = items.length * 2;
  const [idx, setIdx] = useState(0);
  const [keepTried, setKeepTried] = useState<Keep[]>([]);
  const [twoTried, setTwoTried] = useState<string[]>([]);
  const [points, setPoints] = useState(0);
  const [kept, setKept] = useState<string[]>([]);
  const [left, setLeft] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');

  const a = items[idx];
  const reason = leaveReason(a);
  const rightKeep: Keep = reason ? 'leave' : 'keep';
  const keepSolved = keepTried.includes(rightKeep);
  const rightTwo = reason ?? String(a.unit);
  const twoSolved = twoTried.includes(rightTwo);
  const reasons = useMemo(() => shuffled(LEAVE_REASONS, seed + idx * 5 + 1), [seed, idx]);

  const pickKeep = (k: Keep) => {
    if (keepSolved || keepTried.includes(k)) return;
    const t = [...keepTried, k];
    setKeepTried(t);
    if (k === rightKeep) {
      reportAnswer(t.length === 1);
      if (t.length === 1) setPoints((p) => p + 1);
      setAnnounce(k === 'keep' ? 'Right: it is a good pick. Which unit is it?' : 'Right: leave it. Why?');
    } else setAnnounce('Not this time. Check the source, the date, who chose it and the economics.');
  };

  const pickTwo = (v: string) => {
    if (twoSolved || twoTried.includes(v)) return;
    const t = [...twoTried, v];
    setTwoTried(t);
    if (v === rightTwo) {
      reportAnswer(t.length === 1);
      if (t.length === 1) setPoints((p) => p + 1);
      if (rightKeep === 'keep') setKept((k) => [...k, a.icon]);
      else setLeft((l) => [...l, a.icon]);
      setAnnounce('Right.');
    } else setAnnounce('Not quite. Try again.');
  };

  const next = () => {
    setKeepTried([]);
    setTwoTried([]);
    if (idx + 1 < items.length) setIdx(idx + 1);
    else {
      setDone(true);
      onComplete();
      if (scoutWon(points)) win(onGoal, 2);
    }
  };

  if (done) {
    const won = scoutWon(points);
    return (
      <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
        <p style={{ margin: 0 }}>
          <strong>{won ? 'Sharp scouting!' : 'Scouting done.'}</strong> First-try points: {points} of {max}.
        </p>
        {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[1]} stamp needs {SCOUT_GOAL} first-try points. Play again: you get a new mix of articles.</p>}
        <div><button class="btn" onClick={again}>Play again</button></div>
      </div>
    );
  }

  const wrongKeep = keepTried.length > 0 && !keepSolved;
  const lastTwo = twoTried[twoTried.length - 1];

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2. Article {idx + 1} of {items.length}. First-try points: {points} of {max} (goal {SCOUT_GOAL}).
      </p>
      <Trail at={idx} total={items.length} label={`Article ${idx + 1} of ${items.length}.`} />
      <div class="play">
        <section class="panel stack" aria-labelledby="ia-clip-h">
          <h3 id="ia-clip-h"><StepNo n={2} /> Read the article details</h3>
          <Clipping a={a} />
          <div class="ia-pack">
            <p class="small" style={{ margin: 0 }}><span aria-hidden="true">🎒 </span>In your backpack: {kept.length ? <span aria-hidden="true">{kept.join(' ')}</span> : 'nothing yet'}<span class="sr-only">{kept.length} articles</span></p>
            <p class="small" style={{ margin: 0 }}><span aria-hidden="true">🪨 </span>Left on the trail: {left.length ? <span aria-hidden="true">{left.join(' ')}</span> : 'nothing yet'}<span class="sr-only">{left.length} articles</span></p>
          </div>
        </section>
        <div class="stack">
          <section class="panel stack" aria-labelledby="ia-keep-h">
            <h3 id="ia-keep-h"><StepNo n={3} /> Keep it for your IA, or leave it?</h3>
            <div class="ia-options ia-two" role="group" aria-label="Keep or leave">
              {(['keep', 'leave'] as Keep[]).map((k) => (
                <button key={k} type="button"
                  class={`ia-option ${keepTried.includes(k) && k !== rightKeep ? 'ia-option-wrong' : ''} ${keepSolved && k === rightKeep ? 'ia-option-right' : ''}`}
                  disabled={keepSolved || keepTried.includes(k)} onClick={() => pickKeep(k)}>
                  <span>{k === 'keep' ? '🎒 Keep it' : '🪨 Leave it'}</span>
                  {teacher && k === rightKeep && !keepSolved && <span class="badge badge-done">Answer</span>}
                </button>
              ))}
            </div>
            {wrongKeep && <Fb ok={false}>Not this time. Check four things: the source, the date, who chose it, and whether there is theory from Units 2 to 4 to apply.</Fb>}
          </section>
          {keepSolved && (
            <section class="panel stack" aria-labelledby="ia-two-h">
              <h3 id="ia-two-h"><StepNo n={4} /> {rightKeep === 'keep' ? 'Which unit is it?' : 'Why leave it?'}</h3>
              <div class="ia-options" role="group" aria-label={rightKeep === 'keep' ? 'Units' : 'Reasons'}>
                {(rightKeep === 'keep' ? IA_UNITS.map(String) : (reasons as string[])).map((v) => (
                  <button key={v} type="button"
                    class={`ia-option ${twoTried.includes(v) && v !== rightTwo ? 'ia-option-wrong' : ''} ${twoSolved && v === rightTwo ? 'ia-option-right' : ''}`}
                    disabled={twoSolved || twoTried.includes(v)} onClick={() => pickTwo(v)}>
                    <span>{rightKeep === 'keep' ? UNIT_NAMES[Number(v) as Unit] : data.reasonNames[v as LeaveReason]}</span>
                    {teacher && v === rightTwo && !twoSolved && <span class="badge badge-done">Answer</span>}
                  </button>
                ))}
              </div>
              {lastTwo && !twoSolved && <Fb ok={false}>Not quite. {rightKeep === 'keep' ? 'Is it about one market, the whole economy, or trade between countries?' : 'Which rule does this article break?'}</Fb>}
              {twoSolved && (
                <>
                  <Fb ok>{a.why}</Fb>
                  <div><button class="btn" onClick={next}>{idx + 1 < items.length ? 'Next article' : 'Finish'}</button></div>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Level 3: lens and diagram ----------------

function LensLevel({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const items = useMemo(
    () => drawRound(data.lenses, LENS_DRAW, seed + 9).map((l, i) => ({ ...l, diagrams: shuffled(l.diagrams, seed + i * 3 + 1), links: shuffled(l.links, seed + i * 3 + 2) })),
    [data.lenses, seed],
  );
  const max = items.length * 2;
  const [idx, setIdx] = useState(0);
  const [dTried, setDTried] = useState<number[]>([]);
  const [kTried, setKTried] = useState<number[]>([]);
  const [points, setPoints] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');

  const l = items[idx];
  const dSolved = dTried.some((i) => l.diagrams[i].correct);
  const kSolved = kTried.some((i) => l.links[i].correct);

  const pick = (which: 'd' | 'k', i: number) => {
    const opts = which === 'd' ? l.diagrams : l.links;
    const tried = which === 'd' ? dTried : kTried;
    const solved = which === 'd' ? dSolved : kSolved;
    if (solved || tried.includes(i)) return;
    const t = [...tried, i];
    (which === 'd' ? setDTried : setKTried)(t);
    if (opts[i].correct) {
      reportAnswer(t.length === 1);
      if (t.length === 1) setPoints((p) => p + 1);
      setAnnounce('Right.');
    } else setAnnounce('Not quite. Read the feedback and try again.');
  };

  const next = () => {
    setDTried([]);
    setKTried([]);
    if (idx + 1 < items.length) setIdx(idx + 1);
    else {
      setDone(true);
      onComplete();
      if (lensWon(points)) win(onGoal, 3);
    }
  };

  if (done) {
    const won = lensWon(points);
    return (
      <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
        <p style={{ margin: 0 }}>
          <strong>{won ? 'Every article is in focus!' : 'Trail finished.'}</strong> First-try points: {points} of {max}.
        </p>
        {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[2]} stamp needs {LENS_GOAL} first-try points. Play again: you get a new mix of articles.</p>}
        <div><button class="btn" onClick={again}>Play again</button></div>
      </div>
    );
  }

  const lastD = dTried[dTried.length - 1];
  const lastK = kTried[kTried.length - 1];

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3. Article {idx + 1} of {items.length}. First-try points: {points} of {max} (goal {LENS_GOAL}).
      </p>
      <Trail at={idx} total={items.length} label={`Article ${idx + 1} of ${items.length}.`} />
      <section class="panel stack" aria-labelledby="ia-lens-h">
        <h3 id="ia-lens-h"><StepNo n={2} /> Read the Unit 2 article</h3>
        <div class="ia-clip">
          <p class="ia-clip-head"><span aria-hidden="true">{l.icon} </span>{l.headline}</p>
          <p style={{ margin: 0 }}>{l.summary}</p>
        </div>
      </section>
      <section class="panel stack" aria-labelledby="ia-diag-h">
        <h3 id="ia-diag-h"><StepNo n={3} /> Choose the diagram that fits (criterion A)</h3>
        <OptionButtons options={l.diagrams} tried={dTried} solved={dSolved} teacher={teacher} onPick={(i) => pick('d', i)} label="Diagrams" />
        {lastD !== undefined && <Fb ok={dSolved}>{l.diagrams[lastD].feedback}</Fb>}
      </section>
      {dSolved && (
        <section class="panel stack" aria-labelledby="ia-link-h">
          <h3 id="ia-link-h"><StepNo n={4} /> Key concept: {CONCEPT_NAMES[l.concept]}. Which link would earn full marks (criterion D)?</h3>
          <OptionButtons options={l.links} tried={kTried} solved={kSolved} teacher={teacher} onPick={(i) => pick('k', i)} label="Key concept links" />
          {lastK !== undefined && <Fb ok={kSolved}>{l.links[lastK].feedback}</Fb>}
          {kSolved && <div><button class="btn" onClick={next}>{idx + 1 < items.length ? 'Next article' : 'Finish'}</button></div>}
        </section>
      )}
    </div>
  );
}

// ---------------- Learn it ----------------

function LearnDiagram() {
  const stops = [
    { unit: 'Unit 2', what: 'Microeconomics', concept: 'Key concept 1', icon: '🏕️' },
    { unit: 'Unit 3', what: 'Macroeconomics', concept: 'Key concept 2', icon: '🏕️' },
    { unit: 'Unit 4', what: 'The global economy', concept: 'Key concept 3', icon: '🏕️' },
  ];
  return (
    <div class="ia-learn" role="img" aria-label="A trail with three camps. Camp 1: a commentary on Unit 2 with key concept 1. Camp 2: Unit 3 with key concept 2. Camp 3: Unit 4 with key concept 3. Each camp has a different article source, published within a year, at most 800 words.">
      {stops.map((s, i) => (
        <div key={s.unit} class="ia-learn-stop" aria-hidden="true">
          <span class="ia-learn-icon">{s.icon}</span>
          <strong>Commentary {i + 1}</strong>
          <span>{s.unit}: {s.what}</span>
          <span class="ia-learn-flag">{s.concept}</span>
          <span class="small muted">Source {i + 1}, within a year, at most 800 words</span>
        </div>
      ))}
    </div>
  );
}

export { Try, LearnDiagram };
