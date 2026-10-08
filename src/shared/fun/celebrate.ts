/**
 * celebrate() asks the app to show a short confetti burst.
 * The CelebrationLayer component (mounted once in the app) listens for it.
 */
export interface CelebrateOptions {
  /** Where the burst starts, as fractions of the screen (default: top centre). */
  x?: number;
  y?: number;
  /** 'small' for a correct answer, 'big' for a goal or stamp. */
  size?: 'small' | 'big';
}

export const CELEBRATE_EVENT = 'ib-econ:celebrate';

export function celebrate(options: CelebrateOptions = {}) {
  window.dispatchEvent(new CustomEvent(CELEBRATE_EVENT, { detail: options }));
}

/** Burst from the middle of an element, for example the button that was pressed. */
export function celebrateAt(el: Element | null, size: CelebrateOptions['size'] = 'small') {
  if (!el) return celebrate({ size });
  const r = el.getBoundingClientRect();
  celebrate({ x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight, size });
}
