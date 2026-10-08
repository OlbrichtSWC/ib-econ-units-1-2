/** A rubber-stamp picture. Earned stamps are inked in red; stamps not yet earned are a dashed outline. */
import { ComponentChildren } from 'preact';

export type StampIcon = 'island' | 'shift' | 'brush' | 'cup' | 'target' | 'star' | 'circle' | 'pillars';

const ICONS: Record<StampIcon, ComponentChildren> = {
  // Palm tree on an island
  island: (
    <g>
      <path d="M30 66c8-6 32-6 40 0" />
      <path d="M50 64c0-10 1-20-2-30" />
      <path d="M48 34c-6-6-14-6-18-2M48 34c6-7 14-7 18-3M48 34c-2-7 1-12 6-14M48 34c-8 0-12 4-13 9" />
    </g>
  ),
  // A demand curve shifting right
  shift: (
    <g>
      <path d="M28 30v38h44" />
      <path d="M34 34l26 26" stroke-dasharray="3 3" />
      <path d="M44 32l26 26" />
      <path d="M50 44l8 0m-3-3l3 3-3 3" />
    </g>
  ),
  // Paint brush
  brush: (
    <g>
      <path d="M62 28L44 52" />
      <path d="M44 52c-6-2-12 2-12 8 0 4-3 6-5 7 8 2 18 0 20-8 1-3 0-5-3-7z" />
    </g>
  ),
  // Coffee cup
  cup: (
    <g>
      <path d="M32 42h30v12c0 8-6 14-15 14s-15-6-15-14z" />
      <path d="M62 46h4c4 0 6 3 6 6s-2 6-6 6h-5" />
      <path d="M40 30c-2 3 2 5 0 8M48 28c-2 3 2 5 0 8M56 30c-2 3 2 5 0 8" />
    </g>
  ),
  // Target
  target: (
    <g>
      <circle cx="50" cy="50" r="18" />
      <circle cx="50" cy="50" r="10" />
      <circle cx="50" cy="50" r="2.5" fill="currentColor" />
    </g>
  ),
  // A government building with pillars
  pillars: (
    <g>
      <path d="M30 40l20-12 20 12z" />
      <path d="M30 68h40M32 64h36" />
      <path d="M36 44v18M45 44v18M55 44v18M64 44v18" />
    </g>
  ),
  star: <path d="M50 28l6.5 13.5 14.5 2-10.5 10 2.5 14.5L50 61l-13 7 2.5-14.5-10.5-10 14.5-2z" />,
  // Four arrows in a circle: all four steps
  circle: (
    <g>
      <path d="M50 30a20 20 0 0119 14M70 50a20 20 0 01-14 19M50 70a20 20 0 01-19-14M30 50a20 20 0 0114-19" />
      <path d="M66 40l3 4 4-3M58 68l-2 1 1 4M34 60l-3-4-4 3M42 32l2-1-1-4" />
    </g>
  ),
};

export function Stamp(props: { icon: StampIcon; earned: boolean; size?: number; label?: string; animate?: boolean; level?: number }) {
  const size = props.size ?? 88;
  const cls = `stamp ${props.earned ? 'stamp-earned' : 'stamp-empty'} ${props.animate ? 'stamp-animate' : ''}`;
  return (
    <svg class={cls} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={props.label} aria-hidden={props.label ? undefined : 'true'} focusable="false">
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width={props.earned ? 4 : 2} stroke-dasharray={props.earned ? undefined : '5 5'} />
      {props.earned && <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 3" />}
      <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity={props.earned ? 1 : 0.45}>
        {ICONS[props.icon]}
      </g>
      {props.level && props.level > 1 && (
        // A small level number at the bottom of the stamp: the same picture, a harder level.
        <g opacity={props.earned ? 1 : 0.6}>
          <circle cx="76" cy="76" r="14" fill="var(--white, #fff)" stroke="currentColor" stroke-width="3" />
          <text x="76" y="82" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor" font-family="Calibri, Carlito, sans-serif">
            {props.level}
          </text>
        </g>
      )}
    </svg>
  );
}
