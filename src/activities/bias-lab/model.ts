/**
 * Mind Tricks Lab (2.4, HL only): the rules behind the game, kept apart from the screen so they can be tested.
 * Nothing here records or sends what a student chooses. Every result stays on the screen.
 */

/** What can be at work in a choice: the biases and limits that behavioural economics names (2.4). */
export type Effect =
  | 'anchoring' | 'framing' | 'availability' | 'rule'
  | 'rationality' | 'selfcontrol' | 'selfishness' | 'info';

/** Level 1 offers the four biases and bounded self-control. */
export const EXPERIMENT_EFFECTS: Effect[] = ['anchoring', 'framing', 'availability', 'rule', 'selfcontrol'];
/** Level 2 offers every bias and limit from the guide. */
export const ALL_EFFECTS: Effect[] = ['anchoring', 'framing', 'availability', 'rule', 'rationality', 'selfcontrol', 'selfishness', 'info'];

/** Choice architecture and nudges (2.4 Behavioural economics in action). */
export type Tool = 'default' | 'restricted' | 'mandated' | 'nudge';
export const TOOLS: Tool[] = ['default', 'restricted', 'mandated', 'nudge'];

/** Business objectives (2.4). */
export type Objective = 'profit' | 'csr' | 'share' | 'satisficing' | 'growth';
export const OBJECTIVES: Objective[] = ['profit', 'csr', 'share', 'satisficing', 'growth'];

/** Level goals: answers right first time. */
export const SUBJECT_GOAL = 4;
export const HUNT_GOAL = 8;
export const DESIGN_GOAL = 10;

/** The numbers the anchor wheel can land on. Half are low and half are high. */
export const ANCHORS = [8, 12, 15, 19, 81, 86, 92, 97];

/** The wheel's number for this play. The same seed always gives the same number. */
export function anchorFor(seed: number): number {
  const i = ((seed * 7 + 3) % ANCHORS.length + ANCHORS.length) % ANCHORS.length;
  return ANCHORS[i];
}

/** Is the anchor high (above the middle of the 0 to 100 scale)? */
export const isHighAnchor = (anchor: number) => anchor > 50;

/**
 * Where an estimate sits compared with the anchor, for the reveal screen.
 * 'near' when within 15 of the anchor, otherwise the side the estimate is on.
 */
export function anchorGap(anchor: number, estimate: number): 'near' | 'below' | 'above' {
  if (Math.abs(estimate - anchor) <= 15) return 'near';
  return estimate < anchor ? 'below' : 'above';
}

/** "90% fat free" and "10% fat" describe the same food: fat % = 100 − fat-free %. */
export function fatPercent(fatFreePercent: number): number {
  return 100 - fatFreePercent;
}

/** Extra paid by always buying the usual brand: (usual − other) × times bought, to the cent. */
export function habitCost(usualPrice: number, otherPrice: number, times: number): number {
  return Math.round((usualPrice - otherPrice) * times * 100) / 100;
}

/** Profit = total revenue − total cost. */
export function profit(revenue: number, cost: number): number {
  return revenue - cost;
}

/** First-try points available in level 3: a tool and a reason for each goal, plus one objective per firm. */
export function designMax(goals: number, firms: number): number {
  return goals * 2 + firms;
}

export const subjectWon = (firstRight: number, goal = SUBJECT_GOAL) => firstRight >= goal;
export const huntWon = (firstRight: number, goal = HUNT_GOAL) => firstRight >= goal;
export const designWon = (points: number) => points >= DESIGN_GOAL;
