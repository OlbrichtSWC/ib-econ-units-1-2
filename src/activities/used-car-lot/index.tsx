/**
 * Used Car Lot (2.10, HL): asymmetric information, adverse selection and moral hazard.
 *
 * A used car lot sits above levels 1 and 2. The student sees what sellers know (good, fair or lemon);
 * buyers do not.
 * Level 1: work out the most buyers will pay (the expected value), then predict which owners drive away.
 *          The cars that leave drive off the lot and the spiral goes round again.
 * Level 2: name the response in each case (signalling, screening, legislation and regulation,
 *          provision of information). Each right answer brings a good car back.
 * Level 3: adverse selection or moral hazard? Then choose the response that fits.
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
import { play } from '../../shared/fun/sound';
import { shuffled } from '../island-economy/model';
import {
  Actor, BID_GOAL, bidWon, expectedValue, Grade, HAZARD_GOAL, hazardWon, leaveOptions, Lot, money, POINTS_PER_HAZARD_CASE, PriceKind, priceOptions,
  Problem, problemFor, PROBLEMS, questionsPerLot, Response, responseFor, RESPONSES, sameGrades, shareGood, SIGNAL_GOAL, signalWon, spiral, totalCars,
  trust,
} from './model';
import './lot.css';

const STAMP_NAMES = ['Smart Buyer', 'Signal Reader', 'Risk Watcher'];

interface Opt { text: string; correct?: boolean; feedback: string }
interface LotData { id: string; name: string; intro: string; types: Lot; why: { prompt: string; options: Opt[] } }
interface Case { id: string; icon: string; text: string; actor: Actor; act: 'rule' | 'facts'; why: string }
interface Hazard { id: string; icon: string; text: string; hidden: 'before' | 'after'; why: string; options: Opt[] }

interface TryContent {
  levels: LevelInfo[];
  gradeNames: Record<Grade, string>;
  priceWrong: Record<Exclude<PriceKind, 'expected'>, string>;
  lots: LotData[];
  responseNames: Record<Response, string>;
  responseHints: Record<Response, string>;
  responseWrong: Record<Response, string>;
  cases: Case[];
  problemNames: Record<Problem, string>;
  problemHints: Record<Problem, string>;
  problemWrong: Record<Problem, string>;
  hazards: Hazard[];
}

const GRADE_ICON: Record<Grade, string> = { good: '★', fair: '◆', lemon: '🍋' };
const RESPONSE_ICON: Record<Response, string> = { signalling: '📣', screening: '🔍', legislation: '⚖️', information: '📢' };
const PROBLEM_ICON: Record<Problem, string> = { adverse: '🍋', moral: '🎲' };

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
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="car" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <BidBlind key={round} seed={round} {...props} />}
      {levelNo === 2 && <Signals key={round} seed={round} {...props} />}
      {levelNo === 3 && <MoralHazard key={round} seed={round} {...props} />}
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

function Answer(props: { show: boolean }) {
  return props.show ? <span class="badge badge-done">Answer</span> : null;
}

// ---------------- The car lot picture ----------------

const PAINT = ['#C8102E', '#1B3A6B', '#2a8a7a', '#e0a000', '#6a4c93', '#d9622b', '#3d7fc4', '#7a8b2e'];
const SLOT_X = (i: number) => 22 + (i % 6) * 114;
const SLOT_Y = (i: number) => 126 + Math.floor(i / 6) * 76;

export interface LotCar { id: string; grade: Grade | null; gone: boolean; arrive?: boolean }

/** One car, drawn at the origin, about 88 by 40. Its tag shows what the seller knows. */
function Car(props: { grade: Grade | null; paint: string; names: Record<Grade, string>; motion: 'drive' | 'arrive' | null }) {
  const label = props.grade ? `${GRADE_ICON[props.grade]} ${props.names[props.grade].replace(' car', '')}` : '?';
  return (
    <g class={props.motion === 'drive' ? 'ucl-bounce' : ''}>
      <line x1="44" y1="-8" x2="44" y2="4" stroke="#556" stroke-width="1.5" />
      <rect x="14" y="-26" width="60" height="19" rx="5" fill="#fff" stroke="#1b2638" stroke-width="1.5" />
      <text x="44" y="-12" text-anchor="middle" font-size="12" font-weight="700" fill="#1b2638">{label}</text>
      <path d="M4 30V21q2-6 10-7h10L35 5h28l11 9 8 2q5 2 5 8v6z" fill={props.paint} stroke="#1b2638" stroke-width="2" />
      <path d="M30 14l7-6h10v6zM51 14V8h11l7 6z" fill="#d8e9f7" />
      <rect x="80" y="19" width="6" height="4" rx="1" fill="#ffe08a" />
      <g class={props.motion === 'drive' ? 'ucl-wheel' : props.motion === 'arrive' ? 'ucl-wheel ucl-wheel-brief' : ''}>
        <circle cx="22" cy="31" r="7.5" fill="#222" />
        <path d="M22 25v12M16 31h12" stroke="#999" stroke-width="2" />
      </g>
      <g class={props.motion === 'drive' ? 'ucl-wheel' : props.motion === 'arrive' ? 'ucl-wheel ucl-wheel-brief' : ''}>
        <circle cx="68" cy="31" r="7.5" fill="#222" />
        <path d="M68 25v12M62 31h12" stroke="#999" stroke-width="2" />
      </g>
    </g>
  );
}

function CarLot(props: { cars: LotCar[]; names: Record<Grade, string>; sign: string; signTop: string; title: string; description: string }) {
  return (
    <svg class="ucl-lot" viewBox="0 0 720 320" role="img" aria-labelledby="ucl-lot-t ucl-lot-d">
      <title id="ucl-lot-t">{props.title}</title>
      <desc id="ucl-lot-d">{props.description}</desc>
      <rect x="0" y="0" width="720" height="110" fill="#cfe6f7" />
      <circle cx="60" cy="40" r="20" fill="#ffd23f" />
      <g class="ucl-cloud"><ellipse cx="200" cy="34" rx="34" ry="12" fill="#fff" /><ellipse cx="222" cy="28" rx="20" ry="10" fill="#fff" /></g>
      {/* Bunting */}
      <path d="M100 70 Q260 92 440 70" fill="none" stroke="#556" stroke-width="1.5" />
      {Array.from({ length: 9 }, (_, i) => {
        const x = 112 + i * 36;
        const y = 70 + Math.sin(((i + 0.5) / 9) * Math.PI) * 10;
        return <path key={i} class={`ucl-flag ucl-flag${i % 3}`} d={`M${x} ${y}l14 0-7 14z`} fill={i % 2 ? '#C8102E' : '#1B3A6B'} />;
      })}
      {/* Price sign */}
      <rect x="474" y="12" width="230" height="78" rx="10" fill="#1B3A6B" stroke="#0f2445" stroke-width="3" />
      <rect x="586" y="90" width="6" height="22" fill="#556" />
      <text x="589" y="38" text-anchor="middle" font-size="15" fill="#fff" font-weight="700">{props.signTop}</text>
      <text key={props.sign} class="ucl-flip" x="589" y="74" text-anchor="middle" font-size="30" fill="#ffd23f" font-weight="700">{props.sign}</text>
      {/* Ground, bays and road */}
      <rect x="0" y="110" width="720" height="160" fill="#b9bec7" />
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i}>
          <line x1={14 + i * 114} y1="116" x2={14 + i * 114} y2="170" stroke="#fff" stroke-width="2" />
          <line x1={14 + i * 114} y1="192" x2={14 + i * 114} y2="246" stroke="#fff" stroke-width="2" />
        </g>
      ))}
      <rect x="0" y="262" width="720" height="58" fill="#4a4f59" />
      <line x1="0" y1="291" x2="720" y2="291" stroke="#f2f2f2" stroke-width="3" stroke-dasharray="22 16" />
      {props.cars.map((c, i) => {
        const x = c.gone ? 820 : SLOT_X(i);
        const y = c.gone ? 268 : SLOT_Y(i);
        return (
          <g key={c.id} class="ucl-car" style={{ transform: `translate(${x}px, ${y}px)` }}>
            <g class={c.arrive ? 'ucl-arrive' : ''}>
              <Car grade={c.grade} paint={PAINT[i % PAINT.length]} names={props.names} motion={c.gone ? 'drive' : c.arrive ? 'arrive' : null} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------- Level 1: bid blind ----------------

type BidPhase = 'price' | 'leave' | 'why';

function carsFor(lotData: LotData): { id: string; grade: Grade }[] {
  const out: { id: string; grade: Grade }[] = [];
  for (const t of lotData.types) for (let k = 0; k < t.count; k++) out.push({ id: `${lotData.id}-${t.grade}-${k}`, grade: t.grade });
  return out;
}

function leaveText(g: Grade[], names: Record<Grade, string>, onLot: number): string {
  if (g.length === 0) return 'No one: every owner sells';
  if (g.length === onLot && onLot > 1) return 'Every owner drives away';
  const list = g.map((x) => names[x].toLowerCase().replace(' car', ''));
  const joined = list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)} car owners drive away`.replace('Lemon car owners', 'Lemon owners');
}

function sumText(lot: Lot): string {
  const n = totalCars(lot);
  const parts = lot.map((c) => `${c.count} × ${money(c.worth)}`).join(' + ');
  return lot.length === 1 ? `Every car is a ${lot[0].grade === 'lemon' ? 'lemon' : lot[0].grade + ' car'}, so the expected value is its worth, ${money(lot[0].worth)}.` : `(${parts}) ÷ ${n} = ${money(expectedValue(lot))}.`;
}

function BidBlind({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const lots = data.lots;
  const total = useMemo(() => lots.reduce((s, l) => s + questionsPerLot(l.types), 0), [lots]);
  const goal = Math.min(BID_GOAL, total);
  const [li, setLi] = useState(0);
  const [si, setSi] = useState(0);
  const [phase, setPhase] = useState<BidPhase>('price');
  const [pick, setPick] = useState<number | null>(null);
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [firstRight, setFirstRight] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');

  const L = lots[li];
  const stages = useMemo(() => spiral(L.types), [L]);
  const st = stages[si];
  const prev = si > 0 ? stages[si - 1].price : undefined;
  const priceOpts = useMemo(() => shuffled(priceOptions(st.lot, prev), seed * 7 + li * 3 + si), [st, prev, seed, li, si]);
  const leaveOpts = useMemo(() => shuffled(leaveOptions(st.lot), seed * 5 + li + si * 2), [st, seed, li, si]);
  const whyOpts = useMemo(() => shuffled(L.why.options, seed + li * 11), [L, seed, li]);

  const stillOn = new Set(st.lot.map((c) => c.grade));
  const gonePlus = phase !== 'price' && (phase === 'why' || solved) ? new Set(st.leave) : new Set<Grade>();
  const cars: LotCar[] = carsFor(L).map((c) => ({ ...c, gone: !stillOn.has(c.grade) || gonePlus.has(c.grade) }));
  const onLot = cars.filter((c) => !c.gone);
  const goodLeft = onLot.filter((c) => c.grade === 'good').length;
  const priceKnown = phase !== 'price' || solved;

  const mark = (ok: boolean, say: string) => {
    setAnnounce(say);
    if (ok) {
      setSolved(true);
      if (!missed) setFirstRight((n) => n + 1);
    } else {
      play('wrong');
      setMissed(true);
    }
  };

  const choosePrice = (i: number) => {
    if (solved) return;
    setPick(i);
    const o = priceOpts[i];
    if (o.kind === 'expected') {
      play('coin');
      mark(true, `Right. Buyers will pay up to ${money(o.value)}.`);
    } else mark(false, data.priceWrong[o.kind]);
  };
  const chooseLeave = (i: number) => {
    if (solved) return;
    setPick(i);
    if (sameGrades(leaveOpts[i], st.leave)) {
      play(st.leave.length ? 'whoosh' : 'correct');
      mark(true, st.leave.length ? `Right. ${leaveText(st.leave, data.gradeNames, st.lot.length)}.` : 'Right. Every owner accepts the price, so no one leaves.');
    } else mark(false, 'Not quite. Compare the price with each owner\'s lowest price.');
  };
  const chooseWhy = (i: number) => {
    if (solved) return;
    setPick(i);
    const o = whyOpts[i];
    if (o.correct) play('correct');
    mark(!!o.correct, o.feedback);
  };

  const next = () => {
    play('tap');
    setPick(null);
    setSolved(false);
    setMissed(false);
    if (phase === 'price') { setPhase('leave'); return; }
    if (phase === 'leave') {
      if (si + 1 < stages.length) { setSi(si + 1); setPhase('price'); setAnnounce('A new round of bids starts.'); }
      else setPhase('why');
      return;
    }
    if (li + 1 < lots.length) {
      setLi(li + 1); setSi(0); setPhase('price');
      setAnnounce(`A new lot: ${lots[li + 1].name}.`);
      play('whoosh');
    } else {
      setDone(true);
      onComplete();
      if (bidWon(firstRight, goal)) win(onGoal, 1);
    }
  };

  if (done) {
    const won = bidWon(firstRight, goal);
    return (
      <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
        <p style={{ margin: 0 }}>
          <strong>{won ? 'Smart buying!' : 'Auction over.'}</strong> Right first time: {firstRight} of {total}.
        </p>
        {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[0]} stamp needs {goal} right first time. Play again: the options come in a new order.</p>}
        <div><button class="btn" onClick={again}>Play again</button></div>
      </div>
    );
  }

  const nOn = onLot.length;
  const desc = `${L.name}. ${nOn} cars on the lot, ${goodLeft} of them good. ${nOn - goodLeft} are fair cars or lemons. The sign shows what buyers will pay: ${priceKnown ? money(st.price) : 'not worked out yet'}.`;

  let feedback: ComponentChildren = null;
  if (pick !== null) {
    if (phase === 'price') {
      const o = priceOpts[pick];
      feedback = o.kind === 'expected'
        ? <Fb ok><strong>{money(o.value)}.</strong> Buyers cannot tell the cars apart, so they pay the expected value: {sumText(st.lot)}</Fb>
        : <Fb ok={false}>{data.priceWrong[o.kind]}</Fb>;
    } else if (phase === 'leave') {
      const ok = sameGrades(leaveOpts[pick], st.leave);
      const lines = st.lot.map((c) => `${data.gradeNames[c.grade]} owners need ${money(c.min)}: ${c.min > st.price ? 'more' : 'not more'} than ${money(st.price)}`).join('. ');
      feedback = ok
        ? <Fb ok><strong>{st.leave.length ? 'They drive away.' : 'Everyone sells.'}</strong> {lines}.{st.leave.length ? ' Cars that are worth more than the price leave, so the cars left are worse on average.' : ' The price is high enough for every owner, so the spiral stops here.'}</Fb>
        : <Fb ok={false}>An owner sells only if the price is at least their lowest price. The price is {money(st.price)}. Check each type in the table.</Fb>;
    } else {
      const o = whyOpts[pick];
      feedback = <Fb ok={!!o.correct}>{o.feedback}</Fb>;
    }
  }

  const perLot = questionsPerLot(L.types);
  const qNo = phase === 'why' ? perLot : si * 2 + (phase === 'price' ? 1 : 2);

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1. Lot {li + 1} of {lots.length}, question {qNo} of {perLot}. Right first time: {firstRight} (goal {goal}).
      </p>
      <section class="panel stack" aria-labelledby="ucl-lot-h">
        <h3 id="ucl-lot-h"><StepNo n={2} /> Watch the lot: {L.name}</h3>
        {si === 0 && phase === 'price' && <p style={{ margin: 0 }}>{L.intro}</p>}
        <CarLot cars={cars} names={data.gradeNames} signTop="Buyers pay up to" sign={priceKnown ? money(st.price) : '$ ?'} title={`${L.name}: the used car lot`} description={desc} />
        <div class="ucl-key-wrap">
          <table class="ucl-key">
            <caption class="small muted">What the sellers know (buyers cannot see the grade)</caption>
            <thead><tr><th scope="col">Car</th><th scope="col">On the lot</th><th scope="col">Worth to a buyer</th><th scope="col">Owner's lowest price</th></tr></thead>
            <tbody>
              {L.types.map((t) => {
                const n = onLot.filter((c) => c.grade === t.grade).length;
                return (
                  <tr key={t.grade} class={n === 0 ? 'ucl-gone-row' : ''}>
                    <th scope="row"><span aria-hidden="true">{GRADE_ICON[t.grade]}</span> {data.gradeNames[t.grade]}</th>
                    <td>{n === 0 ? 'none (left)' : n}</td>
                    <td>{money(t.worth)}</td>
                    <td>{money(t.min)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p class="small" style={{ margin: 0 }}>
          Good cars on the lot: <strong>{goodLeft} of {nOn}</strong> ({Math.round(shareGood(st.lot.filter((c) => !gonePlus.has(c.grade))) * 100)}%).
        </p>
      </section>

      <section class="panel stack" aria-labelledby="ucl-q-h">
        {phase === 'price' && (
          <>
            <h3 id="ucl-q-h"><StepNo n={3} /> Round {si + 1}: what is the most a buyer will pay?</h3>
            <p class="small muted" style={{ margin: 0 }}>Buyers know the mix of cars on the lot, but not which car is which.</p>
            <div class="choice-grid" role="group" aria-label="Prices">
              {priceOpts.map((o, i) => (
                <button key={`${si}-${o.kind}`} type="button" class={`choice-btn ${pick === i && o.kind !== 'expected' ? 'shake chosen' : ''} ${solved && o.kind === 'expected' ? 'choice-right' : ''}`} disabled={solved} onClick={() => choosePrice(i)}>
                  <span class="ucl-price">{money(o.value)}</span>
                  <Answer show={teacher && !solved && o.kind === 'expected'} />
                </button>
              ))}
            </div>
          </>
        )}
        {phase === 'leave' && (
          <>
            <h3 id="ucl-q-h"><StepNo n={3} /> Round {si + 1}: buyers offer {money(st.price)}. Who drives away?</h3>
            <div class="stack" role="group" aria-label="Who drives away">
              {leaveOpts.map((g, i) => {
                const right = sameGrades(g, st.leave);
                return (
                  <button key={`${si}-${g.join('-') || 'none'}`} type="button" class={`choice-btn ${pick === i && !right ? 'shake chosen' : ''} ${solved && right ? 'choice-right' : ''}`} disabled={solved} onClick={() => chooseLeave(i)}>
                    {g.length ? <span aria-hidden="true">🚗💨 </span> : <span aria-hidden="true">🤝 </span>}{leaveText(g, data.gradeNames, st.lot.length)}
                    <Answer show={teacher && !solved && right} />
                  </button>
                );
              })}
            </div>
          </>
        )}
        {phase === 'why' && (
          <>
            <h3 id="ucl-q-h"><StepNo n={3} /> Explain the lot</h3>
            <p style={{ margin: 0 }}><strong>{L.why.prompt}</strong></p>
            <div class="stack" role="group" aria-label="Explanations">
              {whyOpts.map((o, i) => (
                <button key={`${L.id}-${i}`} type="button" class={`choice-btn ${pick === i && !o.correct ? 'shake chosen' : ''} ${solved && o.correct ? 'choice-right' : ''}`} disabled={solved} onClick={() => chooseWhy(i)}>
                  {o.text}
                  <Answer show={teacher && !solved && !!o.correct} />
                </button>
              ))}
            </div>
          </>
        )}
        {feedback}
        {solved && (
          <div><button class="btn" onClick={next}>{phase === 'why' ? (li + 1 < lots.length ? 'Next lot' : 'Finish') : 'Next'}</button></div>
        )}
      </section>
    </div>
  );
}

// ---------------- Level 2: read the signals ----------------

function Signals({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const cases = useMemo(() => shuffled(data.cases, seed + 31), [data.cases, seed]);
  const goal = Math.min(SIGNAL_GOAL, cases.length);
  const [ci, setCi] = useState(0);
  const [wrong, setWrong] = useState<Response | null>(null);
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [back, setBack] = useState(0);
  const [firstRight, setFirstRight] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const c = cases[ci];
  const answer = responseFor(c.actor, c.act);

  const choose = (r: Response) => {
    if (solved) return;
    if (r === answer) {
      play('coin');
      setSolved(true);
      setWrong(null);
      setBack((n) => n + 1);
      if (!missed) setFirstRight((n) => n + 1);
      setAnnounce(`Right: ${data.responseNames[r]}. A good car drives back onto the lot.`);
    } else {
      play('wrong');
      setMissed(true);
      setWrong(r);
      setAnnounce(data.responseWrong[r]);
    }
  };

  const next = () => {
    play('tap');
    setSolved(false);
    setMissed(false);
    setWrong(null);
    if (ci + 1 < cases.length) setCi(ci + 1);
    else {
      setDone(true);
      onComplete();
      if (signalWon(firstRight, goal)) win(onGoal, 2);
    }
  };

  // Two lemons stay on the lot all along; a good car comes back for each case solved.
  const cars: LotCar[] = [
    ...cases.map((k, i) => ({ id: `good-${k.id}`, grade: 'good' as Grade, gone: i >= back, arrive: i < back })),
    { id: 'lemon-a', grade: 'lemon' as Grade, gone: false },
    { id: 'lemon-b', grade: 'lemon' as Grade, gone: false },
  ];
  const t = Math.round(trust(back, cases.length) * 100);

  if (done) {
    const won = signalWon(firstRight, goal);
    return (
      <div class="stack">
        <CarLot cars={cars} names={data.gradeNames} signTop="Buyer trust" sign={`${t}%`} title="The lot after the responses" description={`${back} good cars are back on the lot with 2 lemons.`} />
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'The lot is busy again!' : 'Cases finished.'}</strong> Right first time: {firstRight} of {cases.length}.
          </p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[1]} stamp needs {goal} right first time. Play again: the cases come in a new order.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2. Case {ci + 1} of {cases.length}. Right first time: {firstRight} (goal {goal}).
      </p>
      <section class="panel stack" aria-labelledby="ucl-l2-lot-h">
        <h3 id="ucl-l2-lot-h"><StepNo n={2} /> Bring the good cars back</h3>
        <p class="small muted" style={{ margin: 0 }}>After adverse selection, only lemons are left. Each right answer brings a good car back.</p>
        <CarLot cars={cars} names={data.gradeNames} signTop="Buyer trust" sign={`${t}%`} title="The used car lot" description={`${back} good cars are back on the lot with 2 lemons. Buyer trust is ${t}%.`} />
      </section>
      <section class="panel stack" aria-labelledby="ucl-case-h">
        <h3 id="ucl-case-h"><StepNo n={3} /> Which response is this?</h3>
        <div key={c.id} class="ucl-case ucl-in">
          <span class="ucl-case-icon" aria-hidden="true">{c.icon}</span>
          <p style={{ margin: 0 }}>{c.text}</p>
        </div>
        <div class="ucl-grid2" role="group" aria-label="Responses">
          {RESPONSES.map((r) => (
            <button key={r} type="button" class={`choice-btn ucl-choice ${wrong === r ? 'shake chosen' : ''} ${solved && r === answer ? 'choice-right' : ''}`} disabled={solved} onClick={() => choose(r)}>
              <span class="ucl-choice-icon" aria-hidden="true">{RESPONSE_ICON[r]}</span>
              <span><strong>{data.responseNames[r]}</strong><span class="small" style={{ display: 'block' }}>{data.responseHints[r]}</span></span>
              <Answer show={teacher && !solved && r === answer} />
            </button>
          ))}
        </div>
        {wrong && !solved && <Fb ok={false}>{data.responseWrong[wrong]}</Fb>}
        {solved && (
          <div class="stack">
            <Fb ok><strong>{data.responseNames[answer]}.</strong> <Md text={c.why} inline /> <em>({answer === 'signalling' || answer === 'screening' ? 'A private response.' : 'A government response.'})</em></Fb>
            <div><button class="btn" onClick={next}>{ci + 1 < cases.length ? 'Next case' : 'Finish'}</button></div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------- Level 3: moral hazard ----------------

function Timeline(props: { hidden: 'before' | 'after' | null }) {
  return (
    <div class="ucl-timeline" aria-label="When is the information hidden?">
      <div class={`ucl-zone ${props.hidden === 'before' ? 'on' : ''}`}>
        <strong>Before the deal</strong>
        <span class="small">Hidden quality or risk</span>
        {props.hidden === 'before' && <span class="ucl-pin">🔍 Hidden here</span>}
      </div>
      <div class="ucl-contract" aria-hidden="true">📝</div>
      <div class={`ucl-zone ${props.hidden === 'after' ? 'on' : ''}`}>
        <strong>After the deal</strong>
        <span class="small">Hidden behaviour</span>
        {props.hidden === 'after' && <span class="ucl-pin">🔍 Hidden here</span>}
      </div>
    </div>
  );
}

function MoralHazard({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const cases = useMemo(() => shuffled(data.hazards, seed + 41), [data.hazards, seed]);
  const max = cases.length * POINTS_PER_HAZARD_CASE;
  const goal = Math.min(HAZARD_GOAL, max);
  const [hi, setHi] = useState(0);
  const [points, setPoints] = useState(0);
  const [pWrong, setPWrong] = useState<Problem | null>(null);
  const [pMissed, setPMissed] = useState(false);
  const [pSolved, setPSolved] = useState(false);
  const [rPick, setRPick] = useState<number | null>(null);
  const [rMissed, setRMissed] = useState(false);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const h = cases[hi];
  const answer = problemFor(h.hidden);
  const opts = useMemo(() => shuffled(h.options, seed * 3 + hi), [h, seed, hi]);
  const rSolved = rPick !== null && !!opts[rPick].correct;

  const chooseProblem = (p: Problem) => {
    if (pSolved) return;
    if (p === answer) {
      play('pop');
      setPSolved(true);
      setPWrong(null);
      if (!pMissed) setPoints((n) => n + 1);
      setAnnounce(`Right: ${data.problemNames[p]}. ${h.why}`);
    } else {
      play('wrong');
      setPMissed(true);
      setPWrong(p);
      setAnnounce(data.problemWrong[p]);
    }
  };
  const chooseResponse = (i: number) => {
    if (rSolved) return;
    setRPick(i);
    const ok = !!opts[i].correct;
    play(ok ? 'correct' : 'wrong');
    if (ok && !rMissed) setPoints((n) => n + 1);
    if (!ok) setRMissed(true);
    setAnnounce(opts[i].feedback);
  };
  const next = () => {
    play('tap');
    setPWrong(null); setPMissed(false); setPSolved(false); setRPick(null); setRMissed(false);
    if (hi + 1 < cases.length) setHi(hi + 1);
    else {
      setDone(true);
      onComplete();
      if (hazardWon(points, goal)) win(onGoal, 3);
    }
  };

  if (done) {
    const won = hazardWon(points, goal);
    return (
      <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
        <p style={{ margin: 0 }}>
          <strong>{won ? 'Sharp risk watching!' : 'Cases finished.'}</strong> First-try points: {points} of {max}.
        </p>
        {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[2]} stamp needs {goal} points. Play again: the cases come in a new order.</p>}
        <div><button class="btn" onClick={again}>Play again</button></div>
      </div>
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3. Case {hi + 1} of {cases.length}. First-try points: {points} (goal {goal} of {max}).
      </p>
      <section class="panel stack" aria-labelledby="ucl-hz-h">
        <h3 id="ucl-hz-h"><StepNo n={2} /> Read the case</h3>
        <div key={h.id} class="ucl-case ucl-in">
          <span class={`ucl-case-icon ${pSolved && answer === 'moral' ? 'ucl-risky' : ''}`} aria-hidden="true">{h.icon}</span>
          <p style={{ margin: 0 }}>{h.text}</p>
        </div>
        <Timeline hidden={pSolved ? h.hidden : null} />
      </section>
      <section class="panel stack" aria-labelledby="ucl-pr-h">
        <h3 id="ucl-pr-h"><StepNo n={3} /> Adverse selection or moral hazard?</h3>
        <div class="ucl-grid2" role="group" aria-label="Problems">
          {PROBLEMS.map((p) => (
            <button key={p} type="button" class={`choice-btn ucl-choice ${pWrong === p ? 'shake chosen' : ''} ${pSolved && p === answer ? 'choice-right' : ''}`} disabled={pSolved} onClick={() => chooseProblem(p)}>
              <span class="ucl-choice-icon" aria-hidden="true">{PROBLEM_ICON[p]}</span>
              <span><strong>{data.problemNames[p]}</strong><span class="small" style={{ display: 'block' }}>{data.problemHints[p]}</span></span>
              <Answer show={teacher && !pSolved && p === answer} />
            </button>
          ))}
        </div>
        {pWrong && !pSolved && <Fb ok={false}>{data.problemWrong[pWrong]}</Fb>}
        {pSolved && <Fb ok><strong>{data.problemNames[answer]}.</strong> {h.why}</Fb>}
      </section>
      {pSolved && (
        <section class="panel stack" aria-labelledby="ucl-rs-h">
          <h3 id="ucl-rs-h"><StepNo n={4} /> Choose the best response</h3>
          <div class="stack" role="group" aria-label="Responses">
            {opts.map((o, i) => (
              <button key={`${h.id}-${i}`} type="button" class={`choice-btn ${rPick === i && !o.correct ? 'shake chosen' : ''} ${rSolved && o.correct ? 'choice-right' : ''}`} disabled={rSolved} onClick={() => chooseResponse(i)}>
                {o.text}
                <Answer show={teacher && !rSolved && !!o.correct} />
              </button>
            ))}
          </div>
          {rPick !== null && <Fb ok={rSolved}>{opts[rPick].feedback}</Fb>}
          {rSolved && <div><button class="btn" onClick={next}>{hi + 1 < cases.length ? 'Next case' : 'Finish'}</button></div>}
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
  title: 'The adverse selection spiral',
  description: 'Quality is hidden from buyers, so buyers pay an average price. Then owners of good cars leave the market. Then the average quality falls. An arrow goes back: buyers pay even less, and more good cars leave.',
  boxes: [
    { at: { q: 24, p: 50 }, w: 44, h: 10, text: 'Quality is hidden' },
    { at: { q: 76, p: 50 }, w: 44, h: 10, text: 'Average price paid' },
    { at: { q: 76, p: 12 }, w: 44, h: 10, text: 'Good cars leave' },
    { at: { q: 24, p: 12 }, w: 44, h: 10, text: 'Average quality falls' },
  ],
  arrows: [
    { from: { q: 46, p: 50 }, to: { q: 54, p: 50 } },
    { from: { q: 80, p: 44.5 }, to: { q: 80, p: 18 } },
    { from: { q: 54, p: 12 }, to: { q: 46, p: 12 } },
    { from: { q: 30, p: 17.5 }, to: { q: 62, p: 44.5 } },
  ],
  texts: [
    { at: { q: 49, p: 33 }, text: 'price falls again', anchor: 'end' },
  ],
};

function LearnDiagram() {
  return <SpecDiagram spec={LEARN_SPEC} />;
}

export { Try, LearnDiagram };
