/**
 * Streetlight Fund (2.9): public goods, the free rider problem and how governments respond.
 *
 * A dark street sits above every level. As the work gets done, its lamps light up one by one.
 * Level 1: place goods in the rival and excludable grid.
 * Level 2: a contribution game. The student and four computer neighbours choose what to give each week.
 *          The neighbours free ride more over time (rules in model.ts), so giving never lights the whole
 *          street. In the last week the council taxes everyone. A question follows every week.
 * Level 3: the council. Name direct provision or contracting out, calculate the tax per household,
 *          then judge an advantage or a disadvantage.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon, StepNo } from '../../shared/design/components';
import { SpecDiagram } from '../../shared/diagrams/SpecDiagram';
import type { DiagramSpec } from '../../shared/diagrams/SpecDiagram';
import type { TryProps } from '../../shared/activity/types';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import type { LevelInfo } from '../../shared/activity/LevelPicker';
import { celebrate } from '../../shared/fun/celebrate';
import { play } from '../../shared/fun/sound';
import { reducedMotion } from '../../shared/fun/motion';
import { shuffled } from '../island-economy/model';
import {
  BENEFIT_PER_LAMP, COUNCIL_GOAL, COUNCIL_TAX, councilTax, councilWon, ENDOWMENT, FUND_GOAL, fundWon, GIFTS, HOUSEHOLDS, Kind, LAMP_COST, LAMPS,
  numberRight, parseNumber, playWeek, POINTS_PER_CASE, progressLamps, SORT_GOAL, sortSlip, sortWon, TARGET, TaxSlip, taxMistakes, totalCost,
  VOLUNTARY_WEEKS, Way, WAYS, WEEKS, WeekResult,
} from './model';
import './street.css';

const STAMP_NAMES = ['Goods Sorter', 'Free Rider Detective', 'Town Planner'];

interface Opt { text: string; correct?: boolean; feedback: string }
interface Good { id: string; icon: string; name: string; kind: Kind; rival: string; excl: string; why: string }
interface WeekQ { prompt: string; options: Opt[] }
interface Case {
  id: string;
  icon: string;
  title: string;
  story: string;
  way: Way;
  items: number;
  itemName: string;
  costEach: number;
  households: number;
  judge: 'advantage' | 'disadvantage';
  options: Opt[];
}

interface TryContent {
  levels: LevelInfo[];
  kindNames: Record<Kind, string>;
  rivalText: string;
  exclText: string;
  goods: Good[];
  weeks: WeekQ[];
  wayNames: Record<Way, string>;
  wayHow: Record<Way, string>;
  wayWrong: Record<Way, string>;
  calcText: Record<TaxSlip | 'other', string>;
  cases: Case[];
}

const money = (v: number) => `$${Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2)}`;

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
      <LevelPicker levels={data.levels} level={levelNo} onPick={pick} stamps={stamps} teacher={teacher} icon="lamp" stampNames={STAMP_NAMES} />
      {levelNo === 1 && <Sorter key={round} seed={round} {...props} />}
      {levelNo === 2 && <Fund key={round} seed={round} {...props} />}
      {levelNo === 3 && <Council key={round} seed={round} {...props} />}
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

function Answer() {
  return <span class="badge badge-done">Answer</span>;
}

// ---------------- The street ----------------

const LAMP_X = Array.from({ length: LAMPS }, (_, i) => 60 + i * 104);
const HOUSE_X = Array.from({ length: HOUSEHOLDS }, (_, i) => 112 + i * 104);
const HOUSE_NAMES = ['You', 'Ama', 'Ben', 'Chen', 'Dev'];
const HOUSE_COLOUR = ['#7a5aa0', '#b8865a', '#4f7fa8', '#5f8f5a', '#a85a5a'];
const STARS = [[30, 24], [96, 50], [150, 18], [214, 42], [262, 14], [330, 36], [388, 20], [446, 48], [500, 16], [548, 60], [620, 92], [20, 86]];

/** Lamps light one at a time, with a short pause, unless the device asks for less motion. */
function useStepTo(target: number) {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  useEffect(() => {
    if (target <= shownRef.current || reducedMotion()) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const id = setInterval(() => {
      shownRef.current += 1;
      setShown(shownRef.current);
      play('pop');
      if (shownRef.current >= target) clearInterval(id);
    }, 320);
    return () => clearInterval(id);
  }, [target]);
  return shown;
}

/** The street at night. `lit` lamps glow. `gifts` (optional) shows what each house paid this week. */
function Street(props: { lit: number; gifts?: number[]; banner?: string }) {
  const shown = useStepTo(props.lit);
  const desc = `A street at night with ${HOUSEHOLDS} houses and ${LAMPS} lamps. ${props.lit} of ${LAMPS} lamps are lit.${
    props.gifts ? ` This week: ${props.gifts.map((g, i) => `${HOUSE_NAMES[i]} paid ${money(g)}`).join(', ')}.` : ''
  } The light reaches every house.`;
  return (
    <svg class="sf-street" viewBox="0 0 640 250" role="img" aria-labelledby="sf-street-t sf-street-d">
      <title id="sf-street-t">The street</title>
      <desc id="sf-street-d">{desc}</desc>
      <defs>
        <linearGradient id="sf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0b1730" />
          <stop offset="1" stop-color="#22355c" />
        </linearGradient>
        <radialGradient id="sf-halo">
          <stop offset="0" stop-color="#ffe680" stop-opacity="0.85" />
          <stop offset="0.45" stop-color="#ffd34d" stop-opacity="0.3" />
          <stop offset="1" stop-color="#ffd34d" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="sf-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffe680" stop-opacity="0.45" />
          <stop offset="1" stop-color="#ffe680" stop-opacity="0.08" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="640" height="200" fill="url(#sf-sky)" />
      {STARS.map(([x, y], i) => (
        <circle key={i} class={`sf-star sf-star${i % 3}`} cx={x} cy={y} r={i % 2 ? 1.6 : 1.1} fill="#f4f1d0" />
      ))}
      <g transform="translate(596 38)">
        <circle r="18" fill="#f4eeb8" />
        <circle cx="7" cy="-5" r="16" fill="#1a2a4a" />
      </g>
      {props.banner && (
        <g>
          <rect x="12" y="10" width={Math.min(420, props.banner.length * 8.4 + 24)} height="28" rx="8" fill="#ffffff" stroke="#c8102e" stroke-width="2" />
          <text x="24" y="29" font-size="15" font-weight="700" fill="#1d4ed8">{props.banner}</text>
        </g>
      )}
      {/* Pavement and road */}
      <rect x="0" y="196" width="640" height="16" fill="#4a5263" />
      <rect x="0" y="212" width="640" height="38" fill="#262b36" />
      <path d="M0 231h640" stroke="#9aa1ad" stroke-width="2" stroke-dasharray="14 12" />

      {/* Light under each lit lamp: cone and pool, drawn behind the houses' fronts */}
      {LAMP_X.map((x, i) =>
        i < shown ? (
          <g key={`c${i}`} class="sf-on">
            <path d={`M${x - 6} 96L${x - 52} 204h104L${x + 6} 96z`} fill="url(#sf-cone)" />
            <ellipse cx={x} cy="204" rx="56" ry="9" fill="#ffe680" opacity="0.35" />
          </g>
        ) : null,
      )}

      {/* Houses */}
      {HOUSE_X.map((cx, i) => (
        <g key={`h${i}`}>
          <rect x={cx - 34} y="132" width="68" height="64" fill={HOUSE_COLOUR[i]} stroke="#10192c" stroke-width="2" />
          <path d={`M${cx - 40} 134L${cx} 104L${cx + 40} 134z`} fill="#2b3550" stroke="#10192c" stroke-width="2" />
          <rect x={cx - 24} y="144" width="16" height="16" fill="#f2d27a" opacity="0.85" />
          <rect x={cx + 8} y="144" width="16" height="16" fill="#f2d27a" opacity="0.85" />
          <rect x={cx - 7} y="170" width="14" height="26" fill="#10192c" />
          <text x={cx} y="245" text-anchor="middle" font-size="17" font-weight="700" fill="#ffffff">{HOUSE_NAMES[i]}</text>
          {props.gifts && (
            <g class="sf-pop" style={{ animationDelay: `${i * 0.12}s` }}>
              <circle cx={cx} cy="86" r="15" fill={props.gifts[i] > 0 ? '#f2b600' : '#d0d4dc'} stroke="#10192c" stroke-width="2" />
              <text x={cx} y="91" text-anchor="middle" font-size="13" font-weight="700" fill="#10192c">{money(props.gifts[i])}</text>
            </g>
          )}
        </g>
      ))}

      {/* Lamp posts */}
      {LAMP_X.map((x, i) => {
        const on = i < shown;
        return (
          <g key={`l${i}`}>
            {on && <circle class="sf-glow" cx={x} cy="90" r="44" fill="url(#sf-halo)" />}
            <rect x={x - 3} y="92" width="6" height="106" fill="#1c2233" />
            <rect x={x - 10} y="194" width="20" height="5" rx="2" fill="#1c2233" />
            <path d={`M${x - 12} 92h24l-5-14h-14z`} fill="#1c2233" />
            <rect x={x - 8} y="90" width="16" height="8" rx="3" fill={on ? '#ffe680' : '#5b6475'} class="sf-bulb" />
            {on && <circle class="sf-pop" cx={x} cy="94" r="5" fill="#fffbe6" />}
          </g>
        );
      })}
    </svg>
  );
}

function LampMeter(props: { lit: number; label?: string }) {
  return (
    <p class="sf-meter small" style={{ margin: 0 }}>
      <span class="sf-meter-cells" aria-hidden="true">
        {Array.from({ length: LAMPS }, (_, i) => <span key={i} class={i < props.lit ? 'on' : ''} />)}
      </span>
      <span><strong>{props.lit}</strong> of {LAMPS} lamps lit{props.label ? `. ${props.label}` : '.'}</span>
    </p>
  );
}

// ---------------- Level 1: sort the goods ----------------

const KIND_ICON: Record<Kind, string> = { private: '🔒', club: '🎟️', common: '🌊', public: '💡' };

function Sorter({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const goods = useMemo(() => shuffled(data.goods, seed + 3), [data.goods, seed]);
  const [idx, setIdx] = useState(0);
  const [missed, setMissed] = useState(false);
  const [wrong, setWrong] = useState<Kind | null>(null);
  const [solved, setSolved] = useState(false);
  const [firstRight, setFirstRight] = useState(0);
  const [placed, setPlaced] = useState<Good[]>([]);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const g = goods[idx];
  const goal = Math.min(SORT_GOAL, goods.length);

  const slipText = (k: Kind) => {
    const slip = sortSlip(g.kind, k);
    return [slip.rival ? g.rival : '', slip.excludable ? g.excl : ''].filter(Boolean).join(' ');
  };

  const pickKind = (k: Kind) => {
    if (solved) return;
    if (k === g.kind) {
      play('stamp');
      setWrong(null);
      setSolved(true);
      if (!missed) setFirstRight((n) => n + 1);
      setPlaced([...placed, g]);
      setAnnounce(`Right: ${data.kindNames[k]}. ${g.why}`);
    } else {
      play('wrong');
      setMissed(true);
      setWrong(k);
      setAnnounce(`Not ${data.kindNames[k]}. ${slipText(k)}`);
    }
  };

  const next = () => {
    play('whoosh');
    setMissed(false);
    setWrong(null);
    setSolved(false);
    if (idx + 1 < goods.length) {
      setIdx(idx + 1);
      setAnnounce('A new good arrives.');
    } else {
      setDone(true);
      onComplete();
      if (sortWon(firstRight, goal)) win(onGoal, 1);
    }
  };

  const lit = progressLamps(placed.length, goods.length);

  if (done) {
    const won = sortWon(firstRight, goal);
    return (
      <div class="stack">
        <Street lit={LAMPS} />
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'Every good in its place, and the street is lit!' : 'All the goods are sorted.'}</strong> Right first time: {firstRight} of {goods.length}.
          </p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[0]} stamp needs {goal} right first time. Play again: the goods come in a new order.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  const cell = (k: Kind) => (
    <button
      key={k}
      type="button"
      class={`choice-btn sf-cell sf-cell-${k} ${wrong === k ? 'shake chosen' : ''} ${solved && g.kind === k ? 'choice-right' : ''}`}
      disabled={solved}
      onClick={() => pickKind(k)}
    >
      <span class="sf-cell-name"><span aria-hidden="true">{KIND_ICON[k]}</span> {data.kindNames[k]}</span>
      <span class="sf-cell-chips">
        {placed.filter((p) => p.kind === k).map((p) => (
          <span key={p.id} class="sf-chip" title={p.name} aria-label={p.name} role="img">{p.icon}</span>
        ))}
      </span>
      {teacher && !solved && g.kind === k && <Answer />}
    </button>
  );

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 1. Good {idx + 1} of {goods.length}. Right first time: {firstRight} (goal {goal}).
      </p>
      <section class="panel stack" aria-labelledby="sf-good-h">
        <h3 id="sf-good-h"><StepNo n={2} /> Look at the good</h3>
        <Street lit={lit} />
        <LampMeter lit={lit} label="Each good you sort lights more of the street" />
        <div key={g.id} class="sf-arrive">
          <span class="sf-arrive-icon" aria-hidden="true">{g.icon}</span>
          <p style={{ margin: 0 }}><strong>{g.name}</strong></p>
        </div>
      </section>

      <section class="panel stack" aria-labelledby="sf-grid-h">
        <h3 id="sf-grid-h"><StepNo n={3} /> Place it in the grid</h3>
        <ul class="small muted sf-qs">
          <li>{data.rivalText}</li>
          <li>{data.exclText}</li>
        </ul>
        <div class="sf-grid" role="group" aria-label="The rival and excludable grid">
          <span />
          <span class="sf-head">Rival</span>
          <span class="sf-head">Non-rival</span>
          <span class="sf-side">Excludable</span>
          {cell('private')}
          {cell('club')}
          <span class="sf-side">Non-excludable</span>
          {cell('common')}
          {cell('public')}
        </div>
        {!solved && wrong && <Fb ok={false}>Not {data.kindNames[wrong].toLowerCase()}. {slipText(wrong)}</Fb>}
        {solved && (
          <div class="callout callout-ok stack" role="status">
            <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
              <MarkIcon /> <span><strong>{data.kindNames[g.kind]}.</strong> {g.rival} {g.excl} <Md text={g.why} inline /></span>
            </p>
            <div><button class="btn" onClick={next}>{idx + 1 < goods.length ? 'Next good' : 'Finish'}</button></div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------- Level 2: fund the lights ----------------

function Fund({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const [week, setWeek] = useState(1);
  const [gift, setGift] = useState<number | null>(null);
  const [result, setResult] = useState<WeekResult | null>(null);
  const [history, setHistory] = useState<WeekResult[]>([]);
  const [pick, setPick] = useState<number | null>(null);
  const [missed, setMissed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [firstRight, setFirstRight] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const taxed = week > VOLUNTARY_WEEKS;
  const q = data.weeks[week - 1];
  const options = useMemo(() => shuffled(q.options, seed + week * 7 + 1), [q, seed, week]);

  const give = () => {
    if (result || (!taxed && gift === null)) return;
    const r = playWeek(week, taxed ? COUNCIL_TAX : gift!);
    play(r.lamps >= LAMPS ? 'win' : 'coin');
    if (r.lamps >= LAMPS && !reducedMotion()) celebrate({ size: 'small' });
    setResult(r);
    setHistory([...history, r]);
    setAnnounce(`The fund has ${money(r.total)} of ${money(TARGET)}. ${r.lamps} of ${LAMPS} lamps are lit. The light reaches every house. Now answer the question.`);
  };

  const answer = (i: number) => {
    if (solved) return;
    setPick(i);
    if (options[i].correct) {
      play('correct');
      setSolved(true);
      if (!missed) setFirstRight((n) => n + 1);
      setAnnounce(options[i].feedback);
    } else {
      play('wrong');
      setMissed(true);
      setAnnounce(options[i].feedback);
    }
  };

  const next = () => {
    play('whoosh');
    setGift(null);
    setResult(null);
    setPick(null);
    setMissed(false);
    setSolved(false);
    if (week < WEEKS) {
      setWeek(week + 1);
      setAnnounce(week + 1 > VOLUNTARY_WEEKS ? 'The council steps in.' : `Week ${week + 1}. The fund is empty again.`);
    } else {
      setDone(true);
      onComplete();
      if (fundWon(firstRight)) win(onGoal, 2);
    }
  };

  if (done) {
    const won = fundWon(firstRight);
    const voluntary = history.filter((h) => !h.taxed);
    const kept = (id: string) => voluntary.reduce((s, h) => s + h.gifts.find((g) => g.id === id)!.payoff, 0);
    const best = Math.max(...voluntary.map((h) => h.lamps));
    return (
      <div class="stack">
        <Street lit={LAMPS} banner="Paid for by the council tax" />
        <table class="sf-table small">
          <caption>Your six weeks on the street</caption>
          <thead><tr><th scope="col">Week</th><th scope="col">Fund</th><th scope="col">Lamps lit</th></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.week}><th scope="row">{h.taxed ? `${h.week} (tax)` : h.week}</th><td>{money(h.total)}</td><td>{h.lamps} of {LAMPS}</td></tr>
            ))}
          </tbody>
        </table>
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'Case closed, detective!' : 'The six weeks are over.'}</strong> Right first time: {firstRight} of {WEEKS}.
          </p>
          <p style={{ margin: 0 }}>
            Giving alone lit at most {best} of {LAMPS} lamps. Over the {VOLUNTARY_WEEKS} giving weeks, Dev ended with {money(kept('dev'))} (money kept plus light) and you ended with {money(kept('you'))}. The free rider did best, so the market failed. The tax lit every lamp.
          </p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[1]} stamp needs {FUND_GOAL} right first time. Play again: the answers come in a new order.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  const gifts = result ? result.gifts.map((g) => g.gift) : undefined;
  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 2. Week {week} of {WEEKS}. Right first time: {firstRight} (goal {FUND_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="sf-give-h">
        <h3 id="sf-give-h"><StepNo n={2} /> {taxed ? 'The council steps in' : 'Choose your gift'}</h3>
        <Street lit={result ? result.lamps : 0} gifts={gifts} banner={taxed ? `Council tax: ${money(COUNCIL_TAX)} per house` : undefined} />
        <LampMeter lit={result ? result.lamps : 0} label={`Every ${money(LAMP_COST)} lights one lamp. All ${LAMPS} lamps need ${money(TARGET)}`} />
        {!taxed && (
          <>
            <p style={{ margin: 0 }}>
              You have {money(ENDOWMENT)} this week. Each lit lamp is worth {money(BENEFIT_PER_LAMP)} to every house, paid or not. How much will you give?
            </p>
            <div class="sf-gifts" role="group" aria-label="Your gift">
              {GIFTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  class={`choice-btn sf-gift ${gift === v ? 'chosen' : ''}`}
                  aria-pressed={gift === v}
                  disabled={!!result}
                  onClick={() => { play('tap'); setGift(v); }}
                >
                  {money(v)}
                </button>
              ))}
            </div>
          </>
        )}
        {taxed && (
          <p style={{ margin: 0 }}>
            Giving never lit the whole street. Now the council charges every house the same tax: {money(TARGET)} ÷ {HOUSEHOLDS} houses = {money(COUNCIL_TAX)}. Nobody can choose to pay nothing.
          </p>
        )}
        {!result && (
          <div>
            <button class="btn" disabled={!taxed && gift === null} onClick={give}>{taxed ? 'Pay the tax' : 'Put it in the fund'}</button>
          </div>
        )}
        {result && (
          <table class="sf-table small">
            <caption>Week {week}: the fund has {money(result.total)} of {money(TARGET)}</caption>
            <thead>
              <tr><th scope="col">House</th><th scope="col">Paid</th><th scope="col">Money kept + light value</th></tr>
            </thead>
            <tbody>
              {result.gifts.map((g) => (
                <tr key={g.id}>
                  <th scope="row">{g.name}</th>
                  <td>{money(g.gift)}</td>
                  <td>{money(ENDOWMENT - g.gift)} + {money(BENEFIT_PER_LAMP * result.lamps)} = <strong>{money(g.payoff)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {result && (
        <section class="panel stack" aria-labelledby="sf-ask-h">
          <h3 id="sf-ask-h"><StepNo n={3} /> What happened?</h3>
          <p style={{ margin: 0 }}><strong>{q.prompt}</strong></p>
          <div class="sf-opts" role="group" aria-label="Answers">
            {options.map((o, i) => (
              <button
                key={`${week}-${i}`}
                type="button"
                class={`choice-btn ${pick === i && !o.correct ? 'shake chosen' : ''} ${solved && o.correct ? 'choice-right' : ''}`}
                disabled={solved}
                onClick={() => answer(i)}
              >
                {o.text}
                {teacher && !solved && o.correct && <Answer />}
              </button>
            ))}
          </div>
          {pick !== null && !solved && <Fb ok={false}>{options[pick].feedback}</Fb>}
          {solved && (
            <div class="callout callout-ok stack" role="status">
              <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                <MarkIcon /> <span>{options[pick!].feedback}</span>
              </p>
              <div><button class="btn" onClick={next}>{week < WEEKS ? 'Next week' : 'Finish'}</button></div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ---------------- Level 3: the council decides ----------------

type CouncilPhase = 'way' | 'calc' | 'judge' | 'solved';

function Council({ data, seed, onComplete, onGoal, teacher, again }: LevelProps) {
  const cases = useMemo(() => shuffled(data.cases, seed + 11), [data.cases, seed]);
  const [ci, setCi] = useState(0);
  const [phase, setPhase] = useState<CouncilPhase>('way');
  const [wrongWay, setWrongWay] = useState<Way | null>(null);
  const [wayMissed, setWayMissed] = useState(false);
  const [typed, setTyped] = useState('');
  const [calcMissed, setCalcMissed] = useState(false);
  const [calcFb, setCalcFb] = useState<string | null>(null);
  const [jPick, setJPick] = useState<number | null>(null);
  const [jMissed, setJMissed] = useState(false);
  const [points, setPoints] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const c = cases[ci];
  const max = cases.length * POINTS_PER_CASE;
  const tax = councilTax(c.items, c.costEach, c.households);
  const total = totalCost(c.items, c.costEach);
  const judgeOpts = useMemo(() => shuffled(c.options, seed + ci * 5 + 2), [c, seed, ci]);

  const pickWay = (w: Way) => {
    if (phase !== 'way') return;
    if (w === c.way) {
      play('correct');
      if (!wayMissed) setPoints((p) => p + 1);
      setWrongWay(null);
      setPhase('calc');
      setAnnounce(`Right: ${data.wayNames[w]}. Now set the tax.`);
    } else {
      play('wrong');
      setWayMissed(true);
      setWrongWay(w);
      setAnnounce(data.wayWrong[w]);
    }
  };

  const check = () => {
    if (phase !== 'calc') return;
    const v = parseNumber(typed);
    if (Number.isNaN(v)) {
      setCalcFb('Type a number, for example 25.');
      return;
    }
    if (numberRight(v, tax)) {
      play('coin');
      if (!calcMissed) setPoints((p) => p + 1);
      setCalcFb(null);
      setPhase('judge');
      setAnnounce(`Right. The tax is ${money(tax)} per household. Now judge the choice.`);
      return;
    }
    play('wrong');
    setCalcMissed(true);
    const slip = taxMistakes(c.items, c.costEach, c.households).find((x) => numberRight(v, x.value));
    const text = slip ? data.calcText[slip.kind] : data.calcText.other;
    setCalcFb(text);
    setAnnounce(text);
  };

  const pickJudge = (i: number) => {
    if (phase !== 'judge') return;
    setJPick(i);
    if (judgeOpts[i].correct) {
      play('stamp');
      if (!jMissed) setPoints((p) => p + 1);
      setPhase('solved');
      setSolvedCount((n) => n + 1);
      setAnnounce(judgeOpts[i].feedback);
    } else {
      play('wrong');
      setJMissed(true);
      setAnnounce(judgeOpts[i].feedback);
    }
  };

  const next = () => {
    play('whoosh');
    setPhase('way');
    setWrongWay(null);
    setWayMissed(false);
    setTyped('');
    setCalcMissed(false);
    setCalcFb(null);
    setJPick(null);
    setJMissed(false);
    if (ci + 1 < cases.length) {
      setCi(ci + 1);
      setAnnounce('A new case for the council.');
    } else {
      setDone(true);
      onComplete();
      if (councilWon(points)) win(onGoal, 3);
    }
  };

  const lit = progressLamps(solvedCount, cases.length);

  if (done) {
    const won = councilWon(points);
    return (
      <div class="stack">
        <Street lit={LAMPS} banner="The council plan is done" />
        <div class={`callout ${won ? 'callout-ok' : 'callout-try'} stack`} role="status">
          <p style={{ margin: 0 }}>
            <strong>{won ? 'A wise town planner!' : 'All the cases are decided.'}</strong> First-try points: {points} of {max}.
          </p>
          {!won && <p style={{ margin: 0 }}>The {STAMP_NAMES[2]} stamp needs {COUNCIL_GOAL} points. Play again: the cases come in a new order.</p>}
          <div><button class="btn" onClick={again}>Play again</button></div>
        </div>
      </div>
    );
  }

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <p class="small muted" style={{ margin: 0 }}>
        Level 3. Case {ci + 1} of {cases.length}. First-try points: {points} of {max} (goal {COUNCIL_GOAL}).
      </p>
      <section class="panel stack" aria-labelledby="sf-case-h">
        <h3 id="sf-case-h"><StepNo n={2} /> Read the case: {c.title}</h3>
        <Street lit={lit} />
        <LampMeter lit={lit} label="Each case you decide lights more of the street" />
        <div key={c.id} class="sf-arrive">
          <span class="sf-arrive-icon" aria-hidden="true">{c.icon}</span>
          <p style={{ margin: 0 }}>{c.story}</p>
        </div>
      </section>

      <section class="panel stack" aria-labelledby="sf-way-h">
        <h3 id="sf-way-h"><StepNo n={3} /> Who does the work?</h3>
        <div class="sf-ways" role="group" aria-label="Government responses">
          {WAYS.map((w) => (
            <button
              key={w}
              type="button"
              class={`choice-btn ${wrongWay === w ? 'shake chosen' : ''} ${phase !== 'way' && c.way === w ? 'choice-right' : ''}`}
              disabled={phase !== 'way'}
              onClick={() => pickWay(w)}
            >
              <span class="sf-way-icon" aria-hidden="true">{w === 'direct' ? '🏛️' : '🤝'}</span>
              <span>
                <strong>{data.wayNames[w]}</strong>
                <span class="small" style={{ display: 'block' }}>{data.wayHow[w]}</span>
              </span>
              {teacher && phase === 'way' && c.way === w && <Answer />}
            </button>
          ))}
        </div>
        {phase === 'way' && wrongWay && <Fb ok={false}>{data.wayWrong[wrongWay]}</Fb>}
        {phase !== 'way' && <Fb ok>{data.wayNames[c.way]}. Either way, taxes pay for it, so nobody can free ride.</Fb>}
      </section>

      {phase !== 'way' && (
        <section class="panel stack" aria-labelledby="sf-calc-h">
          <h3 id="sf-calc-h"><StepNo n={4} /> Set the tax per household</h3>
          <p class="small muted" style={{ margin: 0 }}>Tax per household = total cost ÷ number of households. Use the numbers in the case.</p>
          <div class="row">
            <label for="sf-calc">Tax per household ($)</label>
            <input
              id="sf-calc"
              type="text"
              inputMode="decimal"
              class="sf-input"
              value={typed}
              disabled={phase !== 'calc'}
              onInput={(ev) => setTyped((ev.target as HTMLInputElement).value)}
              onKeyDown={(ev) => ev.key === 'Enter' && check()}
            />
            {phase === 'calc' && <button class="btn" onClick={check}>Check</button>}
            {teacher && phase === 'calc' && <span class="badge badge-done">Answer: {tax}</span>}
          </div>
          {phase === 'calc' && calcFb && <Fb ok={false}><Md text={calcFb} inline /></Fb>}
          {phase !== 'calc' && (
            <Fb ok>
              Total cost = {c.items > 1 ? `${c.items} ${c.itemName} × ${money(c.costEach)} = ` : ''}{money(total)}. Tax = {money(total)} ÷ {c.households.toLocaleString('en-US')} households = <strong>{money(tax)}</strong>.
            </Fb>
          )}
        </section>
      )}

      {(phase === 'judge' || phase === 'solved') && (
        <section class="panel stack" aria-labelledby="sf-judge-h">
          <h3 id="sf-judge-h"><StepNo n={5} /> Pick {c.judge === 'advantage' ? 'an advantage' : 'a disadvantage'} of {data.wayNames[c.way].toLowerCase()}</h3>
          <div class="sf-opts" role="group" aria-label="Judgements">
            {judgeOpts.map((o, i) => (
              <button
                key={`${c.id}-${i}`}
                type="button"
                class={`choice-btn ${jPick === i && !o.correct ? 'shake chosen' : ''} ${phase === 'solved' && o.correct ? 'choice-right' : ''}`}
                disabled={phase === 'solved'}
                onClick={() => pickJudge(i)}
              >
                {o.text}
                {teacher && phase === 'judge' && o.correct && <Answer />}
              </button>
            ))}
          </div>
          {jPick !== null && <Fb ok={!!judgeOpts[jPick].correct}>{judgeOpts[jPick].feedback}</Fb>}
          {phase === 'solved' && <div><button class="btn" onClick={next}>{ci + 1 < cases.length ? 'Next case' : 'Finish'}</button></div>}
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
  title: 'The rival and excludable grid',
  description:
    'A grid of four boxes. Columns: rival and non-rival. Rows: excludable and non-excludable. Rival and excludable: private goods, such as a pizza. Non-rival and excludable: club goods, such as a gym. Rival and non-excludable: common pool resources, such as fish in the sea. Non-rival and non-excludable: public goods, such as streetlights.',
  boxes: [
    { at: { q: 38, p: 38 }, w: 38, h: 20 },
    { at: { q: 78, p: 38 }, w: 38, h: 20 },
    { at: { q: 38, p: 14 }, w: 38, h: 20 },
    { at: { q: 78, p: 14 }, w: 38, h: 20 },
  ],
  texts: [
    { at: { q: 38, p: 52 }, text: 'Rival', anchor: 'middle' },
    { at: { q: 78, p: 52 }, text: 'Non-rival', anchor: 'middle' },
    { at: { q: 17, p: 37 }, text: 'Excludable', anchor: 'end' },
    { at: { q: 17, p: 15 }, text: 'Non-', anchor: 'end' },
    { at: { q: 17, p: 10 }, text: 'excludable', anchor: 'end' },
    { at: { q: 38, p: 40 }, text: 'Private goods', anchor: 'middle', tone: 'navy' },
    { at: { q: 38, p: 33 }, text: 'pizza, T-shirt', anchor: 'middle', tone: 'grey' },
    { at: { q: 78, p: 40 }, text: 'Club goods', anchor: 'middle', tone: 'navy' },
    { at: { q: 78, p: 33 }, text: 'gym, toll road', anchor: 'middle', tone: 'grey' },
    { at: { q: 38, p: 18 }, text: 'Common pool', anchor: 'middle', tone: 'navy' },
    { at: { q: 38, p: 13 }, text: 'resources', anchor: 'middle', tone: 'navy' },
    { at: { q: 38, p: 7 }, text: 'fish in the sea', anchor: 'middle', tone: 'grey' },
    { at: { q: 78, p: 16 }, text: 'Public goods', anchor: 'middle', tone: 'red' },
    { at: { q: 78, p: 9 }, text: 'streetlights', anchor: 'middle', tone: 'grey' },
  ],
};

function LearnDiagram() {
  return <SpecDiagram spec={LEARN_SPEC} />;
}

export { Try, LearnDiagram };
