/**
 * The café's shop front: customers walk in after the café opens, and the till counts up
 * today's revenue. Each customer stands for CUPS_PER_ICON cups. Customers lost since
 * yesterday are shown as faded outlines walking away. All numbers are also given in words.
 */
import { useEffect, useState } from 'preact/hooks';
import { reducedMotion } from '../../shared/fun/motion';
import { money } from './model';

export const CUPS_PER_ICON = 10;
const MAX_ICONS = 30;

function Customer({ i, lost }: { i: number; lost?: boolean }) {
  return (
    <span class={`cust ${lost ? 'cust-lost' : ''}`} style={{ animationDelay: `${Math.min(i, 30) * 40}ms` }} aria-hidden="true">
      <svg width="14" height="26" viewBox="0 0 14 26">
        <circle cx="7" cy="5" r="4.2" />
        <path d="M1.5 24v-9a5.5 5.5 0 0111 0v9z" />
      </svg>
    </span>
  );
}

/** Counts up to the value over a short time (instantly if the device asks for less motion). */
function useCountUp(value: number, key: number) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reducedMotion()) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      setShown(value * (1 - (1 - t) ** 3));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, key]);
  return shown;
}

export function ShopFront(props: { name: string; day: number; cups: number; yesterdayCups?: number; revenue: number }) {
  const icons = Math.min(MAX_ICONS, Math.round(props.cups / CUPS_PER_ICON));
  const before = props.yesterdayCups === undefined ? undefined : Math.min(MAX_ICONS, Math.round(props.yesterdayCups / CUPS_PER_ICON));
  const lost = before !== undefined ? Math.max(0, before - icons) : 0;
  const diff = props.yesterdayCups === undefined ? null : props.cups - props.yesterdayCups;
  const till = useCountUp(props.revenue, props.day);
  return (
    <section class="shopfront" aria-label={`Day ${props.day} at ${props.name}`}>
      <div class="shop-awning" aria-hidden="true" />
      <div class="shop-body">
        <div class="shop-queue" key={props.day}>
          {Array.from({ length: icons }, (_, i) => <Customer key={i} i={i} />)}
          {Array.from({ length: lost }, (_, i) => <Customer key={`l${i}`} i={icons + i} lost />)}
        </div>
        <div class="shop-till">
          <span class="small">Till</span>
          <b style={{ fontVariantNumeric: 'tabular-nums' }}>{money(till)}</b>
        </div>
      </div>
      <p class="small" style={{ margin: '6px 0 0' }}>
        {props.cups} cups sold. Each person stands for {CUPS_PER_ICON} cups.
        {diff !== null && diff !== 0 && (
          <> {diff > 0 ? `${diff} more cups than yesterday.` : `${-diff} fewer cups than yesterday (faded people walked away).`}</>
        )}
        {diff === 0 && <> The same number of cups as yesterday.</>}
      </p>
    </section>
  );
}

/** The four cafés of the campaign as a row of shops: done, current or locked. */
export function CampaignMap(props: { names: string[]; week: number; grew: boolean[] }) {
  return (
    <ol class="campaign-map" aria-label="Campaign: four cafés">
      {props.names.map((n, i) => {
        const state = i < props.grew.length ? (props.grew[i] ? 'met' : 'missed') : i === props.week ? 'now' : 'locked';
        const words = state === 'met' ? 'goal met' : state === 'missed' ? 'goal not met' : state === 'now' ? 'this week' : 'locked';
        return (
          <li key={n} class={`cm-shop cm-${state}`}>
            <span class="cm-week">Week {i + 1}</span>
            <span class="cm-name">{n}</span>
            <span class="cm-state">
              {state === 'met' && '✓ '}
              {state === 'locked' && '🔒 '}
              {words}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
