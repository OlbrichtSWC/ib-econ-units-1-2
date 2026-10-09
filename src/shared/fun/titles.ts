/**
 * Economist titles: a personal title that grows with the number of stamps a student has.
 * Titles are just for the student. They are never compared with anyone else's.
 */
export interface Title {
  /** Stamps needed. */
  at: number;
  name: string;
  icon: string;
}

export const TITLES: Title[] = [
  { at: 0, name: 'New Recruit', icon: '🌱' },
  { at: 1, name: 'Apprentice Economist', icon: '🎒' },
  { at: 5, name: 'Junior Economist', icon: '📘' },
  { at: 15, name: 'Economist', icon: '📊' },
  { at: 30, name: 'Senior Economist', icon: '🎓' },
  { at: 50, name: 'Chief Economist', icon: '🏛️' },
  { at: 75, name: 'Economics Legend', icon: '🏆' },
];

/** The title for a number of stamps. */
export function titleFor(stamps: number): Title {
  return [...TITLES].reverse().find((t) => stamps >= t.at) ?? TITLES[0];
}

/** The next title to aim for, or null at the top. */
export function nextTitle(stamps: number): Title | null {
  return TITLES.find((t) => t.at > stamps) ?? null;
}

/** Share of the way from the current title to the next one, from 0 to 1 (1 at the top title). */
export function towardNext(stamps: number): number {
  const now = titleFor(stamps);
  const next = nextTitle(stamps);
  if (!next) return 1;
  return (stamps - now.at) / (next.at - now.at);
}
