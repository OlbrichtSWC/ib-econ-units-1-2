/**
 * Government Toolkit (2.7): the student is the minister. Each mission brief sets a goal and rules
 * out some tools. The student picks a tool (maximum price, minimum price, indirect tax, subsidy),
 * sets its size, and watches the market and the stakeholder panel respond.
 *
 * Level 1: pick the right tool first time and meet the goal. Level 2: predict four effects before
 * the reveal. Level 3 (HL): calculate two values from the diagram.
 */
import { useMemo, useState } from 'preact/hooks';
import { equilibrium, Line, priceAt, Pt, round } from '../../econ/calc';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, HlBadge, LiveRegion, MarkIcon } from '../../shared/design/components';
import { Area, Arrow, Curve, Diagram, Dot, Guide, HLine, Label } from '../../shared/diagrams/Diagram';
import type { TryProps } from '../../shared/activity/types';
import { LevelPicker } from '../../shared/activity/LevelPicker';
import type { LevelInfo } from '../../shared/activity/LevelPicker';
import { parseNumber } from '../../shared/activity/CheckIt';
import { celebrate } from '../../shared/fun/celebrate';
import { play } from '../../shared/fun/sound';
import {
  applyPolicy, budgetRect, BudgetEffect, calcRight, calcValue, Effects, effectsRight, Gap, lossTriangle, meetsTarget, Mission, Outcome, policyEffects,
  PriceMove, shiftedSupply, snapSize, Tool, TOOLS,
} from './model';

/** Missions per level, and how many must succeed for the level's stamp. */
export const MISSION_GOAL = 3;
const STAMP_NAMES = ['Policy Maker', 'Policy Predictor', 'Treasury Analyst'];

interface TryContent {
  intro: string;
  levels: LevelInfo[];
  missionLevels: Mission[][];
  toolNames: Record<Tool, string>;
  toolBlurbs: Record<Tool, string>;
}

const fmt = (v: number) => {
  const r = round(v, 2);
  return Number.isInteger(r) ? r.toLocaleString('en-US') : r.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const money = (v: number) => (v < 0 ? '−$' : '$') + fmt(Math.abs(v));

const TOOL_GLYPH: Record<Tool, string> = { ceiling: '⤓', floor: '⤒', tax: '+$', subsidy: '−$' };

/** The neutral starting setting: a ceiling at equilibrium, a floor at equilibrium, no tax or subsidy. */
function startSize(m: Mission, tool: Tool): number {
  const e = equilibrium(m.demand, m.supply);
  if (tool === 'ceiling') return snapSize(m, Math.max(m.min, Math.min(m.max, e.p)));
  if (tool === 'floor') return snapSize(m, Math.max(m.min, Math.min(m.max, e.p)));
  return m.min;
}

function sizeText(tool: Tool, size: number, per: string) {
  if (tool === 'ceiling') return `Maximum price ${money(size)}`;
  if (tool === 'floor') return `Minimum price ${money(size)}`;
  return `${tool === 'tax' ? 'Tax' : 'Subsidy'} of ${money(size)} per ${per}`;
}

/** Revenue, spending and welfare loss, in thousands when the mission's quantities are in thousands. */
const total = (m: Mission, v: number) => money(v) + (m.moneyScale ? ' thousand' : '');

function targetText(m: Mission): string {
  const t = m.target;
  const v = t.measure === 'quantity' ? `${fmt(t.value)} ${m.unit}` : money(t.value);
  const what = { consumerPrice: 'Price buyers pay', producerPrice: 'Price sellers receive', quantity: 'Quantity traded', budget: 'Government revenue' }[t.measure];
  if (t.measure === 'budget') return `${what} ${t.op === '<=' ? 'at most' : 'at least'} ${total(m, t.value)}`;
  return `${what} ${t.op === '<=' ? 'at most' : 'at least'} ${v}`;
}

/** The market diagram for a mission, with the policy applied. */
function PolicyDiagram(props: { m: Mission; tool: Tool | null; o: Outcome | null; showLoss: boolean }) {
  const { m, tool, o } = props;
  const e = equilibrium(m.demand, m.supply);
  const s2 = tool && o ? shiftedSupply(m.supply, tool, o.size) : null;
  const rect = o ? budgetRect(o) : [];
  const tri = o && props.showLoss ? lossTriangle(m.demand, m.supply, o) : [];
  const priceLine = o && (tool === 'ceiling' || tool === 'floor') && (o.shortage > 0 || o.surplus > 0);
  const gapP = o?.consumerPrice ?? 0;
  let description = `Demand and supply cross at ${money(e.p)} and ${fmt(e.q)} ${m.unit}.`;
  if (o && tool) {
    description += ` With the policy: buyers pay ${money(o.consumerPrice)}, sellers receive ${money(o.producerPrice)}, and ${fmt(o.quantity)} ${m.unit} are traded.`;
    if (o.shortage > 0) description += ` Shortage of ${fmt(o.shortage)}.`;
    if (o.surplus > 0) description += ` Surplus of ${fmt(o.surplus)}.`;
    if (o.budget > 0) description += ` Tax revenue ${total(m, o.budget)}, shown as a hatched rectangle.`;
    if (o.budget < 0) description += ` Subsidy spending ${total(m, -o.budget)}, shown as a hatched rectangle.`;
  }
  return (
    <Diagram xMax={m.xMax} yMax={m.yMax} xLabel={m.xLabel} yLabel={m.yLabel} title={`The market: ${m.title}`} description={description}>
      {rect.length > 0 && <Area points={rect} pattern="hatch" tone={o!.budget > 0 ? 'green' : 'red'} />}
      {tri.length > 0 && <Area points={tri} pattern="cross" tone="grey" />}
      <Guide at={e} xText="Qe" yText="Pe" />
      {o && o.quantity > 0 && Math.abs(o.quantity - e.q) > 1e-6 && (
        <Guide at={{ q: o.quantity, p: Math.max(o.consumerPrice, o.producerPrice) }} xText="Q₂" />
      )}
      <Curve line={m.demand} label="D" tone="navy" />
      <Curve line={m.supply} label="S" tone="green" />
      {s2 && o && o.size > 0 && <Curve line={s2} label={tool === 'tax' ? 'S + tax' : 'S − subsidy'} tone="green" dashed />}
      {o && (tool === 'ceiling' || tool === 'floor') && (
        <>
          <HLine p={o.size} tone="red" dashed={!priceLine} />
          <Label at={{ q: m.xMax * 0.98, p: o.size }} text={tool === 'ceiling' ? `Max price ${money(o.size)}` : `Min price ${money(o.size)}`} tone="red" anchor="end" dy={-8} bold />
        </>
      )}
      {priceLine && o && (
        <>
          <Dot at={{ q: o.qs, p: gapP }} tone="green" />
          <Dot at={{ q: o.qd, p: gapP }} tone="navy" />
          <Arrow from={{ q: Math.min(o.qs, o.qd), p: gapP - m.yMax * 0.06 }} to={{ q: Math.max(o.qs, o.qd), p: gapP - m.yMax * 0.06 }} tone="red" />
          <Label
            at={{ q: (o.qs + o.qd) / 2, p: gapP - m.yMax * 0.06 }}
            text={o.shortage > 0 ? 'Shortage' : 'Surplus'}
            tone="red"
            anchor="middle"
            dy={22}
            bold
          />
        </>
      )}
      {o && (tool === 'tax' || tool === 'subsidy') && o.size > 0 && (
        <>
          <Dot at={{ q: o.quantity, p: o.consumerPrice }} tone="red" label="Buyers pay" labelDx={10} labelDy={tool === 'tax' ? -10 : 20} />
          <Dot at={{ q: o.quantity, p: o.producerPrice }} tone="green" label="Sellers get" labelDx={10} labelDy={tool === 'tax' ? 20 : -10} />
        </>
      )}
      <Dot at={e} />
    </Diagram>
  );
}

type Phase = 'tool' | 'predict' | 'set' | 'calc' | 'done';

const PRED_OPTIONS: { key: keyof Effects; label: string; options: string[] }[] = [
  { key: 'consumerPrice', label: 'The price buyers pay', options: ['rises', 'falls'] },
  { key: 'quantity', label: 'The quantity traded', options: ['rises', 'falls'] },
  { key: 'budget', label: 'The government budget', options: ['gains revenue', 'spends money', 'no direct effect'] },
  { key: 'gap', label: 'Shortage or surplus', options: ['shortage', 'surplus', 'neither'] },
];

function Try({ content, onComplete, onGoal, stamps, teacher }: TryProps) {
  const data = content.try as unknown as TryContent;
  const [levelNo, setLevelNo] = useState(1);
  const missions = data.missionLevels[levelNo - 1];
  const [index, setIndex] = useState(0);
  const m = missions[index % missions.length];
  const [phase, setPhase] = useState<Phase>('tool');
  const [firstTool, setFirstTool] = useState<Tool | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const [toolMsg, setToolMsg] = useState('');
  const [size, setSize] = useState(0);
  const [pred, setPred] = useState<Partial<Effects>>({});
  const [applied, setApplied] = useState<null | { met: boolean }>(null);
  const [calcDraft, setCalcDraft] = useState<string[]>(['', '']);
  const [calcState, setCalcState] = useState<{ tries: number; right: boolean }[]>([{ tries: 0, right: false }, { tries: 0, right: false }]);
  /** Missions won in this level (by id). */
  const [won, setWon] = useState<Record<number, Set<string>>>({});
  const [played, setPlayed] = useState<Record<number, Set<string>>>({});
  const [result, setResult] = useState<null | { ok: boolean; lines: string[] }>(null);
  const [announce, setAnnounce] = useState('');

  const o = useMemo(() => (tool ? applyPolicy(m.demand, m.supply, tool, size) : null), [m, tool, size]);
  const levelWon = won[levelNo] ?? new Set<string>();
  const levelPlayed = played[levelNo] ?? new Set<string>();
  const live = phase === 'set' || phase === 'calc' || phase === 'done';

  const resetMission = () => {
    setPhase('tool');
    setFirstTool(null);
    setTool(null);
    setToolMsg('');
    setPred({});
    setApplied(null);
    setCalcDraft(['', '']);
    setCalcState([{ tries: 0, right: false }, { tries: 0, right: false }]);
    setResult(null);
  };

  const pickLevel = (n: number) => {
    setLevelNo(n);
    setIndex(0);
    resetMission();
    setAnnounce(`Level ${n}: ${data.levels[n - 1].title}.`);
  };

  const chooseTool = (t: Tool) => {
    if (phase !== 'tool') return;
    if (!firstTool) setFirstTool(t);
    if (t === m.tool) {
      play('correct');
      setTool(t);
      setSize(startSize(m, t));
      setToolMsg('');
      setPhase(levelNo >= 2 ? 'predict' : 'set');
      setAnnounce(`${data.toolNames[t]} is a good choice. ${levelNo >= 2 ? 'Now predict its effects.' : 'Now set its size.'}`);
    } else {
      play('wrong');
      const msg = m.wrongTool[t] ?? 'This tool does not meet the goal. Read the brief again.';
      setToolMsg(msg);
      setAnnounce(`Not this tool. ${msg}`);
    }
  };

  const lockPredictions = () => {
    if (PRED_OPTIONS.some((p) => !pred[p.key])) return;
    play('tap');
    setPhase('set');
    setAnnounce('Predictions locked in. Now set the size of the policy.');
  };

  const finishMission = (calcOk: boolean) => {
    const toolOk = firstTool === m.tool;
    const predOk = levelNo < 2 || effectsRight(pred, m.tool) === 4;
    const ok = toolOk && predOk && calcOk;
    const lines: string[] = [];
    lines.push(toolOk ? 'You chose the right tool on your first try.' : `Your first choice was ${data.toolNames[firstTool!].toLowerCase()}. The mission counts only when the first choice is right.`);
    if (levelNo >= 2) {
      const n = effectsRight(pred, m.tool);
      lines.push(`Predictions right: ${n} of 4.${n < 4 ? ' The mission needs all 4.' : ''}`);
    }
    if (levelNo >= 3) lines.push(calcOk ? 'Both calculations right.' : 'The calculations needed more than two tries, or were shown to you.');
    setResult({ ok, lines });
    setPhase('done');
    const pl = new Set(levelPlayed);
    pl.add(m.id);
    setPlayed({ ...played, [levelNo]: pl });
    if (ok) {
      play('correct');
      const w = new Set(levelWon);
      w.add(m.id);
      setWon({ ...won, [levelNo]: w });
      if (w.size === MISSION_GOAL && levelWon.size < MISSION_GOAL) {
        setTimeout(() => {
          play('win');
          celebrate({ size: 'big' });
          onGoal(levelNo);
        }, 500);
      }
    }
    onComplete();
    setAnnounce(ok ? 'Mission complete.' : 'Mission finished. Read the feedback.');
  };

  const apply = () => {
    if (!o || phase !== 'set') return;
    const met = meetsTarget(o, m.target);
    setApplied({ met });
    if (!met) {
      play('wrong');
      setAnnounce(`Not yet. Goal: ${targetText(m)}. Change the size and try again.`);
      return;
    }
    if (levelNo >= 3 && m.calc?.length) {
      play('tap');
      setPhase('calc');
      setAnnounce('Goal met. Now do the calculations.');
      return;
    }
    finishMission(true);
  };

  const checkCalc = (i: number) => {
    if (!o || !m.calc) return;
    const v = parseNumber(calcDraft[i]);
    if (v === null) return;
    const ok = calcRight(o, m.calc[i].ask, v);
    const next = calcState.map((c, j) => (j === i ? { tries: c.tries + 1, right: ok } : c));
    setCalcState(next);
    play(ok ? 'correct' : 'wrong');
    setAnnounce(ok ? 'Correct.' : 'Not yet. Check your working.');
    if (next.every((c) => c.right)) finishMission(next.every((c) => c.tries <= 2));
  };

  const showCalc = (i: number) => {
    if (!o || !m.calc) return;
    const next = calcState.map((c, j) => (j === i ? { tries: 99, right: true } : c));
    setCalcState(next);
    setCalcDraft(calcDraft.map((d, j) => (j === i ? String(calcValue(o, m.calc![i].ask)) : d)));
    if (next.every((c) => c.right)) finishMission(false);
  };

  const truth = policyEffects(m.tool);
  const hideValues = levelNo >= 3 && phase !== 'done';

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <LevelPicker levels={data.levels} level={levelNo} onPick={pickLevel} stamps={stamps} teacher={teacher} icon="pillars" stampNames={STAMP_NAMES} />
      <p class="small muted" style={{ margin: 0 }}>
        Level {levelNo}, mission {(index % missions.length) + 1} of {missions.length}. Missions complete: {levelWon.size} of {MISSION_GOAL} for the {STAMP_NAMES[levelNo - 1]} stamp.
        {levelNo === 3 && (
          <>
            {' '}
            <HlBadge />
          </>
        )}
      </p>

      <div class="play play-card-first">
        <div class="stack">
          <PolicyDiagram m={m} tool={live ? tool : null} o={live ? o : null} showLoss={live} />
          {live && o && (
            <div class="legend small" aria-label="Diagram key">
              {o.budget > 0 && <span>Hatched rectangle: tax revenue.</span>}
              {o.budget < 0 && <span>Hatched rectangle: government spending on the subsidy.</span>}
              {o.welfareLoss > 0 && <span>Cross pattern: welfare loss.</span>}
            </div>
          )}
        </div>

        <div class="stack">
          <section class="event-card stack memo" aria-labelledby="brief-h">
            <h3 id="brief-h">Mission: {m.title}</h3>
            <Md text={m.brief} />
            <p style={{ margin: 0 }}>
              <strong>Target:</strong> {targetText(m)}.
            </p>
          </section>

          {phase === 'tool' && (
            <section class="stack" aria-labelledby="tools-h">
              <h3 id="tools-h">Choose your tool</h3>
              <div class="tool-grid" role="group" aria-label="Policy tools">
                {TOOLS.map((t) => (
                  <button key={t} type="button" class="choice-btn tool-card" onClick={() => chooseTool(t)}>
                    <span class="tool-glyph" aria-hidden="true">{TOOL_GLYPH[t]}</span>
                    <strong>{data.toolNames[t]}</strong>
                    <span class="small">{data.toolBlurbs[t]}</span>
                    {teacher && t === m.tool && <span class="badge badge-done">Answer</span>}
                  </button>
                ))}
              </div>
              {toolMsg && (
                <div class="callout callout-try" role="status">
                  <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: 0 }}>
                    <CrossIcon /> <span><Md text={toolMsg} inline /></span>
                  </p>
                </div>
              )}
            </section>
          )}

          {phase === 'predict' && tool && (
            <section class="stack" aria-labelledby="pred-h">
              <h3 id="pred-h">Predict: what will the {data.toolNames[tool].toLowerCase()} do?</h3>
              {PRED_OPTIONS.map((p) => (
                <div key={p.key} class="stack" style={{ gap: 4 }}>
                  <p style={{ margin: 0 }}><strong>{p.label}</strong></p>
                  <div class="row" role="group" aria-label={p.label} style={{ gap: 6 }}>
                    {p.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        class="choice-btn btn-sm"
                        aria-pressed={pred[p.key] === opt}
                        onClick={() => setPred({ ...pred, [p.key]: opt as PriceMove & BudgetEffect & Gap })}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <button class="btn" disabled={PRED_OPTIONS.some((p) => !pred[p.key])} onClick={lockPredictions}>
                  Lock in my predictions
                </button>
              </div>
            </section>
          )}

          {live && tool && o && (
            <section class="panel stack" aria-labelledby="set-h">
              <h3 id="set-h">{data.toolNames[tool]}</h3>
              <div>
                <label for="policy-size">{sizeText(tool, size, m.per)}</label>
                <div class="row" style={{ flexWrap: 'nowrap' }}>
                  <button class="btn btn-secondary btn-sm" aria-label="Smaller" disabled={phase !== 'set' || size <= m.min} onClick={() => setSize(snapSize(m, size - m.step))}>−</button>
                  <input
                    id="policy-size"
                    type="range"
                    min={m.min}
                    max={m.max}
                    step={m.step}
                    value={size}
                    disabled={phase !== 'set'}
                    aria-valuetext={sizeText(tool, size, m.per)}
                    onInput={(e) => {
                      setSize(snapSize(m, Number((e.target as HTMLInputElement).value)));
                      setApplied(null);
                    }}
                  />
                  <button class="btn btn-secondary btn-sm" aria-label="Bigger" disabled={phase !== 'set' || size >= m.max} onClick={() => setSize(snapSize(m, size + m.step))}>+</button>
                </div>
              </div>

              <div class="stakeholders" role="status" aria-label="Stakeholder panel">
                <div class="stat"><span>Buyers pay</span><b>{money(o.consumerPrice)} <span class="muted small">(was {money(o.e.p)})</span></b></div>
                <div class="stat"><span>Sellers receive</span><b>{money(o.producerPrice)}</b></div>
                <div class="stat"><span>Quantity traded</span><b>{hideValues && m.calc?.some((c) => c.ask === 'quantity') ? 'work it out' : `${fmt(o.quantity)} ${m.unit}`}</b></div>
                <div class="stat">
                  <span>Government budget</span>
                  <b>
                    {hideValues && m.calc?.some((c) => c.ask === 'budget')
                      ? 'work it out'
                      : o.budget > 0
                        ? `+${total(m, o.budget)} revenue`
                        : o.budget < 0
                          ? `${total(m, -o.budget)} spending`
                          : 'no direct effect'}
                  </b>
                </div>
                {(o.shortage > 0 || o.surplus > 0) && (
                  <div class="stat">
                    <span>{o.shortage > 0 ? 'Shortage' : 'Surplus'}</span>
                    <b>{hideValues && m.calc?.some((c) => c.ask === 'shortage' || c.ask === 'surplus') ? 'work it out' : `${fmt(o.shortage || o.surplus)} ${m.unit}`}</b>
                  </div>
                )}
                <div class="stat"><span>Welfare loss</span><b>{o.welfareLoss > 1e-9 ? (levelNo >= 3 && !hideValues ? total(m, o.welfareLoss) : 'yes') : 'none'}</b></div>
              </div>

              {phase === 'set' && (
                <div class="row">
                  <button class="btn" onClick={apply}>Apply the policy</button>
                  {applied && !applied.met && <span class="small" role="status"><CrossIcon /> Not yet. Goal: {targetText(m)}.</span>}
                </div>
              )}
            </section>
          )}

          {phase === 'calc' && o && m.calc && (
            <section class="stack" aria-labelledby="calc-h">
              <h3 id="calc-h">Run the numbers <HlBadge /></h3>
              <p class="small" style={{ margin: 0 }}>Use the diagram and the stakeholder panel. Round to 2 decimal places if you need to.</p>
              {m.calc.map((c, i) => (
                <div key={c.ask} class="stack" style={{ gap: 4 }}>
                  <label for={`calc-${i}`}><Md text={c.prompt} inline /></label>
                  <div class="row">
                    <input
                      id={`calc-${i}`}
                      type="text"
                      inputMode="decimal"
                      size={10}
                      value={calcDraft[i]}
                      disabled={calcState[i].right}
                      onInput={(e) => setCalcDraft(calcDraft.map((d, j) => (j === i ? (e.target as HTMLInputElement).value : d)))}
                      onKeyDown={(e) => e.key === 'Enter' && checkCalc(i)}
                    />
                    {!calcState[i].right && <button class="btn btn-sm" onClick={() => checkCalc(i)}>Check</button>}
                    {!calcState[i].right && calcState[i].tries >= 2 && <button class="btn btn-quiet btn-sm" onClick={() => showCalc(i)}>Show me</button>}
                    {calcState[i].right && <span class="small"><MarkIcon /> {calcState[i].tries > 2 ? 'Shown' : 'Correct'}</span>}
                    {!calcState[i].right && calcState[i].tries > 0 && <span class="small"><CrossIcon /> Not yet</span>}
                  </div>
                </div>
              ))}
            </section>
          )}

          {phase === 'done' && result && (
            <section class={`callout ${result.ok ? 'callout-ok' : 'callout-try'} stack`} role="status">
              <p style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}>
                {result.ok ? <MarkIcon /> : <CrossIcon />}
                {result.ok ? 'Mission complete.' : 'Goal met, but this mission does not count yet.'}
              </p>
              {result.lines.map((l) => <p key={l} style={{ margin: 0 }}>{l}</p>)}
              {levelNo >= 2 && (
                <ul class="small" style={{ margin: 0, paddingLeft: 20 }}>
                  {PRED_OPTIONS.map((p) => (
                    <li key={p.key}>
                      {p.label}: <strong>{truth[p.key]}</strong>
                      {pred[p.key] === truth[p.key] ? ' (you said this)' : ` (you said ${pred[p.key]})`}
                    </li>
                  ))}
                </ul>
              )}
              <Md text={m.explain} />
              <div class="row">
                <button
                  class="btn"
                  onClick={() => {
                    setIndex(index + 1);
                    resetMission();
                    play('tap');
                  }}
                >
                  Next mission
                </button>
                <button class="btn btn-quiet" onClick={resetMission}>Try this mission again</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/** Learn it: a specific tax shifts supply up; the tax revenue rectangle and the welfare loss. */
function LearnDiagram() {
  const D: Line = { a: { q: 0, p: 5 }, b: { q: 500, p: 0 } };
  const S: Line = { a: { q: 0, p: 1 }, b: { q: 400, p: 5 } };
  const o = applyPolicy(D, S, 'tax', 1);
  const S2 = shiftedSupply(S, 'tax', 1)!;
  const e = equilibrium(D, S);
  const top: Pt = { q: o.quantity, p: priceAt(D, o.quantity) };
  return (
    <Diagram xMax={450} yMax={6} xLabel="Quantity" yLabel="Price ($)" title="An indirect tax shifts supply up by the tax" description="Supply shifts up by $1 from S to S + tax. Buyers pay $3.50 instead of $3. Sellers keep $2.50. Quantity falls from 200 to 150. The tax revenue is $1 × 150 = $150.">
      <Area points={budgetRect(o)} pattern="hatch" tone="green" label="Tax revenue" labelAt={{ q: 75, p: 3 }} />
      <Area points={lossTriangle(D, S, o)} pattern="cross" tone="grey" />
      <Guide at={e} xText="Qe" yText="Pe" />
      <Guide at={top} xText="Q₂" yText="Pc" />
      <Guide at={{ q: o.quantity, p: o.producerPrice }} yText="Pp" />
      <Curve line={D} label="D" tone="navy" />
      <Curve line={S} label="S" tone="green" />
      <Curve line={S2} label="S + tax" tone="green" dashed />
      <Dot at={e} />
      <Dot at={top} tone="red" />
    </Diagram>
  );
}

export { Try, LearnDiagram };
