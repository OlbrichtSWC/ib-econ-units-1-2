/**
 * Supply Speed (2.6): price elasticity of supply.
 *
 * Level 1: three producers face the same price rise. Rank them from least to most elastic supply,
 *          watch them race, then name the determinant that explains the ranking.
 * Level 2: one producer travels through the momentary period, the short run and the long run.
 *          Choose what it can do in each period; output grows and the supply curve pivots flatter.
 * Level 3: calculate PES from each producer's results and classify it. One HL round on primary commodities.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, HlBadge, LiveRegion, MarkIcon, StepNo } from '../../shared/design/components';
import { Arrow, Curve, Diagram, Dot, Guide, Label } from '../../shared/diagrams/Diagram';
import type { TryProps } from '../../shared/activity/types';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import type { LevelInfo } from '../../shared/activity/LevelPicker';
import { parseNumber } from '../../shared/activity/CheckIt';
import { celebrate } from '../../shared/fun/celebrate';
import { reducedMotion } from '../../shared/fun/motion';
import { play } from '../../shared/fun/sound';
import { shuffled } from '../island-economy/model';
import {
  classifyPes, Determinant, DETERMINANTS, diagnosePes, diagnoseReverse, gaugeAngle, isNextInRank, MEASURE_GOAL, measureWon,
  outputIn, PERIODS, Period, PES_CLASSES, PesClass, pesFromData, pesIn, pivotQ, RACE_GOAL, raceShare, raceWon, rankByPes, round2,
  TIME_GOAL, timeWon,
} from './model';
import './supply.css';

const STAMP_NAMES = ['Supply Scout', 'Time Traveller', 'PES Pro'];

interface Option { text: string; correct?: boolean; feedback: string }
interface Producer { id: string; name: string; icon: string; scene: string[]; anim: string; note: string; pes: number }
interface RaceRound {
  id: string;
  priceRise: number;
  determinant: Determinant;
  producers: Producer[];
  rankWhy: string;
  detWhy: string;
  detHint: string;
}
interface TimeProducer {
  id: string; name: string; icon: string; unit: string; priceUnit: string;
  p0: number; p1: number; q0: number; qShort: number; qLong: number;
  options: Record<Period, Option[]>;
}
interface CalcRound { id: string; kind: 'calc'; name: string; icon: string; period: string; unit: string; priceUnit: string; p0: number; p1: number; q0: number; q1: number; why: string; hl?: boolean }
interface ReverseRound { id: string; kind: 'reverse'; name: string; icon: string; period: string; pes: number; pctPrice: number; why: string; hl?: boolean }
interface ChoiceRound { id: string; kind: 'choice'; name: string; icon: string; steps: { prompt: string; options: Option[] }[]; why: string; hl?: boolean }
type MeasureRound = CalcRound | ReverseRound | ChoiceRound;

interface TryContent {
  levels: LevelInfo[];
  determinantNames: Record<Determinant, string>;
  determinantIcons: Record<Determinant, string>;
  raceRounds: RaceRound[];
  periodNames: Record<Period, string>;
  periodHints: Record<Period, string>;
  timeProducers: TimeProducer[];
  classNames: Record<PesClass, string>;
  classRanges: Record<PesClass, string>;
  measureRounds: MeasureRound[];
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
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="gauge" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <Race key={round} seed={round} {...props} />}
      {levelNo === 2 && <TimeMachine key={round} seed={round} {...props} />}
      {levelNo === 3 && <Measure key={round} seed={round} {...props} />}
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
    play('win');
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

function AnswerBadge(props: { text?: string }) {
  return <span class="badge badge-done">{props.text ?? 'Answer'}</span>;
}

function Finish(props: { won: boolean; title: [string, string]; line: string; need: string; again: () => void }) {
  return (
    <div class={`callout ${props.won ? 'callout-ok' : 'callout-try'} stack`} role="status">
      <p style={{ margin: 0 }}>
        <strong>{props.won ? props.title[0] : props.title[1]}</strong> {props.line}
      </p>
      {!props.won && <p style={{ margin: 0 }}>{props.need} Play again: everything comes in a new order.</p>}
      <div><button class="btn" onClick={props.again}>Play again</button></div>
    </div>
  );
}

/** Format a number the way a student would write it: 1,000 and 2.5. */
const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 2 });
const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** Counts a number up to its new value. Jumps straight there when the device asks for less motion. */
function useCountUp(target: number, ms = 900): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    from.current = target;
    if (reducedMotion() || start === target) {
      setShown(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      setShown(start + (target - start) * e);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return shown;
}

function PriceBanner(props: { text: string }) {
  return (
    <div class="ss-price" role="note">
      <span class="ss-price-arrow" aria-hidden="true">▲</span>
      <strong>{props.text}</strong>
    </div>
  );
}

// ---------------- Level 1: three producers ----------------

const PLACE_NAMES = ['Least elastic', 'Middle', 'Most elastic'];

function Scene(props: { p: Producer }) {
  const { p } = props;
  return (
    <div class={`ss-scene ss-anim-${p.anim}`} aria-hidden="true">
      <span class="ss-scene-main">{p.icon}</span>
      <span class="ss-scene-props">
        {p.scene.map((e, i) => <span key={i} class="ss-prop" style={{ animationDelay: `${i * 0.25}s` }}>{e}</span>)}
      </span>
    </div>
  );
}

function Race({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const rounds = useMemo(() => shuffled(data.raceRounds, seed + 3), [data.raceRounds, seed]);
  const [ri, setRi] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [rankMissed, setRankMissed] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [det, setDet] = useState<Determinant | null>(null);
  const [detMissed, setDetMissed] = useState(false);
  const [marks, setMarks] = useState(0);
  const [go, setGo] = useState(false);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const r = rounds[ri];
  const shown = useMemo(() => shuffled(r.producers, seed * 7 + ri * 13 + 1), [r, seed, ri]);
  const ranked = rankByPes(r.producers);
  const rankDone = placed.length === r.producers.length;
  const detSolved = det === r.determinant;
  const maxPct = Math.max(...r.producers.map((p) => p.pes * r.priceRise));

  useEffect(() => {
    if (!rankDone) {
      setGo(false);
      return;
    }
    const t = setTimeout(() => setGo(true), 60);
    return () => clearTimeout(t);
  }, [rankDone]);

  const tap = (id: string) => {
    if (rankDone || placed.includes(id)) return;
    const p = r.producers.find((x) => x.id === id)!;
    if (!isNextInRank(r.producers, placed, id)) {
      play('wrong');
      setRankMissed(true);
      setWrongId(id);
      setAnnounce(`Not ${p.name} yet. Find the producer left that finds it hardest to raise output quickly.`);
      return;
    }
    play('pop');
    setWrongId(null);
    let next = [...placed, id];
    // The last producer has only one place left.
    if (next.length === r.producers.length - 1) next = [...next, ranked[ranked.length - 1]];
    setPlaced(next);
    if (next.length === r.producers.length) {
      if (!rankMissed) setMarks((m) => m + 1);
      play('whoosh');
      setAnnounce(`Ranking complete. ${r.rankWhy} Now name the determinant.`);
    } else setAnnounce(`${p.name}: ${PLACE_NAMES[placed.length].toLowerCase()}.`);
  };

  const pickDet = (d: Determinant) => {
    if (detSolved) return;
    setDet(d);
    if (d === r.determinant) {
      play('correct');
      if (!detMissed) setMarks((m) => m + 1);
      setAnnounce(`Right: ${data.determinantNames[d]}.`);
    } else {
      play('wrong');
      setDetMissed(true);
      setAnnounce(`Not ${data.determinantNames[d]}. ${r.detHint}`);
    }
  };

  const next = () => {
    play('whoosh');
    setPlaced([]);
    setRankMissed(false);
    setWrongId(null);
    setDet(null);
    setDetMissed(false);
    if (ri + 1 < rounds.length) {
      setRi(ri + 1);
      setAnnounce('New round. The price rises for three new producers.');
    } else {
      setDone(true);
      onComplete();
      if (raceWon(marks)) win(onGoal, 1);
    }
  };

  const total = rounds.length * 2;
  if (done) {
    return (
      <Finish
        won={raceWon(marks)}
        title={['Supply Scout!', 'Race finished.']}
        line={`Right first time: ${marks} of ${total}.`}
        need={`The ${STAMP_NAMES[0]} stamp needs ${RACE_GOAL} right first time.`}
        again={again}
      />
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1. Round {ri + 1} of {rounds.length}. Right first time: {marks} (goal {RACE_GOAL} of {total}).
      </p>
      <section class="panel stack" aria-labelledby="ss-rank-h">
        <h3 id="ss-rank-h"><StepNo n={2} /> Rank the producers</h3>
        <PriceBanner text={`The price rises ${r.priceRise}% for all three producers!`} />
        <p class="small muted" style={{ margin: 0 }}>
          Tap them in order, from <strong>least elastic</strong> supply (slowest to make more) to <strong>most elastic</strong> (fastest).
        </p>
        <div key={r.id} class="ss-producers" role="group" aria-label="Producers">
          {shown.map((p, i) => {
            const place = placed.indexOf(p.id);
            const isNext = !rankDone && ranked[placed.length] === p.id;
            return (
              <button
                key={p.id}
                type="button"
                class={`ss-producer ss-in ${wrongId === p.id ? 'shake' : ''} ${place >= 0 ? 'ss-placed' : ''}`}
                style={{ animationDelay: `${i * 0.12}s` }}
                disabled={rankDone || place >= 0}
                onClick={() => tap(p.id)}
              >
                <Scene p={p} />
                <strong>{p.name}</strong>
                <span class="small">{p.note}</span>
                {place >= 0 && <span class="ss-place">{place + 1}. {PLACE_NAMES[place]}</span>}
                {teacher && isNext && <AnswerBadge />}
              </button>
            );
          })}
        </div>
        {wrongId && !rankDone && (
          <Fb ok={false}>
            Not {r.producers.find((x) => x.id === wrongId)?.name} yet. Another producer finds it harder to raise output quickly. Read each note again: who needs the longest, or has the least room, to make more?
          </Fb>
        )}
      </section>

      {rankDone && (
        <section class="panel stack" aria-labelledby="ss-race-h">
          <h3 id="ss-race-h"><StepNo n={3} /> Watch the race</h3>
          <Fb ok={!rankMissed}>{rankMissed ? 'Ranking done, after a slip. ' : 'Right first time. '}{r.rankWhy}</Fb>
          <div class="ss-track" role="list" aria-label="How far output rises">
            {ranked.map((id) => {
              const p = r.producers.find((x) => x.id === id)!;
              const pctQ = round2(p.pes * r.priceRise);
              const share = raceShare(pctQ, maxPct);
              return (
                <div key={id} class="ss-lane" role="listitem">
                  <span class="ss-lane-name"><span aria-hidden="true">{p.icon}</span> {p.name}</span>
                  <div class="ss-road" aria-hidden="true">
                    <span class="ss-runner" style={{ left: go ? `calc(${(share * 100).toFixed(1)}% - ${(share * 34).toFixed(1)}px)` : '0px' }}>{p.icon}</span>
                  </div>
                  <span class="ss-lane-result">
                    Output +{fmt(pctQ)}%. PES = {fmt(pctQ)} ÷ {r.priceRise} = <strong>{fmt(p.pes)}</strong>
                  </span>
                </div>
              );
            })}
          </div>
          <p class="small muted" style={{ margin: 0 }}>These PES values are examples to show the idea, not measured data.</p>
        </section>
      )}

      {rankDone && (
        <section class="panel stack" aria-labelledby="ss-det-h">
          <h3 id="ss-det-h"><StepNo n={4} /> What explains the ranking?</h3>
          <p class="small muted" style={{ margin: 0 }}>Choose the main determinant of PES that differs between these producers.</p>
          <div class="choice-grid" role="group" aria-label="Determinants of PES">
            {DETERMINANTS.map((d) => (
              <button
                key={d}
                type="button"
                class={`choice-btn ${det === d && !detSolved ? 'shake chosen' : ''} ${detSolved && d === r.determinant ? 'choice-right' : ''}`}
                disabled={detSolved}
                onClick={() => pickDet(d)}
              >
                <span aria-hidden="true">{data.determinantIcons[d]}</span> {data.determinantNames[d]}
                {teacher && !detSolved && d === r.determinant && <AnswerBadge />}
              </button>
            ))}
          </div>
          {det && !detSolved && <Fb ok={false}>Not {data.determinantNames[det].toLowerCase()}. {r.detHint}</Fb>}
          {detSolved && (
            <div class="stack">
              <Fb ok><strong>{data.determinantNames[r.determinant]}.</strong> <Md text={r.detWhy} inline /></Fb>
              <div><button class="btn" onClick={next}>{ri + 1 < rounds.length ? 'Next round' : 'Finish'}</button></div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ---------------- Level 2: time machine ----------------

const PERIOD_ICON: Record<Period, string> = { momentary: '⏱️', short: '📅', long: '🗓️' };
const CURVE_NAME: Record<Period, string> = { momentary: 'S₁', short: 'S₂', long: 'S₃' };
const P0 = 30, P1 = 45, BASE = 35;

/** The supply curves pivot through the starting point. Each new one swings in from the last. */
function TimeDiagram(props: { t: TimeProducer; reached: number }) {
  const { t, reached } = props;
  const targets = PERIODS.map((p) => pivotQ(round2(pesIn(t, p)), BASE));
  const latest = reached >= 0 ? targets[reached] : BASE;
  const [q, setQ] = useState(latest);
  const prev = useRef(latest);
  useEffect(() => {
    const from = prev.current;
    prev.current = latest;
    if (reducedMotion() || from === latest) {
      setQ(latest);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 1000);
      const e = 1 - Math.pow(1 - k, 3);
      setQ(from + (latest - from) * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [latest]);

  const desc = reached < 0
    ? 'The starting point at price P0 and quantity Q0. An arrow shows the price rising to P1.'
    : `Supply curves through the starting point. ${PERIODS.slice(0, reached + 1).map((p, i) => `${CURVE_NAME[p]} for the ${p === 'momentary' ? 'momentary period' : p === 'short' ? 'short run' : 'long run'}${i === 0 ? ' is vertical' : ''}`).join('. ')}. Each later curve is flatter.`;
  return (
    <Diagram xMax={110} yMax={60} xLabel="Quantity supplied" yLabel="Price" title={`Supply of the ${t.name.toLowerCase()} over time`} description={desc}>
      {reached >= 0 && <Guide at={{ q: latest, p: P1 }} yText="P₁" xText={reached > 0 && latest - BASE >= 9 ? 'Q₁' : undefined} />}
      <Guide at={{ q: BASE, p: P0 }} yText="P₀" xText="Q₀" />
      {PERIODS.slice(0, Math.max(0, reached)).map((p, i) => (
        <Curve key={p} line={{ a: { q: BASE, p: P0 }, b: { q: targets[i], p: P1 } }} tone="grey" dashed width={2} label={CURVE_NAME[p]} labelOffset={{ dx: -8, dy: -8 }} />
      ))}
      {reached >= 0 && (
        <Curve line={{ a: { q: BASE, p: P0 }, b: { q, p: P1 } }} tone="red" width={3.5} label={CURVE_NAME[PERIODS[reached]]} labelOffset={{ dx: 6, dy: 14 }} />
      )}
      {reached < 0 && <Arrow from={{ q: 8, p: P0 }} to={{ q: 8, p: P1 }} tone="red" />}
      {reached < 0 && <Label at={{ q: 11, p: (P0 + P1) / 2 }} text="price rises" tone="red" bold />}
      <Dot at={{ q: BASE, p: P0 }} />
      {reached >= 0 && <Dot at={{ q, p: P1 }} tone="red" />}
    </Diagram>
  );
}

function TimeMachine({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const producers = useMemo(() => shuffled(data.timeProducers, seed + 9), [data.timeProducers, seed]);
  const [pi, setPi] = useState(0);
  const [stage, setStage] = useState(0);
  const [reached, setReached] = useState(-1);
  const [pick, setPick] = useState<number | null>(null);
  const [missed, setMissed] = useState(false);
  const [firstRight, setFirstRight] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const t = producers[pi];
  const period = PERIODS[stage];
  const options = useMemo(() => shuffled(t.options[period], seed * 5 + pi * 3 + stage), [t, period, seed, pi, stage]);
  const solved = pick !== null && !!options[pick].correct;
  const output = reached >= 0 ? outputIn(t, PERIODS[reached]) : t.q0;
  const shownOut = useCountUp(output);
  const icons = Math.max(1, Math.round((output / t.q0) * 4));
  const total = producers.length * PERIODS.length;

  const choose = (i: number) => {
    if (solved) return;
    setPick(i);
    const o = options[i];
    if (o.correct) {
      play('correct');
      if (!missed) setFirstRight((n) => n + 1);
      setReached(stage);
      const q = outputIn(t, period);
      setAnnounce(`Right. ${data.periodNames[period]}: output is ${fmt(q)} ${t.unit}. PES = ${fmt(round2(pesIn(t, period)))}.`);
    } else {
      play('wrong');
      setMissed(true);
      setAnnounce(o.feedback);
    }
  };

  const next = () => {
    play('whoosh');
    setPick(null);
    setMissed(false);
    if (stage + 1 < PERIODS.length) {
      setStage(stage + 1);
      setAnnounce(`The time machine moves on to the ${data.periodNames[PERIODS[stage + 1]].toLowerCase()}.`);
    } else if (pi + 1 < producers.length) {
      setPi(pi + 1);
      setStage(0);
      setReached(-1);
      setAnnounce('A new producer steps into the time machine.');
    } else {
      setDone(true);
      onComplete();
      if (timeWon(firstRight)) win(onGoal, 2);
    }
  };

  if (done) {
    return (
      <Finish
        won={timeWon(firstRight)}
        title={['Time Traveller!', 'Journey finished.']}
        line={`Right first time: ${firstRight} of ${total}.`}
        need={`The ${STAMP_NAMES[1]} stamp needs ${TIME_GOAL} right first time.`}
        again={again}
      />
    );
  }

  const pesNow = reached >= 0 ? round2(pesIn(t, PERIODS[reached])) : null;
  const pctPrice = round2(((t.p1 - t.p0) / t.p0) * 100);

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2. Producer {pi + 1} of {producers.length}, {data.periodNames[period].toLowerCase()}. Right first time: {firstRight} (goal {TIME_GOAL} of {total}).
      </p>
      <div class="play">
        <section class="panel stack" aria-labelledby="ss-tm-h">
          <h3 id="ss-tm-h"><StepNo n={2} /> The time machine: {t.name}</h3>
          <PriceBanner text={`Price up from ${money(t.p0)} to ${money(t.p1)} ${t.priceUnit} (+${fmt(pctPrice)}%)`} />
          <ol class="ss-dial" aria-label="Time periods">
            {PERIODS.map((p, i) => (
              <li key={p} class={`${i === stage ? 'on' : ''} ${i <= reached ? 'done' : ''}`} aria-current={i === stage ? 'step' : undefined}>
                <span class={`ss-dial-icon ${i === stage ? 'ss-tick-tock' : ''}`} aria-hidden="true">{PERIOD_ICON[p]}</span>
                <strong>{data.periodNames[p]}</strong>
                {i <= reached && <span class="sr-only"> (done)</span>}
              </li>
            ))}
          </ol>
          <div class="ss-farm" aria-hidden="true">
            {Array.from({ length: icons }, (_, i) => <span key={`${t.id}-${i}`} class="ss-grow" style={{ animationDelay: `${(i % 4) * 0.08}s` }}>{t.icon}</span>)}
          </div>
          <p class="ss-output" aria-live="off">
            Output: <strong>{fmt(Math.round(shownOut))}</strong> {t.unit}
            {pesNow !== null && <span class="ss-pes-chip">PES {fmt(pesNow)}</span>}
          </p>
          <TimeDiagram key={t.id} t={t} reached={reached} />
          <p class="small muted" style={{ margin: 0 }}>
            {PERIODS.map((p) => `${CURVE_NAME[p]}: ${data.periodNames[p].toLowerCase()}`).join('. ')}. Not drawn to scale. The curves turn about the starting point.
          </p>
        </section>
        <section class="panel stack" aria-labelledby="ss-q-h">
          <h3 id="ss-q-h"><StepNo n={3} /> {data.periodNames[period]}: what can the producer do?</h3>
          <p class="ss-period-hint"><span aria-hidden="true">{PERIOD_ICON[period]}</span> {data.periodHints[period]}</p>
          <div key={`${t.id}-${period}`} class="stack" role="group" aria-label="What the producer can do">
            {options.map((o, i) => (
              <button
                key={i}
                type="button"
                class={`choice-btn ${pick === i && !o.correct ? 'shake chosen' : ''} ${solved && o.correct ? 'choice-right' : ''}`}
                disabled={solved}
                onClick={() => choose(i)}
              >
                {o.text}
                {teacher && !solved && o.correct && <AnswerBadge />}
              </button>
            ))}
          </div>
          {pick !== null && <Fb ok={solved}>{options[pick].feedback}</Fb>}
          {solved && (
            <div class="stack">
              <p class="small" style={{ margin: 0 }}>
                Output {fmt(t.q0)} to {fmt(outputIn(t, period))} {t.unit}: PES = {fmt(round2(pesIn(t, period)))}.
              </p>
              <div>
                <button class="btn" onClick={next}>
                  {stage + 1 < PERIODS.length ? `Go to the ${data.periodNames[PERIODS[stage + 1]].toLowerCase()}` : pi + 1 < producers.length ? 'Next producer' : 'Finish'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------- Level 3: measure it ----------------

function Gauge(props: { value: number | null; label: string }) {
  const angle = props.value === null ? -90 : gaugeAngle(props.value);
  return (
    <figure class="ss-gauge" role="img" aria-label={props.value === null ? 'Supply speedometer, waiting for your answer' : `Supply speedometer: PES ${fmt(props.value)}, ${props.label}`}>
      <svg viewBox="0 -18 200 138" aria-hidden="true">
        <path d="M20 100a80 80 0 0180-80" fill="none" stroke="#c9d6ea" stroke-width="18" />
        <path d="M100 20a80 80 0 0180 80" fill="none" stroke="#f4c9d0" stroke-width="18" />
        <path d="M100 8v24" stroke="#1a1f29" stroke-width="3" />
        <text x="100" y="-4" text-anchor="middle" font-size="13" fill="#1a1f29">1</text>
        <text x="20" y="116" text-anchor="middle" font-size="13" fill="#1a1f29">0</text>
        <text x="180" y="116" text-anchor="middle" font-size="13" fill="#1a1f29">∞</text>
        <text x="4" y="4" text-anchor="start" font-size="11" fill="#1B3A6B" font-weight="700">inelastic</text>
        <text x="196" y="4" text-anchor="end" font-size="11" fill="#C8102E" font-weight="700">elastic</text>
        <g class="ss-needle" style={{ transform: `rotate(${angle}deg)` }}>
          <path d="M100 100L100 30" stroke="#1a1f29" stroke-width="4" stroke-linecap="round" />
        </g>
        <circle cx="100" cy="100" r="7" fill="#1a1f29" />
      </svg>
      <figcaption class="small">{props.value === null ? 'PES = ?' : <>PES = <strong>{fmt(props.value)}</strong>: {props.label}</>}</figcaption>
    </figure>
  );
}

const SLIP_TEXT: Record<string, string> = {
  inverted: 'This is upside down. You divided the % change in price by the % change in quantity. Put the % change in quantity supplied on top.',
  absolute: 'You used changes in units, not % changes. Work out each % change first.',
  pctQ: 'That is the % change in quantity supplied. Now divide it by the % change in price.',
  pctP: 'That is the % change in price. It goes on the bottom of the formula.',
  negative: 'PES is positive: price and quantity supplied move in the same direction.',
  other: 'Not yet. Work out the % change in quantity supplied and the % change in price, then divide.',
  divided: 'You divided. Rearrange the formula: % change in quantity supplied = PES × % change in price.',
  flipped: 'You divided PES by the % change in price. Multiply them instead.',
  otherRev: 'Not yet. % change in quantity supplied = PES × % change in price.',
};

function Measure({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const rounds = useMemo(() => shuffled(data.measureRounds, seed + 13), [data.measureRounds, seed]);
  const [ri, setRi] = useState(0);
  const [step, setStep] = useState(0);
  const [missed, setMissed] = useState(false);
  const [typed, setTyped] = useState('');
  const [numFb, setNumFb] = useState<string | null>(null);
  const [numDone, setNumDone] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [cls, setCls] = useState<PesClass | null>(null);
  const [solvedCount, setSolvedCount] = useState(0);
  const [roundDone, setRoundDone] = useState(false);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const r = rounds[ri];

  const pesValue = r.kind === 'calc' ? round2(pesFromData(r.p0, r.p1, r.q0, r.q1)) : r.kind === 'reverse' ? r.pes : null;
  const numAnswer = r.kind === 'calc' ? pesValue! : r.kind === 'reverse' ? round2(r.pes * r.pctPrice) : null;
  const rightClass = pesValue !== null ? classifyPes(pesValue) : null;

  const finishRound = (missedNow: boolean) => {
    setRoundDone(true);
    if (!missedNow) setSolvedCount((n) => n + 1);
    play('correct');
  };

  const checkNum = () => {
    if (numDone || numAnswer === null) return;
    const v = parseNumber(typed);
    if (v === null) {
      setNumFb('Type a number, for example 0.5 or 2.');
      return;
    }
    let slip: string;
    if (r.kind === 'calc') slip = diagnosePes(v, r);
    else {
      const s = diagnoseReverse(v, (r as ReverseRound).pes, (r as ReverseRound).pctPrice);
      slip = s === 'other' ? 'otherRev' : s;
    }
    if (slip === 'right') {
      play('coin');
      setNumDone(true);
      setNumFb(null);
      setAnnounce(`Right: ${fmt(numAnswer)}. Now classify the supply.`);
    } else {
      play('wrong');
      setMissed(true);
      setNumFb(SLIP_TEXT[slip]);
      setAnnounce(SLIP_TEXT[slip]);
    }
  };

  const pickClass = (c: PesClass) => {
    if (roundDone || !rightClass) return;
    setCls(c);
    if (c === rightClass) {
      setAnnounce(`Right: ${data.classNames[c]}.`);
      finishRound(missed);
    } else {
      play('wrong');
      setMissed(true);
      setAnnounce(`Not ${data.classNames[c]}.`);
    }
  };

  const pickOption = (i: number) => {
    if (r.kind !== 'choice' || roundDone) return;
    const st = r.steps[step];
    if (pick !== null && st.options[pick].correct) return;
    setPick(i);
    const o = st.options[i];
    if (!o.correct) {
      play('wrong');
      setMissed(true);
      setAnnounce(o.feedback);
      return;
    }
    setAnnounce(o.feedback);
    if (step + 1 >= r.steps.length) finishRound(missed);
    else play('pop');
  };

  const nextStep = () => {
    play('tap');
    setStep(step + 1);
    setPick(null);
  };

  const next = () => {
    play('whoosh');
    setStep(0);
    setMissed(false);
    setTyped('');
    setNumFb(null);
    setNumDone(false);
    setPick(null);
    setCls(null);
    setRoundDone(false);
    if (ri + 1 < rounds.length) {
      setRi(ri + 1);
      setAnnounce('Next round.');
    } else {
      setDone(true);
      onComplete();
      if (measureWon(solvedCount)) win(onGoal, 3);
    }
  };

  if (done) {
    return (
      <Finish
        won={measureWon(solvedCount)}
        title={['PES Pro!', 'Measuring finished.']}
        line={`Rounds solved with no wrong try: ${solvedCount} of ${rounds.length}.`}
        need={`The ${STAMP_NAMES[2]} stamp needs ${MEASURE_GOAL}.`}
        again={again}
      />
    );
  }

  const choiceStep = r.kind === 'choice' ? r.steps[step] : null;
  const choiceSolved = choiceStep !== null && pick !== null && !!choiceStep.options[pick].correct;
  const pctQ = r.kind === 'calc' ? round2(((r.q1 - r.q0) / r.q0) * 100) : 0;
  const pctP = r.kind === 'calc' ? round2(((r.p1 - r.p0) / r.p0) * 100) : 0;

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3. Round {ri + 1} of {rounds.length}. Solved with no wrong try: {solvedCount} (goal {MEASURE_GOAL}).
      </p>
      <div class="play">
        <section class="panel stack" aria-labelledby="ss-data-h">
          <h3 id="ss-data-h">
            <StepNo n={2} /> {r.kind === 'choice' ? 'Compare the producers' : 'Read the results'}: {r.name} {r.hl && <HlBadge />}
          </h3>
          <div key={r.id} class="ss-results ss-in">
            <span class="ss-results-icon" aria-hidden="true">{r.icon}</span>
            {r.kind === 'calc' && (
              <div class="table-scroll">
                <table class="table">
                  <caption class="small muted" style={{ textAlign: 'left' }}>{r.period}</caption>
                  <thead><tr><th scope="col"></th><th scope="col">Price ({r.priceUnit})</th><th scope="col">Quantity supplied ({r.unit})</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">Before</th><td>{money(r.p0)}</td><td>{fmt(r.q0)}</td></tr>
                    <tr><th scope="row">After</th><td>{money(r.p1)}</td><td>{fmt(r.q1)}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
            {r.kind === 'reverse' && (
              <p style={{ margin: 0 }}>
                {r.period}: this producer's PES is <strong>{fmt(r.pes)}</strong>. The price rises by <strong>{fmt(r.pctPrice)}%</strong>.
              </p>
            )}
            {r.kind === 'choice' && (
              <p class="ss-vs" aria-hidden="true"><span>☕🌱</span> <span class="ss-vs-mid">or</span> <span>📱🏭</span></p>
            )}
          </div>
          {r.kind !== 'choice' && <Gauge value={numDone && r.kind === 'calc' ? pesValue : r.kind === 'reverse' && numDone ? r.pes : null} label={rightClass ? data.classNames[rightClass].toLowerCase() : ''} />}
          {r.kind === 'choice' && <p class="small" style={{ margin: 0 }}><strong>Primary commodities</strong> come from farms, mines, forests and the sea. <strong>Manufactured products</strong> are made in factories.</p>}
        </section>

        <section class="panel stack" aria-labelledby="ss-work-h">
          {r.kind !== 'choice' && (
            <>
              <h3 id="ss-work-h"><StepNo n={3} /> {r.kind === 'calc' ? 'Calculate PES' : 'Find the % change in quantity supplied'}</h3>
              <p class="ss-formula">
                {r.kind === 'calc' ? <>PES = <span class="ss-frac"><span>% change in quantity supplied</span><span>% change in price</span></span></> : <>% change in quantity supplied = PES × % change in price</>}
              </p>
              <form
                class="ss-answer"
                onSubmit={(e) => {
                  e.preventDefault();
                  checkNum();
                }}
              >
                <label for={`ss-num-${r.id}`}>{r.kind === 'calc' ? 'PES =' : '% change in quantity supplied ='}</label>
                <input
                  id={`ss-num-${r.id}`}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={typed}
                  disabled={numDone}
                  onInput={(e) => setTyped((e.target as HTMLInputElement).value)}
                  style={{ width: '7em' }}
                />
                {r.kind === 'reverse' && <span aria-hidden="true">%</span>}
                <button type="submit" class="btn" disabled={numDone}>Check</button>
                {teacher && !numDone && <AnswerBadge text={`Answer: ${numAnswer}`} />}
              </form>
              {numFb && <Fb ok={false}>{numFb}</Fb>}
              {numDone && r.kind === 'calc' && (
                <Fb ok>% change in quantity supplied = {fmt(pctQ)}%. % change in price = {fmt(pctP)}%. PES = {fmt(pctQ)} ÷ {fmt(pctP)} = <strong>{fmt(pesValue!)}</strong>.</Fb>
              )}
              {numDone && r.kind === 'reverse' && <Fb ok>{fmt(r.pes)} × {fmt(r.pctPrice)} = <strong>{fmt(numAnswer!)}%</strong>.</Fb>}
            </>
          )}
          {r.kind !== 'choice' && numDone && (
            <div class="stack">
              <h3><StepNo n={4} /> What kind of supply is it?</h3>
              <div class="ss-classes" role="group" aria-label="Kinds of supply">
                {PES_CLASSES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    class={`choice-btn ${cls === c && c !== rightClass ? 'shake chosen' : ''} ${roundDone && c === rightClass ? 'choice-right' : ''}`}
                    disabled={roundDone}
                    onClick={() => pickClass(c)}
                  >
                    <strong>{data.classNames[c]}</strong> <span class="small">({data.classRanges[c]})</span>
                    {teacher && !roundDone && c === rightClass && <AnswerBadge />}
                  </button>
                ))}
              </div>
              {cls && cls !== rightClass && !roundDone && (
                <Fb ok={false}>Not {data.classNames[cls].toLowerCase()}: that means {data.classRanges[cls]}. Here PES = {fmt(pesValue!)}.</Fb>
              )}
            </div>
          )}

          {choiceStep && (
            <>
              <h3 id="ss-work-h"><StepNo n={3 + step} /> Question {step + 1} of {(r as ChoiceRound).steps.length} <HlBadge /></h3>
              <p style={{ margin: 0 }}><Md text={choiceStep.prompt} inline /></p>
              <div key={`${r.id}-${step}`} class="stack" role="group" aria-label="Answers">
                {choiceStep.options.map((o, i) => (
                  <button
                    key={i}
                    type="button"
                    class={`choice-btn ${pick === i && !o.correct ? 'shake chosen' : ''} ${choiceSolved && o.correct ? 'choice-right' : ''}`}
                    disabled={choiceSolved}
                    onClick={() => pickOption(i)}
                  >
                    {o.text}
                    {teacher && !choiceSolved && o.correct && <AnswerBadge />}
                  </button>
                ))}
              </div>
              {pick !== null && <Fb ok={choiceSolved}>{choiceStep.options[pick].feedback}</Fb>}
              {choiceSolved && !roundDone && <div><button class="btn" onClick={nextStep}>Next question</button></div>}
            </>
          )}

          {roundDone && (
            <div class="stack">
              <Fb ok>{rightClass && <strong>{data.classNames[rightClass]}. </strong>}<Md text={r.why} inline /></Fb>
              <div><button class="btn" onClick={next}>{ri + 1 < rounds.length ? 'Next round' : 'Finish'}</button></div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------- Learn it ----------------

const LEARN_LINES: Record<PesClass, { a: { q: number; p: number }; b: { q: number; p: number }; label: string; text: string }> = {
  'perfectly-inelastic': { a: { q: 50, p: 0 }, b: { q: 50, p: 100 }, label: 'PES = 0', text: 'Vertical: quantity supplied does not change at all, whatever the price. Example: seats in a stadium tonight.' },
  inelastic: { a: { q: 30, p: 0 }, b: { q: 50, p: 50 }, label: 'PES < 1', text: 'Steep, and it starts on the quantity axis: quantity changes by a smaller % than price. Example: a coffee farm in the short run.' },
  unit: { a: { q: 0, p: 0 }, b: { q: 50, p: 50 }, label: 'PES = 1', text: 'A straight line from the origin: quantity changes by the same % as price, at every point on the line.' },
  elastic: { a: { q: 0, p: 30 }, b: { q: 50, p: 50 }, label: 'PES > 1', text: 'Gentle, and it starts on the price axis: quantity changes by a bigger % than price. Example: a factory with idle machines.' },
  'perfectly-elastic': { a: { q: 0, p: 50 }, b: { q: 100, p: 50 }, label: 'PES = ∞', text: 'Horizontal: firms supply any quantity at this price, but nothing at a lower price.' },
};

function LearnDiagram() {
  const [sel, setSel] = useState<PesClass>('inelastic');
  const names: Record<PesClass, string> = {
    'perfectly-inelastic': 'Perfectly inelastic', inelastic: 'Inelastic', unit: 'Unit elastic', elastic: 'Elastic', 'perfectly-elastic': 'Perfectly elastic',
  };
  const line = LEARN_LINES[sel];
  return (
    <div class="stack">
      <div class="ss-learn-picks" role="group" aria-label="Choose a value of PES">
        {PES_CLASSES.map((c) => (
          <button key={c} type="button" class="choice-btn btn-sm" aria-pressed={sel === c} onClick={() => { play('tap'); setSel(c); }}>
            {names[c]} <span class="small">({LEARN_LINES[c].label})</span>
          </button>
        ))}
      </div>
      <Diagram
        xMax={100}
        yMax={100}
        xLabel="Quantity supplied"
        yLabel="Price ($)"
        title="Supply curves with different PES"
        description={`Five straight supply curves through the same point, shown faint. Highlighted: ${names[sel]} supply, ${line.label}. ${line.text}`}
      >
        {PES_CLASSES.filter((c) => c !== sel).map((c) => <Curve key={c} line={LEARN_LINES[c]} tone="grey" width={2} ghost dashed />)}
        <Curve line={line} tone="red" width={4} label={line.label} labelOffset={sel === 'perfectly-inelastic' ? { dx: 8, dy: 20 } : sel === 'perfectly-elastic' ? { dx: -70, dy: -10 } : { dx: -60, dy: 4 }} />
        <Dot at={{ q: 50, p: 50 }} />
      </Diagram>
      <p class="callout" style={{ margin: 0 }}><strong>{names[sel]} ({line.label}).</strong> {line.text}</p>
    </div>
  );
}

export { Try, LearnDiagram };
