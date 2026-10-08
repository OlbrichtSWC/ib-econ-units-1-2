/**
 * Paint the surplus: the student paints consumer surplus, producer surplus or welfare loss
 * on a grid over the diagram, then the app scores the match. Works with a mouse, a finger,
 * a pen or the keyboard (arrow keys move the brush, Space paints, Delete erases).
 */
import { useRef, useState } from 'preact/hooks';
import { round } from '../../econ/calc';
import type { Pt } from '../../econ/calc';
import { CrossIcon, LiveRegion, MarkIcon } from '../../shared/design/components';
import { Curve, Diagram, Dot, Guide, HLine, TONE, useDiagram } from '../../shared/diagrams/Diagram';
import { celebrate, celebrateAt } from '../../shared/fun/celebrate';
import { play } from '../../shared/fun/sound';
import { DEMAND, Market, SUPPLY, surplusShapes } from './model';
import {
  brushCells, cellAt, GRID, PAINT_GOAL, PAINT_TASKS, paintMistakes, paintScore, PASS_SCORE, targetCells,
} from './paint';

const X_MAX = 900;
const Y_MAX = 110;
const BASE: Market = { demand: DEMAND, supply: SUPPLY };
const NAME = { cs: 'consumer surplus', ps: 'producer surplus', wl: 'welfare loss' } as const;
const PAINT_TONE = { cs: TONE.navy, ps: TONE.red, wl: TONE.grey } as const;

function priceStory(price: number) {
  if (price === 50) return 'The market is at equilibrium: $50.';
  if (price < 50) return `The government sets a maximum price of $${price}, below equilibrium.`;
  return `The government sets a minimum price of $${price}, above equilibrium.`;
}

/** The paint grid, drawn inside the Diagram so it lines up with the axes. */
function PaintLayer(props: {
  painted: Set<number>;
  color: string;
  cursor: { col: number; row: number };
  outline: Pt[] | null;
  onPaint: (cells: number[], erase: boolean) => void;
  onCursor: (c: { col: number; row: number }) => void;
  brush: 1 | 3;
  erase: boolean;
  label: string;
}) {
  const { sx, sy, toData, plot } = useDiagram();
  const down = useRef(false);
  const cw = (sx(X_MAX) - sx(0)) / GRID;
  const ch = (sy(0) - sy(Y_MAX)) / GRID;
  const cellX = (col: number) => sx(0) + col * cw;
  const cellY = (row: number) => sy(0) - (row + 1) * ch;

  const paintAt = (e: PointerEvent) => {
    const c = cellAt(toData(e.clientX, e.clientY), X_MAX, Y_MAX);
    if (!c) return;
    props.onCursor(c);
    props.onPaint(brushCells(c.col, c.row, props.brush), props.erase);
  };

  const onKey = (e: KeyboardEvent) => {
    const { col, row } = props.cursor;
    const step = e.shiftKey ? 3 : 1;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      const c = { col: Math.max(0, Math.min(GRID - 1, col + moves[e.key][0])), row: Math.max(0, Math.min(GRID - 1, row + moves[e.key][1])) };
      props.onCursor(c);
      // Holding Space while moving keeps painting, like dragging with a mouse.
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      props.onPaint(brushCells(col, row, props.brush), props.erase);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      props.onPaint(brushCells(col, row, props.brush), true);
    }
  };

  const cells: preact.JSX.Element[] = [];
  props.painted.forEach((i) => {
    const col = i % GRID, row = Math.floor(i / GRID);
    cells.push(<rect key={i} x={cellX(col)} y={cellY(row)} width={cw + 0.3} height={ch + 0.3} fill={props.color} opacity="0.5" />);
  });
  const r = props.brush === 3 ? 1 : 0;
  return (
    <g>
      <g aria-hidden="true">{cells}</g>
      {props.outline && (
        <polygon
          points={props.outline.map((p) => `${sx(p.q)},${sy(p.p)}`).join(' ')}
          fill="none"
          stroke={TONE.ink}
          stroke-width="3"
          stroke-dasharray="7 4"
          aria-hidden="true"
        />
      )}
      <rect
        class="paint-surface"
        x={plot.left}
        y={plot.top}
        width={plot.right - plot.left}
        height={plot.bottom - plot.top}
        fill="transparent"
        {...({ tabindex: 0 } as object)}
        role="application"
        aria-label={props.label}
        style={{ cursor: 'crosshair', touchAction: 'none', outline: 'none' }}
        onPointerDown={(e) => {
          down.current = true;
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          paintAt(e);
        }}
        onPointerMove={(e) => down.current && paintAt(e)}
        onPointerUp={() => (down.current = false)}
        onPointerCancel={() => (down.current = false)}
        onKeyDown={onKey}
      />
      <rect
        class="paint-cursor"
        x={cellX(props.cursor.col - r)}
        y={cellY(props.cursor.row + r)}
        width={cw * (2 * r + 1)}
        height={ch * (2 * r + 1)}
        fill="none"
        stroke="#f2b600"
        stroke-width="3"
        aria-hidden="true"
        pointer-events="none"
      />
    </g>
  );
}

export function PaintGame(props: { onGoal: () => void }) {
  const [taskIndex, setTaskIndex] = useState(0);
  const [painted, setPainted] = useState<Set<number>>(new Set());
  const [brush, setBrush] = useState<1 | 3>(3);
  const [erase, setErase] = useState(false);
  const [cursor, setCursor] = useState({ col: 8, row: 20 });
  const [result, setResult] = useState<null | { score: number; extra: number; missed: number; shown: boolean }>(null);
  const [tries, setTries] = useState(0);
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [announce, setAnnounce] = useState('');
  const checkRef = useRef<HTMLButtonElement>(null);

  const task = PAINT_TASKS[taskIndex % PAINT_TASKS.length];
  const s = surplusShapes(BASE, task.price);
  const poly = task.ask === 'cs' ? s.cs : task.ask === 'ps' ? s.ps : s.wl;
  const target = targetCells(poly, X_MAX, Y_MAX);
  const atEq = task.price === 50;

  const paint = (cells: number[], isErase: boolean) => {
    if (result?.shown) return;
    setPainted((prev) => {
      const next = new Set(prev);
      cells.forEach((c) => (isErase ? next.delete(c) : next.add(c)));
      return next;
    });
    if (result) setResult(null);
  };

  const check = () => {
    const score = paintScore(painted, target);
    const m = paintMistakes(painted, target);
    setResult({ score, ...m, shown: false });
    setTries((t) => t + 1);
    if (score >= PASS_SCORE) {
      play('correct');
      celebrateAt(checkRef.current, 'small');
      setPassed((p) => {
        if (p.has(task.id)) return p;
        const n = new Set(p);
        n.add(task.id);
        if (n.size === PAINT_GOAL) {
          setTimeout(() => {
            play('win');
            celebrate({ size: 'big' });
            props.onGoal();
          }, 500);
        }
        return n;
      });
      setAnnounce(`Score ${score}%. Great painting.`);
    } else {
      play('wrong');
      setAnnounce(`Score ${score}%. ${m.extra} cells are outside the area and ${m.missed} cells of the area are not painted.`);
    }
  };

  const showMe = () => {
    setPainted(new Set(target));
    setResult({ score: 100, extra: 0, missed: 0, shown: true });
    setAnnounce(`Here is the ${NAME[task.ask]}. It is outlined with a dashed line.`);
  };

  const next = () => {
    setTaskIndex((i) => i + 1);
    setPainted(new Set());
    setResult(null);
    setTries(0);
    play('tap');
    setAnnounce('New painting task.');
  };

  const color = PAINT_TONE[task.ask];
  const lo = Math.min(s.qd, s.qs), hi = Math.max(s.qd, s.qs);
  const description = `Market for ski day passes. ${priceStory(task.price)} Quantity demanded ${round(s.qd, 0)}, quantity supplied ${round(s.qs, 0)}. ${painted.size} cells painted.`;

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <div class="play">
        <div class="stack">
          <Diagram xMax={X_MAX} yMax={Y_MAX} xLabel="Day passes" yLabel="Price ($)" title="Paint the surplus" description={description} xTicks={[200, 400, 600, 800]} yTicks={[20, 40, 60, 80, 100]}>
            <Curve line={DEMAND} label="D = MB" tone="navy" labelOffset={{ dx: -20, dy: -36 }} />
            <Curve line={SUPPLY} label="S = MC" tone="red" labelOffset={{ dx: -66, dy: -10 }} />
            <Guide at={s.eq} xText="Qₑ" yText="Pₑ" />
            <Dot at={s.eq} r={4} />
            <HLine p={task.price} tone="ink" label={`$${task.price}`} />
            {!atEq && (
              <>
                <Guide at={{ q: lo, p: task.price }} toY={false} tone="ink" />
                <Guide at={{ q: hi, p: task.price }} toY={false} tone="ink" />
                <Dot at={{ q: s.qd, p: task.price }} tone="navy" r={5} />
                <Dot at={{ q: s.qs, p: task.price }} tone="red" r={5} />
              </>
            )}
            <PaintLayer
              painted={painted}
              color={color}
              cursor={cursor}
              outline={result && (result.shown || result.score >= PASS_SCORE || tries >= 2) ? poly : null}
              onPaint={paint}
              onCursor={setCursor}
              brush={brush}
              erase={erase}
              label={`Paint grid for ${NAME[task.ask]}. Arrow keys move the brush, Space paints, Delete erases.`}
            />
          </Diagram>
          <div class="row" role="group" aria-label="Brush">
            <button class="btn btn-secondary btn-sm" aria-pressed={brush === 3 && !erase} onClick={() => { setBrush(3); setErase(false); }}>Big brush</button>
            <button class="btn btn-secondary btn-sm" aria-pressed={brush === 1 && !erase} onClick={() => { setBrush(1); setErase(false); }}>Small brush</button>
            <button class="btn btn-secondary btn-sm" aria-pressed={erase} onClick={() => setErase(!erase)}>Eraser</button>
            <button class="btn btn-quiet btn-sm" disabled={!painted.size || !!result?.shown} onClick={() => { setPainted(new Set()); setResult(null); }}>Clear</button>
          </div>
          <p class="small muted">Drag on the diagram to paint. Use the big brush for the middle and the small brush for the edges. Keyboard: Tab to the diagram, move with the arrow keys, press Space to paint and Delete to erase.</p>
        </div>

        <section class="event-card stack" aria-labelledby="paint-h">
          <p class="small muted" style={{ margin: 0 }}>
            Areas painted well: {passed.size} of {PAINT_GOAL} for the Surplus Painter stamp
          </p>
          <h3 id="paint-h">Paint the {NAME[task.ask]}</h3>
          <p>{priceStory(task.price)}</p>
          <p class="small">
            {task.ask === 'cs' && 'Consumer surplus is the area below demand and above the price, up to the quantity traded.'}
            {task.ask === 'ps' && 'Producer surplus is the area above supply and below the price, up to the quantity traded.'}
            {task.ask === 'wl' && 'Welfare loss is the area between demand and supply, from the quantity traded to the equilibrium quantity.'}
            {!atEq && ' Remember: the quantity traded is the smaller of Qd and Qs.'}
          </p>
          <div class="row">
            <button ref={checkRef} class="btn" disabled={!painted.size || !!result} onClick={check}>Check my painting</button>
            {tries >= 2 && !result?.shown && <button class="btn btn-quiet btn-sm" onClick={showMe}>Show me</button>}
          </div>
          {result && !result.shown && (
            <div class={`callout ${result.score >= PASS_SCORE ? 'callout-ok' : 'callout-try'}`} role="status">
              <p style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                {result.score >= PASS_SCORE ? <MarkIcon /> : <CrossIcon />}
                Match: {result.score}%
              </p>
              <div class="paint-meter" aria-hidden="true"><span style={{ width: `${result.score}%` }} /><i style={{ left: `${PASS_SCORE}%` }} /></div>
              {result.score >= PASS_SCORE ? (
                <p>Great painting. The dashed line shows the exact area.</p>
              ) : (
                <p>
                  {result.extra > result.missed
                    ? `You painted ${result.extra} cells outside the area. Check where the area stops.`
                    : `${result.missed} cells of the area are not painted yet.`}{' '}
                  Fix your painting, then check again. You need {PASS_SCORE}%.
                  {tries >= 2 && ' The dashed line now shows the exact area.'}
                </p>
              )}
            </div>
          )}
          {result?.shown && <p class="callout">The dashed line and the paint show the {NAME[task.ask]}. Try the next one yourself.</p>}
          {result && (result.shown || result.score >= PASS_SCORE) && (
            <div><button class="btn" onClick={next}>Next area</button></div>
          )}
        </section>
      </div>
    </div>
  );
}
