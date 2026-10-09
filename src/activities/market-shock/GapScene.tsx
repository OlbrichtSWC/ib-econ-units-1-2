/**
 * A picture of the market stall at the current price: a queue of buyers when there is a shortage,
 * a pile of unsold bags when there is a surplus. As the price adjusts, the queue or pile shrinks.
 * The numbers are also given in words, so the picture is never the only way to read them.
 */
import { round } from '../../econ/calc';

/** Each figure or bag in the picture stands for this many bags. */
export const BAGS_PER_ICON = 2;

function Person({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} class="gs-item">
      <circle cx="0" cy="-30" r="6" fill="#1D4ED8" />
      <path d="M-7 -2v-14a7 7 0 0114 0v14z" fill="#1D4ED8" />
      <path d="M-4 -2v10M4 -2v10" stroke="#1D4ED8" stroke-width="3" stroke-linecap="round" />
    </g>
  );
}

function Bag({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} class="gs-item">
      <path d="M-9 0l2-16h14l2 16z" fill="#8a5300" stroke="#5a3600" stroke-width="1.2" />
      <path d="M-5 -16v-3h10v3" fill="none" stroke="#5a3600" stroke-width="1.5" />
      <circle cx="0" cy="-7" r="2.6" fill="#f7e2c0" />
    </g>
  );
}

export function GapScene(props: { kind: 'shortage' | 'surplus' | 'none'; size: number; price: number }) {
  const n = props.kind === 'none' ? 0 : Math.min(14, Math.round(props.size / BAGS_PER_ICON));
  const label =
    props.kind === 'shortage'
      ? `Queue of buyers: a shortage of ${round(props.size, 0)} bags at $${props.price.toFixed(2)}.`
      : props.kind === 'surplus'
        ? `Pile of unsold bags: a surplus of ${round(props.size, 0)} bags at $${props.price.toFixed(2)}.`
        : `No queue and no pile: the market clears at $${props.price.toFixed(2)}.`;
  return (
    <figure class="gap-scene" style={{ margin: 0 }}>
      <svg viewBox="0 0 420 96" role="img" aria-label={label}>
        <rect x="0" y="86" width="420" height="10" fill="#d6e2ff" />
        {/* The stall */}
        <rect x="8" y="34" width="86" height="52" fill="#fff" stroke="#1D4ED8" stroke-width="2" />
        <path d="M4 34l10-20h74l10 20z" fill="#C8102E" />
        <path d="M18 14l-6 20M32 14l-4 20M46 14v20M60 14l4 20M74 14l6 20" stroke="#fff" stroke-width="3" />
        <text x="51" y="58" text-anchor="middle" font-size="15" font-weight="700" fill="#1D4ED8" style={{ fontVariantNumeric: 'tabular-nums' }}>
          ${props.price.toFixed(2)}
        </text>
        <text x="51" y="76" text-anchor="middle" font-size="10" fill="#4a5263">
          {props.kind === 'shortage' ? 'SOLD OUT' : props.kind === 'surplus' ? 'SALE' : 'per bag'}
        </text>
        {props.kind === 'shortage' && Array.from({ length: n }, (_, i) => <Person key={i} x={116 + i * 21} y={78} />)}
        {props.kind === 'surplus' &&
          Array.from({ length: n }, (_, i) => {
            // Stack the bags in a pile: 5 on the bottom row, then 4, 3, 2.
            const rows = [5, 4, 3, 2];
            let r = 0, k = i;
            while (r < rows.length - 1 && k >= rows[r]) k -= rows[r++];
            return <Bag key={i} x={124 + r * 10 + k * 21} y={86 - r * 17} />;
          })}
      </svg>
      <figcaption class="small" aria-hidden="true">
        {props.kind === 'shortage' && <>Each person stands for {BAGS_PER_ICON} bags buyers want but cannot get.</>}
        {props.kind === 'surplus' && <>Each bag stands for {BAGS_PER_ICON} bags roasters cannot sell.</>}
        {props.kind === 'none' && <>The queue and the pile are gone. Quantity demanded equals quantity supplied.</>}
      </figcaption>
    </figure>
  );
}
