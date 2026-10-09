/**
 * Draws a diagram from a plain data description (JSON), so content files can include diagrams
 * without code. Used by Check it for "label the diagram", "choose the area" and "spot the error".
 *
 * Tags are lettered circles (A, B, C...) placed on the diagram. A question can ask what each
 * letter shows. Tags never rely on colour: the letter is the label.
 */
import type { Line, Pt } from '../../econ/calc';
import { Area, Arrow, Curve, Diagram, Dot, Guide, HLine, Label, Pattern, TONE, Tone, useDiagram } from './Diagram';

export interface DiagramSpec {
  xMax: number;
  yMax: number;
  xLabel: string;
  yLabel: string;
  title: string;
  /** What the diagram shows, for screen readers. Describe it without giving the answer away. */
  description: string;
  areas?: { points: Pt[]; tone?: Tone; pattern?: Pattern; label?: string; labelAt?: Pt }[];
  curves?: { line?: Line; points?: Pt[]; label?: string; tone?: Tone; dashed?: boolean; labelOffset?: { dx: number; dy: number } }[];
  hlines?: { p: number; label?: string; tone?: Tone; dashed?: boolean }[];
  guides?: { at: Pt; xText?: string; yText?: string }[];
  arrows?: { from: Pt; to: Pt; label?: string; tone?: Tone }[];
  dots?: { at: Pt; label?: string; tone?: Tone }[];
  texts?: { at: Pt; text: string; tone?: Tone; anchor?: 'start' | 'middle' | 'end' }[];
  /** Leave out the axes (flow charts). */
  noAxes?: boolean;
  /** Labelled boxes, for flow charts. Position and size are in data units. */
  boxes?: { at: Pt; w: number; h: number; text?: string }[];
  /** Lettered markers for label questions. */
  tags?: { at: Pt; letter: string }[];
}

function Box(props: { at: Pt; w: number; h: number; text?: string }) {
  const { sx, sy } = useDiagram();
  const x = sx(props.at.q - props.w / 2), y = sy(props.at.p + props.h / 2);
  const w = sx(props.at.q + props.w / 2) - x, h = sy(props.at.p - props.h / 2) - y;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx="8" fill="#eef3ff" stroke={TONE.navy} stroke-width="2" />
      {props.text && (
        <text x={x + w / 2} y={y + h / 2 + 5} text-anchor="middle" font-size="15" font-weight="700" fill={TONE.navy}>
          {props.text}
        </text>
      )}
    </g>
  );
}

function Tag(props: { at: Pt; letter: string }) {
  const { sx, sy } = useDiagram();
  const x = sx(props.at.q), y = sy(props.at.p);
  return (
    <g aria-hidden="true">
      <circle cx={x} cy={y} r="13" fill="#fff" stroke={TONE.red} stroke-width="2.5" />
      <text x={x} y={y + 5.5} text-anchor="middle" font-size="16" font-weight="700" fill={TONE.red}>
        {props.letter}
      </text>
    </g>
  );
}

export function SpecDiagram({ spec }: { spec: DiagramSpec }) {
  return (
    <Diagram xMax={spec.xMax} yMax={spec.yMax} xLabel={spec.xLabel} yLabel={spec.yLabel} title={spec.title} description={spec.description} noAxes={spec.noAxes}>
      {spec.boxes?.map((b, i) => <Box key={`b${i}`} {...b} />)}
      {spec.areas?.map((a, i) => <Area key={`a${i}`} points={a.points} tone={a.tone} pattern={a.pattern} label={a.label} labelAt={a.labelAt} />)}
      {spec.guides?.map((g, i) => <Guide key={`g${i}`} at={g.at} xText={g.xText} yText={g.yText} />)}
      {spec.hlines?.map((h, i) => <HLine key={`h${i}`} p={h.p} label={h.label} tone={h.tone} dashed={h.dashed} />)}
      {spec.curves?.map((c, i) => (
        <Curve key={`c${i}`} line={c.line} points={c.points} label={c.label} tone={c.tone} dashed={c.dashed} labelOffset={c.labelOffset} />
      ))}
      {spec.arrows?.map((a, i) => <Arrow key={`r${i}`} from={a.from} to={a.to} label={a.label} tone={a.tone} />)}
      {spec.dots?.map((d, i) => <Dot key={`d${i}`} at={d.at} label={d.label} tone={d.tone} />)}
      {spec.texts?.map((t, i) => <Label key={`t${i}`} at={t.at} text={t.text} tone={t.tone} anchor={t.anchor} bold />)}
      {spec.tags?.map((t) => <Tag key={t.letter} at={t.at} letter={t.letter} />)}
    </Diagram>
  );
}
