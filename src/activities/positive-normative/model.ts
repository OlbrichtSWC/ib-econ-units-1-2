/**
 * Fact Lab (1.2): the rules behind the game, kept apart from the screen so they can be tested.
 */

export type Kind = 'positive' | 'normative';
export const KINDS: Kind[] = ['positive', 'normative'];

/** Level 1: sort statements on the conveyor belt. */
export const BELT_GOAL = 10;
/** Level 2: find the value word. */
export const VALUE_GOAL = 7;
/** Level 3: method steps + rewrites + timeline, each scored on the first try. */
export const LAB_GOAL = 12;

export type Century = '18' | '19' | '20' | '21';
export const CENTURIES: Century[] = ['18', '19', '20', '21'];

/** Split a statement into the words a student can tap. Punctuation stays on the word for display. */
export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** A word without punctuation or capitals, for comparing with the value words. */
export function bare(word: string): string {
  return word.toLowerCase().replace(/[^a-z']/g, '');
}

/**
 * Is the tapped word a value word? `values` lists the accepted words (bare form).
 * A positive statement has no value words, so every tap is wrong and "No value word" is right.
 */
export function isValueWord(word: string, values: string[]): boolean {
  return values.includes(bare(word));
}

/** Does the statement contain every value word it claims to? Guards the content. */
export function valuesInText(text: string, values: string[]): boolean {
  const words = tokenize(text).map(bare);
  return values.every((v) => words.includes(v));
}

/**
 * Method steps are tapped in order. Returns the next step index after a tap,
 * or -1 when the tap is not the next step.
 */
export function nextMethodStep(placed: number, tapped: number): number {
  return tapped === placed ? placed + 1 : -1;
}

/** Points available in level 3. */
export function labMax(steps: number, rewrites: number, ideas: number): number {
  return steps + rewrites + ideas;
}

export const beltWon = (firstRight: number, goal = BELT_GOAL) => firstRight >= goal;
export const valueWon = (firstRight: number) => firstRight >= VALUE_GOAL;
export const labWon = (points: number) => points >= LAB_GOAL;
