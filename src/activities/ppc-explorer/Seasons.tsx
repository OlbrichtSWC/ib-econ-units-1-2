/**
 * Four seasons: plan Pinewood Island's year. Each season has three steps:
 *   1. an event changes the island (predict its effect on the PPC first),
 *   2. the student puts each islander in a job to meet the season's need for fish and timber,
 *   3. a short opportunity cost question.
 * Islanders differ in skill, so the wrong people in the wrong jobs leave the island inside its PPC.
 * A level's stamp needs every season met AND enough stars (right predictions and answers).
 */
import { useMemo, useState } from 'preact/hooks';
import { PpcSchedule, ppcPosition, round } from '../../econ/calc';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon, StepNo } from '../../shared/design/components';
import { Area, Curve, Diagram, Dot, Guide } from '../../shared/diagrams/Diagram';
import { celebrate } from '../../shared/fun/celebrate';
import { ordered, ppc, Worker } from './model';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import {
  applyJobs, displayOrder, islandAt, ISLANDERS, Job, meetsNeed, needImpossible, outputOf, SeasonLevel, starsOnOffer, working, yearWon,
} from './seasons';

const MAX = 90;
const toPts = (s: PpcSchedule) => s.map((p) => ({ q: p.x, p: p.y }));

type Phase = 'predict' | 'plan' | 'result';

const LANES: { job: Job; icon: string; name: string; to: string }[] = [
  { job: 'F', icon: '🐟', name: 'Fishing', to: 'fishing' },
  { job: 'T', icon: '🪵', name: 'Cutting timber', to: 'cutting timber' },
  { job: 'H', icon: '🏠', name: 'At home', to: 'home' },
];

function NeedBar(props: { label: string; have: number; need: number; unit: string }) {
  const ok = props.have >= props.need - 1e-9;
  const max = Math.max(props.need * 1.6, props.have, 1);
  return (
    <div class="need-bar">
      <div class="row" style={{ justifyContent: 'space-between', gap: 6 }}>
        <span>{props.label}</span>
        <b>
          {round(props.have, 1)} of {props.need} {props.unit} {ok ? '(enough)' : '(not enough)'}
        </b>
      </div>
      <div class={`need-track ${ok ? 'ok' : ''}`} aria-hidden="true">
        <span style={{ width: `${Math.min(100, (props.have / max) * 100)}%` }} />
        <i style={{ left: `${(props.need / max) * 100}%` }} />
      </div>
    </div>
  );
}

/** The job board: three lanes, one chip per islander, with buttons to move them. */
function JobBoard(props: { workers: Worker[]; jobs: Job[]; employed: number; order: number[]; locked: boolean; onMove: (i: number, j: Job) => void }) {
  const w = ordered(props.workers);
  const full = working(props.jobs) >= props.employed;
  return (
    <div class="job-board">
      {LANES.map((lane) => {
        const here = props.order.filter((i) => props.jobs[i] === lane.job);
        return (
          <section key={lane.job} class={`job-lane lane-${lane.job}`} aria-label={`${lane.name}: ${here.length}`}>
            <h4>
              <span aria-hidden="true">{lane.icon}</span> {lane.name} <span class="muted">({here.length})</span>
            </h4>
            <div class="job-chips">
              {here.length === 0 && <span class="small muted">Nobody</span>}
              {here.map((i) => (
                <div key={`${i}-${lane.job}`} class="job-chip">
                  <span class="chip-name">{ISLANDERS[i]}</span>
                  <span class="chip-skill small" aria-label={`can catch ${round(w[i].fish, 1)} tonnes of fish or cut ${round(w[i].timber, 1)} tonnes of timber`}>
                    🐟 {round(w[i].fish, 1)} · 🪵 {round(w[i].timber, 1)}
                  </span>
                  <span class="chip-moves">
                    {LANES.filter((l) => l.job !== lane.job).map((l) => {
                      const blocked = props.locked || (lane.job === 'H' && full);
                      return (
                        <button
                          key={l.job}
                          type="button"
                          class="chip-move"
                          disabled={blocked}
                          title={`Move to ${l.to}`}
                          aria-label={`Move ${ISLANDERS[i]} to ${l.to}`}
                          onClick={() => props.onMove(i, l.job)}
                        >
                          <span aria-hidden="true">{l.icon}</span>
                        </button>
                      );
                    })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <p class="small muted" style={{ margin: 0 }}>
        Each islander can do one job. 🐟 is the fish they can catch, 🪵 is the timber they can cut (tonnes).{' '}
        {props.employed < props.jobs.length ? `Only ${props.employed} jobs this season${full ? ': all filled. Send someone home to swap.' : '.'}` : ''}
      </p>
    </div>
  );
}

const STAMP_NAMES = ['Island Planner', 'Storm Planner', 'Island Council'];
const startJobs = (lv: SeasonLevel) => lv.start.split('') as Job[];

export function Seasons(props: {
  levels: SeasonLevel[];
  outcomes: { id: string; text: string }[];
  onGoal: (level: number) => void;
  stamps: number;
  teacher: boolean;
}) {
  const [levelNo, setLevelNo] = useState(1);
  const level = props.levels[levelNo - 1];
  const { seasons } = level;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(seasons[0].event ? 'predict' : 'plan');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [eventShown, setEventShown] = useState(false);
  const [jobs, setJobs] = useState<Job[]>(startJobs(level));
  const [laidOff, setLaidOff] = useState<{ i: number; job: Job }[]>([]);
  const [results, setResults] = useState<boolean[]>([]);
  const [stars, setStars] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  /** Level 3: the student said this season's need cannot be met. */
  const [calledImpossible, setCalledImpossible] = useState(false);
  const [announce, setAnnounce] = useState('');
  const offer = starsOnOffer(level);

  const season = seasons[index];
  const before = islandAt(seasons, index - 1);
  const now = islandAt(seasons, index);
  // Before the event is played, the island is still as it was last season.
  const island = phase === 'predict' ? before : now;
  const schedule = useMemo(() => ppc(island.workers), [island.workers]);
  const oldSchedule = useMemo(() => ppc(before.workers), [before.workers]);
  const ppcChanged = eventShown && !!(season.event?.effect.fish || season.event?.effect.timber);
  const out = outputOf(island.workers, jobs);
  const where = ppcPosition(schedule, out.fish, out.timber);
  const idle = jobs.length - working(jobs);
  const ok = meetsNeed(out, season.need);
  const finished = results.length === seasons.length;
  const won = finished && answer !== null && yearWon(level, results, stars);
  const impossible = useMemo(() => needImpossible(seasons, index), [seasons, index]);
  const order = displayOrder(level);
  const choices = props.outcomes.filter((o) => level.choices.includes(o.id));

  const whereText =
    where === 'on' ? 'On the PPC: every islander is working, each in a job that suits them.'
      : where === 'outside' ? 'Outside the PPC.'
        : idle > 0 ? `Inside the PPC: ${idle} islander${idle > 1 ? 's are' : ' is'} not working (unemployed resources).`
          : 'Inside the PPC: some islanders are in jobs that do not suit them, so the island makes less than it could.';

  const move = (i: number, j: Job) => {
    const next = [...jobs];
    next[i] = j;
    setJobs(next);
    setLaidOff((l) => l.filter((x) => x.i !== i));
    const o = outputOf(island.workers, next);
    setAnnounce(`${ISLANDERS[i]} moves to ${LANES.find((l) => l.job === j)!.to}. Fish ${round(o.fish, 1)}, timber ${round(o.timber, 1)} tonnes.`);
  };

  const playEvent = () => {
    if (!season.event || !prediction) return;
    const right = prediction === season.event.correct;
    if (right) setStars((n) => n + 1);
    setEventShown(true);
    setPhase('plan');
    const r = applyJobs(jobs, laidOff, now.employed);
    setJobs(r.jobs);
    setLaidOff(r.laidOff);
    setAnnounce(`${right ? 'Your prediction was right.' : 'Not quite.'} ${season.event.explain}`);
  };

  /** @param sayImpossible true when the student says no plan can meet this season's need. */
  const endSeason = (sayImpossible = false) => {
    // A season goes well when the need is met, or (Level 3) when the student rightly spots an unattainable need.
    const good = sayImpossible ? impossible : ok;
    setCalledImpossible(sayImpossible);
    setResults([...results, good]);
    setAnswer(null);
    setPhase('result');
    setAnnounce(
      sayImpossible
        ? impossible
          ? `Right. No plan can meet ${season.name}'s need. Now answer the cost question.`
          : `Not quite. A plan can meet ${season.name}'s need. Now answer the cost question.`
        : `${good ? `${season.name}: the island had enough.` : `${season.name}: the island went short.`} Now answer the cost question.`,
    );
  };

  const answerCheck = (k: number) => {
    if (answer !== null) return;
    setAnswer(k);
    const right = k === season.check.correct;
    const total = stars + (right ? 1 : 0);
    if (right) setStars(total);
    setAnnounce(right ? 'Right. You earned a star.' : 'Not quite. Read the explanation.');
    if (results.length === seasons.length && yearWon(level, results, total)) {
      setTimeout(() => {
        celebrate({ size: 'big' });
        props.onGoal(levelNo);
      }, 500);
    }
  };

  const nextSeason = () => {
    const n = index + 1;
    setIndex(n);
    setPrediction(null);
    setEventShown(false);
    setCalledImpossible(false);
    setAnswer(null);
    setPhase(seasons[n].event ? 'predict' : 'plan');
    setAnnounce(`${seasons[n].name} begins.`);
  };

  const restart = (lv: SeasonLevel = level) => {
    setIndex(0);
    setResults([]);
    setStars(0);
    setPrediction(null);
    setEventShown(false);
    setCalledImpossible(false);
    setAnswer(null);
    setJobs(startJobs(lv));
    setLaidOff([]);
    setPhase(lv.seasons[0].event ? 'predict' : 'plan');
  };

  const pickLevel = (n: number) => {
    setLevelNo(n);
    restart(props.levels[n - 1]);
    setAnnounce(`Level ${n}: ${props.levels[n - 1].title}.`);
  };

  const need = season.need;
  const check = season.check;
  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <LevelPicker
        levels={props.levels}
        level={levelNo}
        onPick={pickLevel}
        stamps={props.stamps}
        teacher={props.teacher}
        icon="island"
        stampNames={STAMP_NAMES}
      />
      <p class="small" style={{ margin: 0 }}>
        <strong>To earn the {STAMP_NAMES[levelNo - 1]} stamp:</strong> meet the need in all four seasons and earn at least {level.minStars} of {offer} stars.
        You earn a star for each right prediction and each right cost answer. Stars so far: <strong>{stars}</strong>{' '}
        <span aria-hidden="true">{'★'.repeat(stars)}</span>
      </p>
      <ol class="season-strip" aria-label="The island's year">
        {seasons.map((s, i) => {
          const state = i < results.length ? (results[i] ? 'met' : 'missed') : i === index ? 'now' : 'later';
          return (
            <li key={s.id} class={`season-tile st-${state}`}>
              <span class="season-icon" aria-hidden="true">{s.icon}</span>
              <span>
                <strong>{s.name}</strong>
                <span class="small" style={{ display: 'block' }}>
                  {state === 'met' ? 'Need met' : state === 'missed' ? 'Went short' : state === 'now' ? 'Now' : 'Coming up'}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <div class="play play-card-first">
        <div class="stack">
          <Diagram
            xMax={MAX}
            yMax={MAX}
            xLabel="Fish (tonnes)"
            yLabel="Timber (tonnes)"
            title={`Island PPC in ${season.name}`}
            description={`The island makes ${round(out.fish, 1)} tonnes of fish and ${round(out.timber, 1)} tonnes of timber, ${where} the PPC. This season needs at least ${need.fish} fish and ${need.timber} timber: the shaded corner.`}
            xTicks={[20, 40, 60, 80]}
            yTicks={[20, 40, 60, 80]}
          >
            <Area
              points={[{ q: need.fish, p: need.timber }, { q: MAX, p: need.timber }, { q: MAX, p: MAX }, { q: need.fish, p: MAX }]}
              pattern="dots"
              tone="green"
              label={ok && phase !== 'predict' ? 'Need met' : 'Target'}
              labelAt={{ q: (need.fish + MAX) / 2 + 6, p: MAX - 6 }}
              opacity={0.55}
            />
            {ppcChanged && (
              <Curve
                points={toPts(oldSchedule)}
                label="old PPC"
                tone="grey"
                ghost
                // When both curves end at the same point on the fish axis, lift the old label clear of the new one.
                labelOffset={Math.abs(oldSchedule[oldSchedule.length - 1].x - schedule[schedule.length - 1].x) < 5 ? { dx: -64, dy: -40 } : { dx: -10, dy: -14 }}
              />
            )}
            <Curve points={toPts(schedule)} label="PPC" tone="navy" labelOffset={{ dx: 6, dy: -14 }} />
            <Guide at={{ q: out.fish, p: out.timber }} />
            <Dot at={{ q: out.fish, p: out.timber }} label="Island" tone="red" r={7} />
          </Diagram>
          <p class="small muted">
            The dotted Target corner shows every mix of fish and timber that meets this season's need. Put the island's dot inside it.
            {level.impossibleOption && ' If the PPC never reaches the corner, the need cannot be met.'}
          </p>
        </div>

        <section class="event-card stack" aria-labelledby="season-h">
          <p class="small muted" style={{ margin: 0 }}>
            Season {index + 1} of {seasons.length}
          </p>
          <h3 id="season-h">
            <StepNo n={2} /> <span aria-hidden="true">{season.icon}</span> {season.name}
          </h3>
          <ol class="season-steps small" aria-label="This season's steps">
            {season.event && <li class={phase === 'predict' ? 'on' : 'done'}>Predict the event</li>}
            <li class={phase === 'plan' ? 'on' : phase === 'result' ? 'done' : ''}>Put islanders in jobs</li>
            <li class={phase === 'result' ? (answer === null ? 'on' : 'done') : ''}>Cost question</li>
          </ol>

          {season.event && (
            <div class="stack">
              <p style={{ margin: 0 }}><strong>Event: {season.event.title}.</strong> <Md text={season.event.text} inline /></p>
              {phase === 'predict' ? (
                <>
                  <p style={{ margin: 0 }}><strong>Predict first:</strong> what will this do?</p>
                  <div class="choice-grid" role="group" aria-label="Your prediction">
                    {choices.map((o) => (
                      <button key={o.id} type="button" class="choice-btn" aria-pressed={prediction === o.id} onClick={() => { setPrediction(o.id); }}>
                        {o.text}
                      </button>
                    ))}
                  </div>
                  <div><button class="btn" disabled={!prediction} onClick={playEvent}>Play the event</button></div>
                </>
              ) : (
                <div class={`callout ${prediction === season.event.correct ? 'callout-ok' : 'callout-try'}`}>
                  <p style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                    {prediction === season.event.correct ? <MarkIcon /> : <CrossIcon />}
                    {prediction === season.event.correct
                      ? 'Your prediction was right. +1 star.'
                      : `Not quite. The answer: ${props.outcomes.find((o) => o.id === season.event!.correct)?.text}.`}
                  </p>
                  <Md text={season.event.explain} />
                </div>
              )}
            </div>
          )}

          {phase !== 'predict' && (
            <div class="stack">
              <p style={{ margin: 0 }}><Md text={season.story} inline /></p>
              <p style={{ margin: 0 }}>
                <strong>This season the island needs</strong> at least {need.fish} tonnes of fish and {need.timber} tonnes of timber.
              </p>
              <JobBoard workers={island.workers} jobs={jobs} employed={island.employed} order={order} locked={phase === 'result'} onMove={move} />
              <NeedBar label="Fish" have={out.fish} need={need.fish} unit="tonnes" />
              <NeedBar label="Timber" have={out.timber} need={need.timber} unit="tonnes" />
              <p class="small" style={{ margin: '6px 0 0' }}>
                <strong>Position:</strong> {whereText}
              </p>
              {phase === 'plan' && (
                <div class="row">
                  <button class="btn" onClick={() => endSeason()}>End the season</button>
                  {level.impossibleOption && (
                    <button class="btn btn-secondary" onClick={() => endSeason(true)}>
                      No plan can meet this need
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {phase === 'result' && (() => {
            const good = results[results.length - 1];
            return (
              <div class="stack">
                <div class={`callout ${good ? 'callout-ok' : 'callout-try'} stack`} role="status">
                  <p style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}>
                    {good ? <MarkIcon /> : <CrossIcon />}
                    {calledImpossible
                      ? impossible
                        ? `Well spotted. No plan can meet ${season.name}'s need.`
                        : `Not quite. A plan can meet ${season.name}'s need.`
                      : good
                        ? `${season.name} went well. Everyone had enough.`
                        : `The island went short in ${season.name}.`}
                  </p>
                  {impossible && (
                    <p style={{ margin: 0 }}>
                      The Target corner lies outside what the island can make. With its resources, jobs and technology, that combination is unattainable.
                    </p>
                  )}
                  {!good && !impossible && (
                    <p style={{ margin: 0 }}>
                      A plan reaches the dotted corner. Put islanders where their skills count most: the best at fishing in fishing, the best at timber in timber.
                    </p>
                  )}
                </div>

                <div class="panel stack cost-check">
                  <h4 style={{ margin: 0 }}><StepNo n={3} /> Cost question</h4>
                  <p style={{ margin: 0 }}><Md text={check.q} inline /></p>
                  <div class="choice-grid" role="group" aria-label="Your answer">
                    {check.choices.map((c, k) => (
                      <button
                        key={k}
                        type="button"
                        class={`choice-btn ${answer !== null && k === check.correct ? 'choice-right' : ''}`}
                        aria-pressed={answer === k}
                        disabled={answer !== null}
                        onClick={() => answerCheck(k)}
                      >
                        <Md text={c} inline />
                      </button>
                    ))}
                  </div>
                  {answer !== null && (
                    <div class={`callout ${answer === check.correct ? 'callout-ok' : 'callout-try'}`} role="status">
                      <p style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}>
                        {answer === check.correct ? <MarkIcon /> : <CrossIcon />}
                        {answer === check.correct ? 'Right. +1 star.' : 'Not quite.'}
                      </p>
                      <Md text={check.explain} />
                    </div>
                  )}
                </div>

                {answer !== null && (!finished ? (
                  <div><button class="btn" onClick={nextSeason}>Start {seasons[index + 1].name}</button></div>
                ) : (
                  <div class="stack">
                    <h4 style={{ margin: 0 }}>
                      The year is over: {results.filter(Boolean).length} of {seasons.length} seasons went well, and you earned {stars} of {offer} stars
                    </h4>
                    <p style={{ margin: 0 }}>
                      {won
                        ? `You planned a whole year. You earned the ${STAMP_NAMES[levelNo - 1]} stamp.${levelNo < props.levels.length ? ` Level ${levelNo + 1} is now open.` : ''}`
                        : `To earn the ${STAMP_NAMES[levelNo - 1]} stamp, every season must go well and you need at least ${level.minStars} stars. Read each explanation, then try again.`}
                    </p>
                    <div><button class="btn" onClick={() => restart()}>Play the year again</button></div>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>
      </div>
    </div>
  );
}
