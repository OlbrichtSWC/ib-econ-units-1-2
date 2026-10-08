/**
 * Four seasons: plan Pinewood Island's year. Each season an event changes the island
 * (predict its effect first), then the student chooses how many workers fish to meet
 * the season's need for fish and timber. Three levels, each harder than the last.
 * A level's stamp needs every season met AND enough correct predictions, so the economics counts.
 */
import { useMemo, useState } from 'preact/hooks';
import { PpcSchedule, ppcPosition, round } from '../../econ/calc';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon, StepNo } from '../../shared/design/components';
import { Area, Curve, Diagram, Dot, Guide } from '../../shared/diagrams/Diagram';
import { celebrate } from '../../shared/fun/celebrate';
import { play } from '../../shared/fun/sound';
import { output, ppc } from './model';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import { islandAt, meetsNeed, needImpossible, SeasonLevel, yearWon } from './seasons';

const MAX = 90;
const toPts = (s: PpcSchedule) => s.map((p) => ({ q: p.x, p: p.y }));

type Phase = 'predict' | 'plan' | 'result';

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

const STAMP_NAMES = ['Island Planner', 'Storm Planner', 'Island Council'];

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
  const [fishers, setFishers] = useState(level.startFishers);
  const [results, setResults] = useState<boolean[]>([]);
  const [predRight, setPredRight] = useState(0);
  /** Level 3: the student said this season's need cannot be met. */
  const [calledImpossible, setCalledImpossible] = useState(false);
  const [announce, setAnnounce] = useState('');
  const events = seasons.filter((s) => s.event).length;

  const season = seasons[index];
  const before = islandAt(seasons, index - 1);
  const now = islandAt(seasons, index);
  // Before the event is played, the island is still as it was last season.
  const island = phase === 'predict' ? (index === 0 ? islandAt(seasons, -1) : before) : now;
  const schedule = useMemo(() => ppc(island.workers), [island.workers]);
  const oldSchedule = useMemo(() => ppc(before.workers), [before.workers]);
  const ppcChanged = eventShown && !!(season.event?.effect.fish || season.event?.effect.timber);
  const k = Math.min(fishers, island.employed);
  const out = output({ workers: island.workers, employed: island.employed, fishers: k });
  const where = ppcPosition(schedule, out.fish, out.timber);
  const ok = meetsNeed(out, season.need);
  const finished = results.length === seasons.length;
  const won = finished && yearWon(level, results, predRight);
  const impossible = needImpossible(seasons, index);

  const playEvent = () => {
    if (!season.event || !prediction) return;
    const right = prediction === season.event.correct;
    if (right) setPredRight((n) => n + 1);
    play(right ? 'correct' : 'wrong');
    play('whoosh');
    setEventShown(true);
    setPhase('plan');
    setFishers((f) => Math.min(f, now.employed));
    setAnnounce(`${right ? 'Your prediction was right.' : 'Not quite.'} ${season.event.explain}`);
  };

  /** @param sayImpossible true when the student says no plan can meet this season's need. */
  const endSeason = (sayImpossible = false) => {
    // A season goes well when the need is met, or (Level 3) when the student rightly spots an unattainable need.
    const good = sayImpossible ? impossible : ok;
    setCalledImpossible(sayImpossible);
    const next = [...results, good];
    setResults(next);
    setPhase('result');
    play(good ? 'correct' : 'wrong');
    setAnnounce(
      sayImpossible
        ? impossible
          ? `Right. No plan can meet ${season.name}'s need: it lies outside the PPC.`
          : `Not quite. A plan can meet ${season.name}'s need.`
        : good
          ? `${season.name}: the island had enough fish and timber.`
          : `${season.name}: the island went short.`,
    );
    if (next.length === seasons.length && yearWon(level, next, predRight)) {
      setTimeout(() => {
        play('win');
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
    setPhase(seasons[n].event ? 'predict' : 'plan');
    play('tap');
    setAnnounce(`${seasons[n].name} begins.`);
  };

  const restart = (lv: SeasonLevel = level) => {
    setIndex(0);
    setResults([]);
    setPredRight(0);
    setPrediction(null);
    setEventShown(false);
    setCalledImpossible(false);
    setFishers(lv.startFishers);
    setPhase(lv.seasons[0].event ? 'predict' : 'plan');
  };

  const pickLevel = (n: number) => {
    setLevelNo(n);
    restart(props.levels[n - 1]);
    play('tap');
    setAnnounce(`Level ${n}: ${props.levels[n - 1].title}.`);
  };

  const need = season.need;
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
        <strong>To earn the {STAMP_NAMES[levelNo - 1]} stamp:</strong> meet the need in all four seasons and get at least {level.minPredictions} of {events}{' '}
        predictions right. Predictions right so far: {predRight}.
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

          {season.event && (
            <div class="stack">
              <p style={{ margin: 0 }}><strong>Event: {season.event.title}.</strong> {season.event.text}</p>
              {phase === 'predict' ? (
                <>
                  <p style={{ margin: 0 }}><strong>Predict first:</strong> what will this do?</p>
                  <div class="choice-grid" role="group" aria-label="Your prediction">
                    {props.outcomes.map((o) => (
                      <button key={o.id} type="button" class="choice-btn" aria-pressed={prediction === o.id} onClick={() => { play('tap'); setPrediction(o.id); }}>
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
                      ? 'Your prediction was right.'
                      : `Not quite. The answer: ${props.outcomes.find((o) => o.id === season.event!.correct)?.text}.`}
                  </p>
                  <Md text={season.event.explain} />
                </div>
              )}
            </div>
          )}

          {phase !== 'predict' && (
            <div class="stack">
              <p style={{ margin: 0 }}>{season.story}</p>
              <p style={{ margin: 0 }}>
                <strong>This season the island needs</strong> at least {need.fish} tonnes of fish and {need.timber} tonnes of timber.
              </p>
              <div>
                <label for="season-fishers">Workers fishing: {k} (cutting timber: {island.employed - k}{island.employed < island.workers.length ? `, without jobs: ${island.workers.length - island.employed}` : ''})</label>
                <div class="row" style={{ flexWrap: 'nowrap' }}>
                  <button class="btn btn-secondary btn-sm" aria-label="One fewer worker fishing" disabled={phase === 'result' || k <= 0} onClick={() => { play('tap'); setFishers(k - 1); }}>−</button>
                  <input id="season-fishers" type="range" min={0} max={island.employed} step={1} value={k} disabled={phase === 'result'} onInput={(e) => setFishers(Number((e.target as HTMLInputElement).value))} />
                  <button class="btn btn-secondary btn-sm" aria-label="One more worker fishing" disabled={phase === 'result' || k >= island.employed} onClick={() => { play('tap'); setFishers(k + 1); }}>+</button>
                </div>
              </div>
              <NeedBar label="Fish" have={out.fish} need={need.fish} unit="tonnes" />
              <NeedBar label="Timber" have={out.timber} need={need.timber} unit="tonnes" />
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
                    The Target corner lies outside the island's PPC. With its resources and technology, the island cannot produce that combination: it is unattainable.
                  </p>
                )}
                {!good && !impossible && (
                  <p style={{ margin: 0 }}>
                    Some mix of workers reaches the dotted corner. Each extra worker fishing costs timber: that is the opportunity cost.
                  </p>
                )}
                {!finished ? (
                  <div><button class="btn" onClick={nextSeason}>Start {seasons[index + 1].name}</button></div>
                ) : (
                  <>
                    <h4 style={{ margin: 0 }}>
                      The year is over: {results.filter(Boolean).length} of {seasons.length} seasons went well, and {predRight} of {events} predictions were right
                    </h4>
                    <p style={{ margin: 0 }}>
                      {won
                        ? `You planned a whole year. You earned the ${STAMP_NAMES[levelNo - 1]} stamp.${levelNo < props.levels.length ? ` Level ${levelNo + 1} is now open.` : ''}`
                        : `To earn the ${STAMP_NAMES[levelNo - 1]} stamp, every season must go well and at least ${level.minPredictions} predictions must be right. Read each event's explanation, then try again.`}
                    </p>
                    <div><button class="btn" onClick={() => restart()}>Play the year again</button></div>
                  </>
                )}
              </div>
            );
          })()}
        </section>
      </div>
    </div>
  );
}
