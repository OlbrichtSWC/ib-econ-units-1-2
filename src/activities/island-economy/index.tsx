/**
 * Castaway Council (1.1): the class is shipwrecked on an island.
 *
 * Level 1: things wash ashore one at a time; sort each into a factor of production or a free good.
 * Then rank four village projects and name the opportunity cost.
 * Level 2: answer what, how and for whom the way each economic system does; each answer builds the village.
 * Level 3: a detective game: read clues and name the economic system.
 */
import { useMemo, useState } from 'preact/hooks';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon, StepNo } from '../../shared/design/components';
import { SpecDiagram } from '../../shared/diagrams/SpecDiagram';
import type { DiagramSpec } from '../../shared/diagrams/SpecDiagram';
import type { TryProps } from '../../shared/activity/types';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import type { LevelInfo } from '../../shared/activity/LevelPicker';
import { celebrate } from '../../shared/fun/celebrate';
import {
  BEACH_GOAL, beachWon, DETECTIVE_GOAL, detectiveWon, Factor, FACTORS, opportunityCost, Question, QUESTIONS, shuffled, System, SYSTEMS, VILLAGE_GOAL,
  villageWon,
} from './model';
import './island.css';

const STAMP_NAMES = ['Beachcomber', 'Village Builder', 'System Detective'];

interface Item { id: string; icon: string; name: string; text: string; factor: Factor; why: string }
interface Village { system: System; name: string; icon: string; story: string; strength: string; weakness: string }
interface Case { id: string; answer: System; clues: string[]; explain: string }

interface TryContent {
  levels: LevelInfo[];
  factorNames: Record<Factor, string>;
  factorHints: Record<Factor, string>;
  items: Item[];
  projects: { id: string; icon: string; name: string }[];
  projectStory: string;
  costFeedback: { right: string; both: string; last: string; none: string };
  villages: Village[];
  answers: Record<Question, Record<System, string>>;
  questionText: Record<Question, string>;
  villageWrong: string;
  systemNames: Record<System, string>;
  cases: Case[];
}

const FACTOR_ICON: Record<Factor, string> = { land: '🌿', labour: '💪', capital: '🛠️', enterprise: '💡', free: '🌤️' };

/** A nudge when a find goes in the wrong basket: what the chosen basket means. */
const WRONG_HINT: Record<Factor, string> = {
  land: 'Land means natural resources. Did this come from nature, untouched by people?',
  labour: 'Labour means human effort. Is this a person working?',
  capital: 'Capital means man-made goods used to make other goods. Was this made by people, to help produce something?',
  enterprise: 'Entrepreneurship means organising the other factors and taking a risk. Is someone starting a business here?',
  free: 'A free good has no opportunity cost. Does using this take anything away from anyone else?',
};

/** Buildings that appear in each village as the questions are answered. */
const BUILDINGS: Record<System, string[]> = {
  market: ['🏪', '🏭', '🛍️'],
  planned: ['📋', '🏭', '🎟️'],
  mixed: ['🏪', '🏥', '🏫'],
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
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="hut" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <Beach key={round} seed={round} {...props} />}
      {levelNo === 2 && <Villages key={round} seed={round} {...props} />}
      {levelNo === 3 && <Detective key={round} seed={round} {...props} />}
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

// ---------------- Level 1: the beach ----------------

type BeachPhase = 'sort' | 'rank' | 'cost' | 'done';

function Beach({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const items = useMemo(() => shuffled(data.items, seed + 3), [data.items, seed]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<BeachPhase>('sort');
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [wrongPick, setWrongPick] = useState<Factor | null>(null);
  const [firstRight, setFirstRight] = useState(0);
  const [piles, setPiles] = useState<Record<Factor, string[]>>({ land: [], labour: [], capital: [], enterprise: [], free: [] });
  const [ranking, setRanking] = useState<string[]>([]);
  const [costPick, setCostPick] = useState<string | null>(null);
  const [costRight, setCostRight] = useState<boolean | null>(null);
  const [announce, setAnnounce] = useState('');
  const item = items[idx];
  const goal = Math.min(BEACH_GOAL, items.length);

  const sort = (f: Factor) => {
    if (solved || phase !== 'sort') return;
    if (f === item.factor) {
      setSolved(true);
      setWrongPick(null);
      if (!missed) setFirstRight((n) => n + 1);
      setPiles({ ...piles, [f]: [...piles[f], item.icon] });
      setAnnounce(`Right: ${data.factorNames[f]}.`);
    } else {
      setMissed(true);
      setWrongPick(f);
      setAnnounce(`Not ${data.factorNames[f]}. ${WRONG_HINT[f]}`);
    }
  };

  const next = () => {
    setSolved(false);
    setMissed(false);
    setWrongPick(null);
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setAnnounce('Something new washes ashore.');
    } else {
      setPhase('rank');
      setAnnounce('Everything is sorted. Now rank the council projects.');
    }
  };

  const rank = (id: string) => {
    if (ranking.includes(id)) return;
    const r = [...ranking, id];
    setRanking(r);
    if (r.length === data.projects.length) {
      setPhase('cost');
      setAnnounce('Ranking done. Now name the opportunity cost.');
    }
  };

  const nameOf = (id: string) => data.projects.find((p) => p.id === id)?.name ?? '';
  const cost = opportunityCost(ranking, 2);
  const costOptions = ranking.length === data.projects.length
    ? [
        { id: 'next', text: nameOf(ranking[2]) },
        { id: 'last', text: nameOf(ranking[3]) },
        { id: 'both', text: `Both ${nameOf(ranking[2]).toLowerCase()} and ${nameOf(ranking[3]).toLowerCase()}` },
        { id: 'none', text: 'Nothing: the council chose what it wanted most' },
      ]
    : [];

  const chooseCost = (id: string) => {
    if (costRight === true) return;
    setCostPick(id);
    const ok = id === 'next';
    if (costRight === null) setCostRight(ok);
    if (ok) {
      setPhase('done');
      onComplete();
      const won = beachWon(firstRight, costRight === null ? true : costRight, goal);
      if (won) win(onGoal, 1);
      setAnnounce(won ? 'Level complete. You earned the Beachcomber stamp.' : 'Level finished.');
    } else setAnnounce('Not quite. Read the feedback and try again.');
  };

  const costFb = costPick ? (costPick === 'next' ? data.costFeedback.right : data.costFeedback[costPick as 'both' | 'last' | 'none']) : '';
  const wonLevel = phase === 'done' && beachWon(firstRight, costRight === true, goal);

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1. Find {Math.min(idx + 1, items.length)} of {items.length}. Right first time: {firstRight} (goal {goal}).
      </p>
      {phase === 'sort' && (
        <>
          <section class="panel stack" aria-labelledby="ie-find-h">
            <h3 id="ie-find-h"><StepNo n={2} /> What washed ashore?</h3>
            <div class="ie-beach" aria-hidden="true">
              <div class="ie-sky" />
              <div class="ie-sea"><span class="ie-wave" /><span class="ie-wave ie-wave2" /></div>
              <div class="ie-sand" />
              <div key={item.id} class={`ie-find ${solved ? 'ie-fly' : 'ie-wash'}`}>
                <span class="ie-find-icon">{item.icon}</span>
              </div>
            </div>
            <div class="ie-find-card">
              <p style={{ margin: 0 }}><strong>{item.name}.</strong> {item.text}</p>
            </div>
          </section>
          <section class="panel stack" aria-labelledby="ie-sort-h">
            <h3 id="ie-sort-h"><StepNo n={3} /> Put it in the right basket</h3>
            <div class="ie-baskets" role="group" aria-label="Baskets">
              {FACTORS.map((f) => (
                <button
                  key={f}
                  type="button"
                  class={`ie-basket ${wrongPick === f ? 'shake' : ''} ${solved && item.factor === f ? 'ie-basket-right' : ''}`}
                  disabled={solved}
                  onClick={() => sort(f)}
                >
                  <span class="ie-basket-icon" aria-hidden="true">{FACTOR_ICON[f]}</span>
                  <strong>{data.factorNames[f]}</strong>
                  <span class="small">{data.factorHints[f]}</span>
                  <span class="ie-pile" aria-label={`${piles[f].length} sorted`}>{piles[f].join(' ')}</span>
                  {teacher && item.factor === f && !solved && <span class="badge badge-done">Answer</span>}
                </button>
              ))}
            </div>
            {wrongPick && !solved && (
              <div class="callout callout-try" role="status">
                <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                  <CrossIcon /> <span>Not {data.factorNames[wrongPick].toLowerCase()}. {WRONG_HINT[wrongPick]}</span>
                </p>
              </div>
            )}
            {solved && (
              <div class="callout callout-ok" role="status">
                <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                  <MarkIcon /> <span><strong>{data.factorNames[item.factor]}.</strong> <Md text={item.why} inline /></span>
                </p>
                <div style={{ marginTop: 8 }}>
                  <button class="btn" onClick={next}>{idx + 1 < items.length ? 'Next find' : 'Go to the council meeting'}</button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {(phase === 'rank' || phase === 'cost' || phase === 'done') && (
        <section class="panel stack" aria-labelledby="ie-council-h">
          <h3 id="ie-council-h"><StepNo n={2} /> The council meeting</h3>
          <Md text={data.projectStory} />
          <div class="ie-projects" role="group" aria-label="Projects, tap in order">
            {data.projects.map((p) => {
              const n = ranking.indexOf(p.id);
              return (
                <button key={p.id} type="button" class={`ie-project ${n >= 0 ? 'on' : ''} ${n >= 0 && n < 2 ? 'ie-built' : ''}`} disabled={n >= 0 || phase !== 'rank'} onClick={() => rank(p.id)}>
                  <span class="ie-project-icon" aria-hidden="true">{p.icon}</span>
                  <strong>{p.name}</strong>
                  <span class="small">{n >= 0 ? `Choice ${n + 1}${n < 2 ? ': built' : ': not built'}` : 'Tap to rank'}</span>
                </button>
              );
            })}
          </div>
          {phase === 'rank' && ranking.length > 0 && (
            <div>
              <button class="btn btn-quiet btn-sm" onClick={() => setRanking([])}>Start the ranking again</button>
            </div>
          )}
        </section>
      )}

      {(phase === 'cost' || phase === 'done') && cost && (
        <section class="panel stack" aria-labelledby="ie-cost-h">
          <h3 id="ie-cost-h"><StepNo n={3} /> Name the opportunity cost</h3>
          <p style={{ margin: 0 }}>
            The council builds <strong>{nameOf(ranking[0]).toLowerCase()}</strong> and <strong>{nameOf(ranking[1]).toLowerCase()}</strong>. What is the opportunity cost of this choice?
          </p>
          <div class="choice-grid" role="group" aria-label="Opportunity cost">
            {costOptions.map((o) => (
              <button key={o.id} type="button" class={`choice-btn ${costPick === o.id ? 'chosen' : ''}`} aria-pressed={costPick === o.id} disabled={phase === 'done'} onClick={() => chooseCost(o.id)}>
                {o.text}
                {teacher && o.id === 'next' && phase !== 'done' && <span class="badge badge-done">Answer</span>}
              </button>
            ))}
          </div>
          {costPick && (
            <div class={`callout ${costPick === 'next' ? 'callout-ok' : 'callout-try'}`} role="status">
              <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                {costPick === 'next' ? <MarkIcon /> : <CrossIcon />} <span><Md text={costFb} inline /></span>
              </p>
            </div>
          )}
        </section>
      )}

      {phase === 'done' && (
        <div class={`callout ${wonLevel ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{wonLevel ? 'Level complete!' : 'Level finished.'}</strong> You sorted {firstRight} of {items.length} finds right first time
            {costRight ? ' and named the opportunity cost first time.' : '. The opportunity cost needed another try.'}
          </p>
          {!wonLevel && <p style={{ margin: 0 }}>The {STAMP_NAMES[0]} stamp needs {goal} finds right first time and the opportunity cost right first time. Play again: the finds come in a new order.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      )}
    </div>
  );
}

// ---------------- Level 2: three villages ----------------

function Villages({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const [v, setV] = useState(0);
  const [qi, setQi] = useState(0);
  const [missed, setMissed] = useState(false);
  const [wrong, setWrong] = useState<System | null>(null);
  const [solved, setSolved] = useState(false);
  const [firstRight, setFirstRight] = useState(0);
  const [built, setBuilt] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const village = data.villages[v];
  const q = QUESTIONS[qi];
  const options = useMemo(() => shuffled(SYSTEMS, seed * 7 + v * 3 + qi), [seed, v, qi]);
  const villageName = (s: System) => data.villages.find((x) => x.system === s)?.name ?? '';
  const villageDone = qi === QUESTIONS.length - 1 && solved;

  const answer = (s: System) => {
    if (solved) return;
    if (s === village.system) {
      setSolved(true);
      setWrong(null);
      setBuilt((b) => b + 1);
      if (!missed) setFirstRight((n) => n + 1);
      setAnnounce('Right. A new building goes up.');
    } else {
      setMissed(true);
      setWrong(s);
      setAnnounce(`Not this one. That is how ${villageName(s)} answers it.`);
    }
  };

  const next = () => {
    setSolved(false);
    setMissed(false);
    setWrong(null);
    if (qi + 1 < QUESTIONS.length) {
      setQi(qi + 1);
      return;
    }
    if (v + 1 < data.villages.length) {
      setV(v + 1);
      setQi(0);
      setBuilt(0);
      setAnnounce(`You sail to ${data.villages[v + 1].name}.`);
      return;
    }
    setDone(true);
    onComplete();
    if (villageWon(firstRight)) win(onGoal, 2);
  };

  if (done) {
    const won = villageWon(firstRight);
    return (
      <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
        <p style={{ margin: 0 }}>
          <strong>{won ? 'All three villages are built!' : 'All three villages visited.'}</strong> Right first time: {firstRight} of 9.
        </p>
        {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[1]} stamp needs {VILLAGE_GOAL} of 9 right first time. Try again.</p>}
        <div><button class="btn" onClick={again}>Play again</button></div>
      </div>
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2. Village {v + 1} of 3, question {qi + 1} of 3. Right first time: {firstRight} (goal {VILLAGE_GOAL} of 9).
      </p>
      <div class="play">
        <section class="panel stack" aria-labelledby="ie-village-h">
          <h3 id="ie-village-h"><StepNo n={2} /> <span aria-hidden="true">{village.icon}</span> {village.name}</h3>
          <Md text={village.story} />
          <div class={`ie-village ie-village-${village.system}`} aria-label={`${built} of 3 buildings built`} role="img">
            <div class="ie-village-sky" aria-hidden="true">☁️</div>
            <div class="ie-village-row" aria-hidden="true">
              {BUILDINGS[village.system].map((b, i) => (
                <span key={i} class={`ie-building ${i < built ? 'ie-pop' : 'ie-plot'}`}>{i < built ? b : '·'}</span>
              ))}
            </div>
          </div>
          {villageDone && (
            <div class="callout stack">
              <Md text={village.strength} />
              <Md text={village.weakness} />
            </div>
          )}
        </section>
        <section class="panel stack" aria-labelledby="ie-q-h">
          <h3 id="ie-q-h"><StepNo n={3} /> <Md text={data.questionText[q].replace('{village}', village.name)} inline /></h3>
          <div class="stack" role="group" aria-label="Choose an answer">
            {options.map((s) => (
              <button
                key={s}
                type="button"
                class={`choice-btn ${wrong === s ? 'shake' : ''} ${solved && s === village.system ? 'choice-right' : ''}`}
                disabled={solved}
                onClick={() => answer(s)}
              >
                {data.answers[q][s]}
                {teacher && s === village.system && !solved && <span class="badge badge-done">Answer</span>}
              </button>
            ))}
          </div>
          {wrong && !solved && (
            <div class="callout callout-try" role="status">
              <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                <CrossIcon /> <span>{data.villageWrong.replace('{other}', villageName(wrong)).replace('{village}', village.name)}</span>
              </p>
            </div>
          )}
          {solved && (
            <div>
              <button class="btn" onClick={next}>
                {!villageDone ? 'Next question' : v + 1 < data.villages.length ? 'Sail to the next village' : 'See how you did'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------- Level 3: system detective ----------------

function Detective({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const cases = useMemo(() => shuffled(data.cases, seed + 11), [data.cases, seed]);
  const [ci, setCi] = useState(0);
  const [shown, setShown] = useState(1);
  const [missed, setMissed] = useState(false);
  const [wrong, setWrong] = useState<System | null>(null);
  const [solved, setSolved] = useState(false);
  const [firstRight, setFirstRight] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const c = cases[ci];

  const guess = (s: System) => {
    if (solved) return;
    if (s === c.answer) {
      setSolved(true);
      setWrong(null);
      if (!missed) setFirstRight((n) => n + 1);
      setShown(c.clues.length);
      setAnnounce(`Case solved: ${data.systemNames[s]}.`);
    } else {
      setMissed(true);
      setWrong(s);
      if (shown < c.clues.length) setShown(shown + 1);
      setAnnounce('Not this system. A new clue appears.');
    }
  };

  const next = () => {
    setSolved(false);
    setMissed(false);
    setWrong(null);
    setShown(1);
    if (ci + 1 < cases.length) setCi(ci + 1);
    else {
      setDone(true);
      onComplete();
      if (detectiveWon(firstRight)) win(onGoal, 3);
    }
  };

  if (done) {
    const won = detectiveWon(firstRight);
    return (
      <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
        <p style={{ margin: 0 }}>
          <strong>{won ? 'Every case closed!' : 'All cases done.'}</strong> Solved with your first guess: {firstRight} of {cases.length}.
        </p>
        {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[2]} stamp needs {DETECTIVE_GOAL} first-guess solves. Try again: the cases come in a new order.</p>}
        <div><button class="btn" onClick={again}>Play again</button></div>
      </div>
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3. Case {ci + 1} of {cases.length}. First-guess solves: {firstRight} (goal {DETECTIVE_GOAL}).
      </p>
      <div class="play">
        <section class="panel stack ie-notebook" aria-labelledby="ie-case-h">
          <h3 id="ie-case-h"><StepNo n={2} /> Case file {ci + 1}: read the clues</h3>
          <ol class="ie-clues">
            {c.clues.slice(0, shown).map((clue, i) => (
              <li key={`${c.id}-${i}`} class="ie-clue">{clue}</li>
            ))}
          </ol>
          {!solved && (
            <div>
              <button class="btn btn-secondary btn-sm" disabled={shown >= c.clues.length} onClick={() => { setShown(shown + 1); }}>
                {shown >= c.clues.length ? 'No more clues' : 'Show another clue'}
              </button>
            </div>
          )}
        </section>
        <section class="panel stack" aria-labelledby="ie-verdict-h">
          <h3 id="ie-verdict-h"><StepNo n={3} /> Your verdict</h3>
          <p style={{ margin: 0 }}>Which economic system is this?</p>
          <div class="stack" role="group" aria-label="Economic system">
            {SYSTEMS.map((s) => (
              <button key={s} type="button" class={`choice-btn ${wrong === s ? 'shake' : ''} ${solved && s === c.answer ? 'choice-right' : ''}`} disabled={solved} onClick={() => guess(s)}>
                {data.systemNames[s]}
                {teacher && s === c.answer && !solved && <span class="badge badge-done">Answer</span>}
              </button>
            ))}
          </div>
          {wrong && !solved && (
            <div class="callout callout-try" role="status">
              <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                <CrossIcon /> <span>Not a {data.systemNames[wrong].toLowerCase()}. Who owns the resources, and who decides? Read the new clue.</span>
              </p>
            </div>
          )}
          {solved && (
            <div class="callout callout-ok stack" role="status">
              <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                <MarkIcon /> <span><Md text={c.explain} inline /></span>
              </p>
              <div><button class="btn" onClick={next}>{ci + 1 < cases.length ? 'Next case' : 'Close the case files'}</button></div>
            </div>
          )}
        </section>
      </div>
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
  title: 'The problem of choice',
  description: 'Unlimited wants and limited resources (land, labour, capital and entrepreneurship) lead to scarcity. Scarcity forces a choice, and every choice has an opportunity cost.',
  boxes: [
    { at: { q: 14, p: 46 }, w: 24, h: 12, text: 'Unlimited wants' },
    { at: { q: 14, p: 14 }, w: 24, h: 12, text: 'Limited resources' },
    { at: { q: 45, p: 30 }, w: 18, h: 12, text: 'Scarcity' },
    { at: { q: 68, p: 30 }, w: 16, h: 12, text: 'Choice' },
    { at: { q: 90, p: 30 }, w: 18, h: 12, text: 'Opp. cost' },
  ],
  arrows: [
    { from: { q: 27, p: 44 }, to: { q: 35, p: 34 } },
    { from: { q: 27, p: 16 }, to: { q: 35, p: 26 } },
    { from: { q: 55, p: 30 }, to: { q: 59, p: 30 } },
    { from: { q: 77, p: 30 }, to: { q: 80, p: 30 } },
  ],
  texts: [{ at: { q: 14, p: 3 }, text: 'land, labour, capital, entrepreneurship', anchor: 'middle' }],
};

function LearnDiagram() {
  return <SpecDiagram spec={LEARN_SPEC} />;
}

export { Try, LearnDiagram };
