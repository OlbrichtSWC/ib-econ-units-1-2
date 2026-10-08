/**
 * PPC Explorer (1.1): strategy missions on an island economy.
 * Move workers between fishing and timber, complete missions, and play event cards
 * that shift the PPC or move the economy inside or towards it.
 */
import { useMemo, useState } from 'preact/hooks';
import { opportunityCosts, PpcSchedule, ppcPosition, round } from '../../econ/calc';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon } from '../../shared/design/components';
import { Arrow, Curve, Diagram, Dot, Guide, Label } from '../../shared/diagrams/Diagram';
import type { TryProps } from '../../shared/activity/types';
import { DataTable } from '../../shared/activity/CheckIt';
import { play } from '../../shared/fun/sound';
import { CONSTANT, INCREASING, output, ppc, scale, Worker } from './model';
import { Season } from './seasons';
import { Seasons } from './Seasons';

const MAX = 90;
const toPts = (s: PpcSchedule) => s.map((p) => ({ q: p.x, p: p.y }));

interface EventCard {
  id: string;
  title: string;
  text: string;
  /** What happens: fish and timber productivity factors, extra workers, change in jobs. */
  effect: { fish?: number; timber?: number; addWorkers?: number; jobs?: number };
  correct: string;
  explain: string;
}

interface TryContent {
  intro: string;
  missions: { id: string; text: string }[];
  outcomes: { id: string; text: string }[];
  events: EventCard[];
  seasons: Season[];
}

/** Learn it: a PPC with points inside, on and outside, and an outward shift. */
function LearnDiagram() {
  const s1 = toPts(ppc(INCREASING));
  const s2 = toPts(ppc(scale(INCREASING, 1.25, 1.25)));
  return (
    <Diagram xMax={MAX} yMax={MAX} xLabel="Fish (tonnes)" yLabel="Timber (tonnes)" title="PPC showing points inside, on and outside the curve, and an outward shift">
      <Curve points={s1} label="PPC₁" tone="navy" />
      <Curve points={s2} label="PPC₂" tone="red" dashed />
      <Arrow from={{ q: 28, p: 50 }} to={{ q: 34, p: 60 }} tone="red" />
      <Dot at={{ q: 40, p: 40 }} label="A" labelDx={-20} labelDy={-6} />
      <Dot at={{ q: 20, p: 20 }} label="B" />
      <Dot at={{ q: 66, p: 50 }} label="C" hollow />
    </Diagram>
  );
}

function costBars(costs: number[], current: number | null) {
  const w = 300, h = 120, bw = w / costs.length;
  const max = Math.max(...costs);
  return (
    <svg viewBox={`0 0 ${w} ${h + 24}`} style={{ width: '100%', maxWidth: 360 }} role="img" aria-label={`Opportunity cost of each extra worker's fish, in timber per fish: ${costs.map((c) => round(c, 2)).join(', ')}`}>
      {costs.map((c, i) => {
        const bh = (c / max) * h;
        const on = current === i;
        return (
          <g key={i}>
            <rect x={i * bw + 3} y={h - bh} width={bw - 6} height={bh} fill={on ? '#C8102E' : '#c9d6ea'} stroke="#1B3A6B" stroke-width="1" />
            <text x={i * bw + bw / 2} y={h + 16} font-size="11" text-anchor="middle" fill="#4a5263">{i + 1}</text>
            {on && <text x={i * bw + bw / 2} y={h - bh - 4} font-size="11" text-anchor="middle" font-weight="700" fill="#1a1f29">{round(c, 2)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function Try(props: TryProps) {
  const data = props.content.try as unknown as TryContent;
  const [mode, setMode] = useState<'free' | 'seasons'>('free');
  return (
    <div class="stack">
      <div class="mode-switch" role="group" aria-label="Choose a game">
        <button aria-pressed={mode === 'free'} onClick={() => setMode('free')}>Free play and missions</button>
        <button aria-pressed={mode === 'seasons'} onClick={() => setMode('seasons')}>Four seasons</button>
      </div>
      {mode === 'free' ? <FreePlay {...props} /> : <Seasons seasons={data.seasons} outcomes={data.outcomes} onGoal={props.onGoal} />}
    </div>
  );
}

function FreePlay({ content, onComplete }: TryProps) {
  const data = content.try as unknown as TryContent;
  const [mode, setMode] = useState<'increasing' | 'constant'>('increasing');
  const [workers, setWorkers] = useState<Worker[]>(INCREASING);
  const [oldPpc, setOldPpc] = useState<PpcSchedule | null>(null);
  const [employed, setEmployed] = useState(10);
  const [fishers, setFishers] = useState(5);
  const [lastMove, setLastMove] = useState<{ dFish: number; dTimber: number; index: number } | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [tapped, setTapped] = useState<{ q: number; p: number; where: string } | null>(null);
  const [eventIndex, setEventIndex] = useState(0);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [eventResult, setEventResult] = useState<null | { correct: boolean }>(null);
  const [announce, setAnnounce] = useState('');
  const [showTable, setShowTable] = useState(false);

  const schedule = useMemo(() => ppc(workers), [workers]);
  const pts = toPts(schedule);
  const out = output({ workers, employed, fishers });
  const where = ppcPosition(schedule, out.fish, out.timber);
  const costs = opportunityCosts(schedule);

  const complete = (id: string) => {
    setDone((d) => {
      if (d.has(id)) return d;
      const n = new Set(d);
      n.add(id);
      play('correct');
      if (n.size >= 4) onComplete();
      setAnnounce('Mission complete.');
      return n;
    });
  };

  const setFish = (n: number) => {
    const k = Math.max(0, Math.min(employed, n));
    if (k === fishers) return;
    const before = output({ workers, employed, fishers });
    const after = output({ workers, employed, fishers: k });
    setFishers(k);
    if (employed === workers.length && Math.abs(k - fishers) === 1) {
      const index = Math.min(k, fishers);
      setLastMove({ dFish: after.fish - before.fish, dTimber: after.timber - before.timber, index });
      if (k > fishers && costs[index] > 2) complete('rising-cost');
    } else setLastMove(null);
    const pos = ppcPosition(schedule, after.fish, after.timber);
    if (pos === 'on' && after.fish >= 30) complete('efficient');
    if (pos === 'inside') complete('inside');
  };

  const setJobs = (n: number) => {
    const e = Math.max(0, Math.min(workers.length, n));
    setEmployed(e);
    setFishers((f) => Math.min(f, e));
    setLastMove(null);
    if (e < workers.length) complete('inside');
  };

  const switchMode = (m: 'increasing' | 'constant') => {
    setMode(m);
    setWorkers(m === 'increasing' ? INCREASING : CONSTANT);
    setOldPpc(null);
    setEmployed(10);
    setFishers(5);
    setLastMove(null);
    if (m === 'constant') complete('constant');
  };

  const event = data.events[eventIndex % data.events.length];
  const playEvent = () => {
    if (!prediction) return;
    const e = event.effect;
    const correct = prediction === event.correct;
    setEventResult({ correct });
    play(correct ? 'correct' : 'wrong');
    if (e.fish || e.timber || e.addWorkers) {
      setOldPpc(schedule);
      let w = scale(workers, e.fish ?? 1, e.timber ?? 1);
      if (e.addWorkers) w = [...w, ...Array.from({ length: e.addWorkers }, () => ({ fish: 5.5 * (e.fish ?? 1), timber: 5.5 * (e.timber ?? 1) }))];
      setWorkers(w);
      if (e.addWorkers) setEmployed((x) => x + e.addWorkers!);
    } else {
      setOldPpc(null);
    }
    if (e.jobs) {
      const ne = Math.max(0, Math.min(workers.length + (e.addWorkers ?? 0), employed + e.jobs));
      setEmployed(ne);
      setFishers((f) => Math.min(f, ne));
    }
    setLastMove(null);
    setAnnounce(correct ? 'Your prediction was right.' : 'Your prediction was not right this time. Read the explanation.');
    complete('event');
  };

  const nextEvent = () => {
    setEventIndex((i) => i + 1);
    setPrediction(null);
    setEventResult(null);
  };

  const resetIsland = () => switchMode(mode);

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <div class="play">
        <div class="stack">
          <Diagram
            xMax={MAX}
            yMax={MAX}
            xLabel="Fish (tonnes)"
            yLabel="Timber (tonnes)"
            title="Island PPC"
            description={`The economy makes ${round(out.fish, 1)} tonnes of fish and ${round(out.timber, 1)} tonnes of timber. This point is ${where} the PPC.`}
            xTicks={[0, 20, 40, 60, 80]}
            yTicks={[0, 20, 40, 60, 80]}
            onPlotClick={(pt) => {
              const w = ppcPosition(schedule, pt.q, pt.p, 1);
              setTapped({ ...pt, where: w });
              setAnnounce(`That point is ${w} the PPC.`);
              if (w === 'outside') complete('outside');
            }}
          >
            {oldPpc && <Curve points={toPts(oldPpc)} label="PPC₁" tone="grey" ghost labelOffset={{ dx: -10, dy: -14 }} />}
            <Curve points={pts} label={oldPpc ? 'PPC₂' : 'PPC'} tone="navy" labelOffset={{ dx: 6, dy: -14 }} />
            {oldPpc && <Arrow from={{ q: oldPpc[5].x, p: oldPpc[5].y }} to={{ q: schedule[5]?.x ?? oldPpc[5].x, p: schedule[5]?.y ?? oldPpc[5].y }} tone="red" />}
            <Guide at={{ q: out.fish, p: out.timber }} />
            <Dot at={{ q: out.fish, p: out.timber }} label="Island" tone="red" r={7} />
            {tapped && <Dot at={tapped} label={`${tapped.where}`} hollow tone="ink" />}
            {where === 'inside' && <Label at={{ q: out.fish, p: out.timber }} text="unemployed resources" dy={22} dx={-10} tone="red" />}
          </Diagram>
          <p class="small muted">Tip: tap anywhere on the diagram to test whether a point is inside, on or outside the PPC.</p>
          <div class="row">
            <button class="btn btn-secondary btn-sm" aria-pressed={mode === 'increasing'} onClick={() => switchMode('increasing')}>
              Increasing opportunity cost
            </button>
            <button class="btn btn-secondary btn-sm" aria-pressed={mode === 'constant'} onClick={() => switchMode('constant')}>
              Constant opportunity cost
            </button>
            <button class="btn btn-quiet btn-sm" onClick={resetIsland}>Reset island</button>
            <button class="btn btn-quiet btn-sm" onClick={() => setShowTable(!showTable)} aria-expanded={showTable}>
              {showTable ? 'Hide' : 'Show'} the PPC schedule
            </button>
          </div>
          {showTable && (
            <DataTable
              table={{
                caption: 'PPC schedule: every worker employed',
                headers: ['Workers fishing', 'Fish (tonnes)', 'Timber (tonnes)'],
                rows: schedule.map((s, i) => [i, round(s.x, 1), round(s.y, 1)]),
              }}
            />
          )}
        </div>

        <div class="stack">
          <div class="panel stack">
            <h3>Your workers</h3>
            <div>
              <label for="fishers">Workers fishing: {fishers}</label>
              <div class="row" style={{ flexWrap: 'nowrap' }}>
                <button class="btn btn-secondary btn-sm" aria-label="One fewer worker fishing" onClick={() => setFish(fishers - 1)}>−</button>
                <input id="fishers" type="range" min={0} max={employed} step={1} value={fishers} onInput={(e) => setFish(Number((e.target as HTMLInputElement).value))} />
                <button class="btn btn-secondary btn-sm" aria-label="One more worker fishing" onClick={() => setFish(fishers + 1)}>+</button>
              </div>
              <p class="small muted">Workers cutting timber: {employed - fishers}</p>
            </div>
            <div>
              <label for="jobs">Workers with jobs: {employed} of {workers.length}</label>
              <input id="jobs" type="range" min={0} max={workers.length} step={1} value={employed} onInput={(e) => setJobs(Number((e.target as HTMLInputElement).value))} />
            </div>
            <div class="stat"><span>Fish</span><b>{round(out.fish, 1)} tonnes</b></div>
            <div class="stat"><span>Timber</span><b>{round(out.timber, 1)} tonnes</b></div>
            <div class="stat">
              <span>Position</span>
              <b>
                {where === 'on' ? 'On the PPC (efficient)' : where === 'inside' ? 'Inside the PPC (unemployed resources)' : 'Outside the PPC'}
              </b>
            </div>
          </div>

          <div class="panel stack">
            <h3>Opportunity cost counter</h3>
            {lastMove ? (
              <p>
                You moved one worker. Fish {lastMove.dFish >= 0 ? '+' : ''}
                {round(lastMove.dFish, 1)}, timber {lastMove.dTimber >= 0 ? '+' : ''}
                {round(lastMove.dTimber, 1)}.{' '}
                <strong>
                  Each extra fish cost {round(Math.abs(lastMove.dTimber / lastMove.dFish), 2)} tonnes of timber.
                </strong>
              </p>
            ) : (
              <p class="small muted">With every worker employed, move one worker at a time with − and + to see the cost of each extra fish.</p>
            )}
            {costBars(costs, lastMove ? lastMove.index : null)}
            <p class="small muted">Bars: timber given up per extra tonne of fish, for worker 1 to {costs.length} moved into fishing.</p>
          </div>
        </div>
      </div>

      <div class="play">
        <section class="panel stack" aria-labelledby="missions-h">
          <h3 id="missions-h">Missions ({done.size} of {data.missions.length})</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} class="stack">
            {data.missions.map((m) => (
              <li key={m.id} class="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <span aria-hidden="true" style={{ color: done.has(m.id) ? 'var(--ok)' : 'var(--line)', flex: 'none' }}>
                  {done.has(m.id) ? <MarkIcon size={22} /> : <span style={{ display: 'inline-block', width: 22, height: 22, border: '2px solid var(--line)', borderRadius: 4 }} />}
                </span>
                <span>
                  <Md text={m.text} inline />
                  {done.has(m.id) && <span class="sr-only"> (done)</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section class="event-card stack" aria-labelledby="event-h">
          <p class="small muted" style={{ margin: 0 }}>Event card {(eventIndex % data.events.length) + 1} of {data.events.length}</p>
          <h3 id="event-h">{event.title}</h3>
          <Md text={event.text} />
          <p><strong>Predict first:</strong> what will this do?</p>
          <div class="choice-grid" role="group" aria-label="Your prediction">
            {data.outcomes.map((o) => (
              <button key={o.id} type="button" class="choice-btn" aria-pressed={prediction === o.id} disabled={!!eventResult} onClick={() => setPrediction(o.id)}>
                {o.text}
              </button>
            ))}
          </div>
          {!eventResult ? (
            <div>
              <button class="btn" disabled={!prediction} onClick={playEvent}>Play the card</button>
            </div>
          ) : (
            <div class={`callout ${eventResult.correct ? 'callout-ok' : 'callout-try'}`} role="status">
              <p style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                {eventResult.correct ? <MarkIcon /> : <CrossIcon />}
                {eventResult.correct ? 'Your prediction was right.' : `Not quite. The answer: ${data.outcomes.find((o) => o.id === event.correct)?.text}`}
              </p>
              <Md text={event.explain} />
              <div class="row">
                <button class="btn" onClick={nextEvent}>Next event card</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export { Try, LearnDiagram };
