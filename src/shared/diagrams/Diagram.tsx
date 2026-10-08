/**
 * Diagram engine: IB-style economics diagrams drawn as SVG.
 *
 *   <Diagram xMax={100} yMax={10} xLabel="Quantity" yLabel="Price ($)" title="Market for coffee">
 *     <Area points={[...]} pattern="hatch" tone="navy" label="CS" />
 *     <Curve line={demand} label="D₁" tone="navy" />
 *     <Guide at={eq} xText="Q₁" yText="P₁" />
 *     <Handle at={pt} onMove={...} label="Price" />
 *   </Diagram>
 *
 * All positions are in economic units (quantity across, price up), never pixels.
 * Children are drawn in order, so put shaded areas first and handles last.
 * Copy this folder (and src/shared/design) into another app to reuse it.
 */
import { ComponentChildren, createContext } from 'preact';
import { useContext, useId, useRef } from 'preact/hooks';
import type { Line, Pt } from '../../econ/calc';

export type Tone = 'navy' | 'red' | 'grey' | 'ink' | 'green';
export const TONE: Record<Tone, string> = {
  navy: '#1B3A6B',
  red: '#C8102E',
  grey: '#5b6475',
  ink: '#1a1f29',
  green: '#1e6b3a',
};
const TINT: Record<Tone, string> = {
  navy: '#c9d6ea',
  red: '#f4c9d0',
  grey: '#dde1e8',
  ink: '#d0d4dc',
  green: '#cfe7d7',
};

interface Ctx {
  sx: (q: number) => number;
  sy: (p: number) => number;
  toData: (clientX: number, clientY: number) => Pt;
  plot: { left: number; top: number; right: number; bottom: number };
  xMax: number;
  yMax: number;
  uid: string;
}
const DiagramCtx = createContext<Ctx | null>(null);
export function useDiagram(): Ctx {
  const c = useContext(DiagramCtx);
  if (!c) throw new Error('Diagram parts must be inside <Diagram>.');
  return c;
}

export interface DiagramProps {
  xMax: number;
  yMax: number;
  xLabel: string;
  yLabel: string;
  /** Short name read by screen readers, for example "Market for coffee". */
  title: string;
  /** Longer description of what the diagram shows right now. */
  description?: string;
  width?: number;
  height?: number;
  /** Numbered ticks (optional; IB diagrams often have none). */
  xTicks?: number[];
  yTicks?: number[];
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  /** Called with a data point when the student clicks or taps empty plot space. */
  onPlotClick?: (pt: Pt) => void;
  /** Leave out the axes, for flow charts such as the circular flow. */
  noAxes?: boolean;
  children?: ComponentChildren;
}

export function Diagram(props: DiagramProps) {
  // On phones, a narrower drawing keeps labels large enough to read.
  const narrow = typeof window !== 'undefined' && window.innerWidth < 600;
  const { xMax, yMax, width = narrow ? 430 : 560, height = narrow ? 380 : 420 } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const plot = { left: 64, top: 28, right: width - 56, bottom: height - 48 };
  const sx = (q: number) => plot.left + (q / xMax) * (plot.right - plot.left);
  const sy = (p: number) => plot.bottom - (p / yMax) * (plot.bottom - plot.top);
  const toData = (clientX: number, clientY: number): Pt => {
    const svg = svgRef.current;
    if (!svg) return { q: 0, p: 0 };
    const m = svg.getScreenCTM();
    if (!m) return { q: 0, p: 0 };
    const pt = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return {
      q: ((pt.x - plot.left) / (plot.right - plot.left)) * xMax,
      p: ((plot.bottom - pt.y) / (plot.bottom - plot.top)) * yMax,
    };
  };
  const ctx: Ctx = { sx, sy, toData, plot, xMax, yMax, uid };
  const fx = props.formatX ?? ((v: number) => String(v));
  const fy = props.formatY ?? ((v: number) => String(v));

  return (
    <DiagramCtx.Provider value={ctx}>
      <svg
        ref={svgRef}
        class="diagram"
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={props.title}
        style={{ width: '100%', height: 'auto', maxWidth: `${width * 1.4}px`, display: 'block', userSelect: 'none', fontFamily: 'var(--font-body)' }}
      >
        <title>{props.title}</title>
        {props.description && <desc>{props.description}</desc>}
        <Patterns uid={uid} />
        <rect
          x={plot.left}
          y={plot.top}
          width={plot.right - plot.left}
          height={plot.bottom - plot.top}
          fill="transparent"
          onClick={props.onPlotClick ? (e) => props.onPlotClick!(toData(e.clientX, e.clientY)) : undefined}
          style={props.onPlotClick ? { cursor: 'crosshair' } : undefined}
        />
        {/* Ticks */}
        {props.xTicks?.filter((t) => t !== 0).map((t) => (
          <g key={`x${t}`} aria-hidden="true">
            <line x1={sx(t)} x2={sx(t)} y1={plot.bottom} y2={plot.bottom + 5} stroke={TONE.ink} />
            <text x={sx(t)} y={plot.bottom + 19} text-anchor="middle" font-size="13" fill={TONE.grey}>
              {fx(t)}
            </text>
          </g>
        ))}
        {props.yTicks?.filter((t) => t !== 0).map((t) => (
          <g key={`y${t}`} aria-hidden="true">
            <line x1={plot.left - 5} x2={plot.left} y1={sy(t)} y2={sy(t)} stroke={TONE.ink} />
            <text x={plot.left - 9} y={sy(t) + 4} text-anchor="end" font-size="13" fill={TONE.grey}>
              {fy(t)}
            </text>
          </g>
        ))}
        {props.children}
        {/* Axes drawn last so they sit on top of shading */}
        {!props.noAxes && <g aria-hidden="true">
          <line x1={plot.left} y1={plot.top - 12} x2={plot.left} y2={plot.bottom} stroke={TONE.ink} stroke-width="2" />
          <line x1={plot.left} y1={plot.bottom} x2={plot.right + 16} y2={plot.bottom} stroke={TONE.ink} stroke-width="2" />
          <text x={plot.left - 8} y={plot.top - 16} text-anchor="start" font-size="15" font-weight="700" fill={TONE.ink}>
            {props.yLabel}
          </text>
          <text x={plot.right + 16} y={plot.bottom + 36} text-anchor="end" font-size="15" font-weight="700" fill={TONE.ink}>
            {props.xLabel}
          </text>
          <text x={plot.left - 10} y={plot.bottom + 18} text-anchor="end" font-size="14" fill={TONE.ink}>
            0
          </text>
        </g>}
      </svg>
    </DiagramCtx.Provider>
  );
}

/** Fill patterns so shaded areas never rely on colour alone. */
function Patterns({ uid }: { uid: string }) {
  return (
    <defs>
      {(Object.keys(TONE) as Tone[]).map((t) => (
        <g key={t}>
          <pattern id={`${uid}-hatch-${t}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill={TINT[t]} />
            <line x1="0" y1="0" x2="0" y2="8" stroke={TONE[t]} stroke-width="1.6" opacity="0.7" />
          </pattern>
          <pattern id={`${uid}-dots-${t}`} width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill={TINT[t]} />
            <circle cx="4" cy="4" r="1.4" fill={TONE[t]} opacity="0.8" />
          </pattern>
          <pattern id={`${uid}-cross-${t}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="9" height="9" fill={TINT[t]} />
            <path d="M0 4.5H9M4.5 0V9" stroke={TONE[t]} stroke-width="1.3" opacity="0.75" />
          </pattern>
          <pattern id={`${uid}-plain-${t}`} width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill={TINT[t]} />
          </pattern>
        </g>
      ))}
      <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" fill="context-stroke" />
      </marker>
      {(Object.keys(TONE) as Tone[]).map((t) => (
        <marker key={t} id={`${uid}-arrow-${t}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={TONE[t]} />
        </marker>
      ))}
    </defs>
  );
}

/** Clip an infinite straight line to the visible plot (0..xMax, 0..yMax). */
export function clipLine(line: Line, xMax: number, yMax: number): [Pt, Pt] | null {
  const dx = line.b.q - line.a.q;
  const dy = line.b.p - line.a.p;
  let t0 = -1e6, t1 = 1e6;
  const edges: [number, number][] = [
    [-dx, line.a.q - 0],
    [dx, xMax - line.a.q],
    [-dy, line.a.p - 0],
    [dy, yMax - line.a.p],
  ];
  for (const [pp, qq] of edges) {
    if (Math.abs(pp) < 1e-12) {
      if (qq < 0) return null;
    } else {
      const r = qq / pp;
      if (pp < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
    }
  }
  if (t0 > t1) return null;
  return [
    { q: line.a.q + t0 * dx, p: line.a.p + t0 * dy },
    { q: line.a.q + t1 * dx, p: line.a.p + t1 * dy },
  ];
}

export interface CurveProps {
  /** A straight line (demand, supply, MSB...) ... */
  line?: Line;
  /** ... or a list of points (a PPC, a TR curve). */
  points?: Pt[];
  /** Curve label such as D₁, S₂, MSC. */
  label?: string;
  tone?: Tone;
  dashed?: boolean;
  width?: number;
  /** Where the label sits: at the end with the larger quantity (default) or the start. */
  labelAt?: 'end' | 'start';
  labelOffset?: { dx: number; dy: number };
  /** Faded copy, for showing where a curve used to be. */
  ghost?: boolean;
}

export function Curve(props: CurveProps) {
  const { sx, sy, xMax, yMax } = useDiagram();
  const tone = props.tone ?? 'navy';
  let pts: Pt[] = [];
  if (props.line) {
    const c = clipLine(props.line, xMax, yMax);
    if (!c) return null;
    pts = c[0].q <= c[1].q ? c : [c[1], c[0]];
  } else if (props.points) pts = props.points;
  if (pts.length < 2) return null;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.q).toFixed(1)} ${sy(p.p).toFixed(1)}`).join(' ');
  const end = props.labelAt === 'start' ? pts[0] : pts[pts.length - 1];
  const off = props.labelOffset ?? { dx: 6, dy: props.labelAt === 'start' ? -6 : 4 };
  return (
    <g opacity={props.ghost ? 0.45 : 1} aria-hidden="true">
      <path d={d} fill="none" stroke={TONE[tone]} stroke-width={props.width ?? 3} stroke-dasharray={props.dashed ? '8 6' : undefined} stroke-linecap="round" stroke-linejoin="round" />
      {props.label && <Halo x={sx(end.q) + off.dx} y={sy(end.p) + off.dy} text={props.label} fill={TONE[tone]} size={17} bold />}
    </g>
  );
}

/** Text with a white outline so it stays readable over lines and shading. */
export function Halo(props: { x: number; y: number; text: string; fill?: string; size?: number; bold?: boolean; anchor?: 'start' | 'middle' | 'end' }) {
  const common = {
    x: props.x,
    y: props.y,
    'font-size': props.size ?? 14,
    'font-weight': props.bold ? 700 : 400,
    'text-anchor': props.anchor ?? 'start',
  } as const;
  return (
    <g aria-hidden="true">
      <text {...common} stroke="#fff" stroke-width="4" stroke-linejoin="round" fill="#fff">
        {props.text}
      </text>
      <text {...common} fill={props.fill ?? TONE.ink}>
        {props.text}
      </text>
    </g>
  );
}

/** Dashed lines from a point to both axes, with optional axis labels (P₁, Q₁). */
export function Guide(props: { at: Pt; xText?: string; yText?: string; tone?: Tone; toX?: boolean; toY?: boolean }) {
  const { sx, sy, plot } = useDiagram();
  const x = sx(props.at.q), y = sy(props.at.p);
  const col = TONE[props.tone ?? 'grey'];
  return (
    <g aria-hidden="true">
      {props.toY !== false && <line x1={plot.left} y1={y} x2={x} y2={y} stroke={col} stroke-width="1.6" stroke-dasharray="5 5" />}
      {props.toX !== false && <line x1={x} y1={y} x2={x} y2={plot.bottom} stroke={col} stroke-width="1.6" stroke-dasharray="5 5" />}
      {props.yText && <Halo x={plot.left - 9} y={y + 5} text={props.yText} anchor="end" size={14} bold fill={TONE.ink} />}
      {props.xText && <Halo x={x} y={plot.bottom + 34} text={props.xText} anchor="middle" size={14} bold fill={TONE.ink} />}
    </g>
  );
}

export function Dot(props: { at: Pt; label?: string; tone?: Tone; r?: number; labelDx?: number; labelDy?: number; hollow?: boolean }) {
  const { sx, sy } = useDiagram();
  const col = TONE[props.tone ?? 'ink'];
  return (
    <g aria-hidden="true">
      <circle cx={sx(props.at.q)} cy={sy(props.at.p)} r={props.r ?? 5} fill={props.hollow ? '#fff' : col} stroke={col} stroke-width="2" />
      {props.label && <Halo x={sx(props.at.q) + (props.labelDx ?? 8)} y={sy(props.at.p) + (props.labelDy ?? -8)} text={props.label} bold size={15} />}
    </g>
  );
}

export type Pattern = 'hatch' | 'dots' | 'cross' | 'plain';

/** A shaded, labelled area (consumer surplus, welfare loss, total revenue...). */
export function Area(props: { points: Pt[]; tone?: Tone; pattern?: Pattern; label?: string; labelAt?: Pt; opacity?: number }) {
  const { sx, sy, uid } = useDiagram();
  if (props.points.length < 3) return null;
  const tone = props.tone ?? 'navy';
  const d = props.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.q).toFixed(1)} ${sy(p.p).toFixed(1)}`).join(' ') + 'Z';
  const c = props.labelAt ?? centroid(props.points);
  return (
    <g aria-hidden="true">
      <path d={d} fill={`url(#${uid}-${props.pattern ?? 'plain'}-${tone})`} stroke={TONE[tone]} stroke-width="1" stroke-opacity="0.5" opacity={props.opacity ?? 1} />
      {props.label && <Halo x={sx(c.q)} y={sy(c.p) + 5} text={props.label} anchor="middle" bold size={15} fill={TONE[tone === 'grey' ? 'ink' : tone]} />}
    </g>
  );
}

function centroid(pts: Pt[]): Pt {
  const n = pts.length;
  return { q: pts.reduce((s, p) => s + p.q, 0) / n, p: pts.reduce((s, p) => s + p.p, 0) / n };
}

/** An arrow showing a shift or movement. */
export function Arrow(props: { from: Pt; to: Pt; tone?: Tone; label?: string; width?: number }) {
  const { sx, sy, uid } = useDiagram();
  const tone = props.tone ?? 'ink';
  const x1 = sx(props.from.q), y1 = sy(props.from.p), x2 = sx(props.to.q), y2 = sy(props.to.p);
  if (Math.hypot(x2 - x1, y2 - y1) < 8) return null;
  return (
    <g aria-hidden="true">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={TONE[tone]} stroke-width={props.width ?? 2.5} marker-end={`url(#${uid}-arrow-${tone})`} />
      {props.label && <Halo x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} text={props.label} anchor="middle" bold fill={TONE[tone]} />}
    </g>
  );
}

/** Free text placed at a data point. */
export function Label(props: { at: Pt; text: string; tone?: Tone; anchor?: 'start' | 'middle' | 'end'; size?: number; dx?: number; dy?: number; bold?: boolean }) {
  const { sx, sy } = useDiagram();
  return <Halo x={sx(props.at.q) + (props.dx ?? 0)} y={sy(props.at.p) + (props.dy ?? 0)} text={props.text} fill={TONE[props.tone ?? 'ink']} anchor={props.anchor} size={props.size} bold={props.bold} />;
}

/** A horizontal line across the plot at a price (price ceiling, floor, a chosen price). */
export function HLine(props: { p: number; tone?: Tone; label?: string; dashed?: boolean; width?: number }) {
  const { sy, plot } = useDiagram();
  const y = sy(props.p);
  const col = TONE[props.tone ?? 'ink'];
  return (
    <g aria-hidden="true">
      <line x1={plot.left} x2={plot.right} y1={y} y2={y} stroke={col} stroke-width={props.width ?? 2.5} stroke-dasharray={props.dashed ? '8 6' : undefined} />
      {props.label && <Halo x={plot.right + 4} y={y + 5} text={props.label} fill={col} bold />}
    </g>
  );
}

export interface HandleProps {
  at: Pt;
  /** Receives the dragged-to point in data units. Clamp or snap it in the parent. */
  onMove: (pt: Pt) => void;
  onRelease?: () => void;
  /** Screen-reader name, for example "Demand curve D₁". */
  label: string;
  /** Read aloud after each move, for example "Price $6.50, quantity 40". */
  valueText: string;
  /** Size of one arrow-key step in data units. Shift + arrow moves 5 steps. */
  step: { q: number; p: number };
  /** Restrict to one direction. */
  axis?: 'q' | 'p' | 'both';
  tone?: Tone;
  /** Draw as a ring on a curve (for shifting a whole curve) or a solid knob (for a point). */
  look?: 'knob' | 'ring';
}

/**
 * A draggable control. Works with mouse, touch, pen and the keyboard
 * (Tab to it, then arrow keys; Shift + arrow for bigger steps).
 */
export function Handle(props: HandleProps) {
  const { sx, sy, toData } = useDiagram();
  const dragging = useRef(false);
  const axis = props.axis ?? 'both';
  const col = TONE[props.tone ?? 'red'];
  const x = sx(props.at.q), y = sy(props.at.p);

  const move = (e: PointerEvent) => {
    if (!dragging.current) return;
    const d = toData(e.clientX, e.clientY);
    props.onMove({ q: axis === 'p' ? props.at.q : d.q, p: axis === 'q' ? props.at.p : d.p });
  };
  const onKey = (e: KeyboardEvent) => {
    const mult = e.shiftKey ? 5 : 1;
    let dq = 0, dp = 0;
    if (e.key === 'ArrowRight') dq = 1;
    else if (e.key === 'ArrowLeft') dq = -1;
    else if (e.key === 'ArrowUp') dp = 1;
    else if (e.key === 'ArrowDown') dp = -1;
    else return;
    // On a one-direction handle, any arrow key moves it along that direction.
    if (axis === 'q' && dp) { dq = dp; dp = 0; }
    if (axis === 'p' && dq) { dp = dq; dq = 0; }
    e.preventDefault();
    props.onMove({ q: props.at.q + dq * props.step.q * mult, p: props.at.p + dp * props.step.p * mult });
    props.onRelease?.();
  };

  return (
    <g
      class="handle"
      // Lower-case attribute: on SVG elements the camel-case tabIndex property is ignored.
      {...({ tabindex: 0 } as object)}
      role="slider"
      aria-label={props.label}
      aria-valuetext={props.valueText}
      aria-orientation={axis === 'p' ? 'vertical' : 'horizontal'}
      style={{ cursor: axis === 'q' ? 'ew-resize' : axis === 'p' ? 'ns-resize' : 'grab', touchAction: 'none', outline: 'none' }}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        e.preventDefault();
      }}
      onPointerMove={move}
      onPointerUp={() => {
        dragging.current = false;
        props.onRelease?.();
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onKeyDown={onKey}
    >
      {/* Large invisible target so fingers can grab it */}
      <circle cx={x} cy={y} r={24} fill="transparent" />
      <circle class="handle-focus" cx={x} cy={y} r={15} fill="none" stroke="#f2b600" stroke-width="4" />
      {props.look === 'ring' ? (
        <circle cx={x} cy={y} r={10} fill="#fff" stroke={col} stroke-width="3.5" />
      ) : (
        <>
          <circle cx={x} cy={y} r={10} fill={col} stroke="#fff" stroke-width="2.5" />
          {axis === 'q' && <path d={`M${x - 5} ${y}h10M${x - 5} ${y}l3 -3M${x - 5} ${y}l3 3M${x + 5} ${y}l-3 -3M${x + 5} ${y}l-3 3`} stroke="#fff" stroke-width="1.6" fill="none" />}
          {axis === 'p' && <path d={`M${x} ${y - 5}v10M${x} ${y - 5}l-3 3M${x} ${y - 5}l3 3M${x} ${y + 5}l-3 -3M${x} ${y + 5}l3 -3`} stroke="#fff" stroke-width="1.6" fill="none" />}
        </>
      )}
    </g>
  );
}
