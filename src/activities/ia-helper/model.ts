/**
 * IA Trailhead: rules from the IB Economics guide, internal assessment section.
 * A portfolio has three commentaries on news articles. Each one is on a different unit
 * (Unit 2, 3 or 4, never Unit 1), uses a different key concept as its lens, comes from a
 * different source, was published no more than a year before the commentary was written,
 * and is at most 800 words.
 */

export type Unit = 1 | 2 | 3 | 4;
/** The units a commentary may be based on. Unit 1 is excluded. */
export const IA_UNITS: Unit[] = [2, 3, 4];
export const UNIT_NAMES: Record<Unit, string> = {
  1: 'Unit 1: Introduction to economics',
  2: 'Unit 2: Microeconomics',
  3: 'Unit 3: Macroeconomics',
  4: 'Unit 4: The global economy',
};

export type Concept =
  | 'scarcity' | 'choice' | 'efficiency' | 'equity' | 'wellbeing'
  | 'sustainability' | 'change' | 'interdependence' | 'intervention';
/** The nine key concepts, in the order the guide lists them. */
export const CONCEPTS: Concept[] = ['scarcity', 'choice', 'efficiency', 'equity', 'wellbeing', 'sustainability', 'change', 'interdependence', 'intervention'];
export const CONCEPT_NAMES: Record<Concept, string> = {
  scarcity: 'Scarcity',
  choice: 'Choice',
  efficiency: 'Efficiency',
  equity: 'Equity',
  wellbeing: 'Economic well-being',
  sustainability: 'Sustainability',
  change: 'Change',
  interdependence: 'Interdependence',
  intervention: 'Intervention',
};

export const MAX_WORDS = 800;
/** Articles must be published no earlier than one year before the commentary is written. */
export const MAX_AGE_MONTHS = 12;

// ---------------- Level 1: the compass ----------------

/**
 * The student chooses a unit (2, 3 or 4) and answers five questions about it.
 * Each answer adds a point to one topic in that unit and one key concept.
 */
export interface TopicLean { topic: string; concept: Concept }

export interface UnitCompassResult {
  /** The unit's topics, most points first (ties keep the syllabus order given). */
  topics: { topic: string; points: number }[];
  /** Key concepts with at least one point, most first (ties keep the guide's order). */
  concepts: { concept: Concept; points: number }[];
}

export function unitCompass(answers: readonly TopicLean[], topicOrder: readonly string[]): UnitCompassResult {
  const t = new Map<string, number>(topicOrder.map((x) => [x, 0]));
  const c = new Map<Concept, number>(CONCEPTS.map((x) => [x, 0]));
  for (const a of answers) {
    if (t.has(a.topic)) t.set(a.topic, t.get(a.topic)! + 1);
    if (c.has(a.concept)) c.set(a.concept, c.get(a.concept)! + 1);
  }
  const topics = topicOrder.map((topic) => ({ topic, points: t.get(topic)! })).sort((a, b) => b.points - a.points);
  const concepts = CONCEPTS.map((concept) => ({ concept, points: c.get(concept)! }))
    .filter((x) => x.points > 0)
    .sort((a, b) => b.points - a.points);
  return { topics, concepts };
}

/** What the compass found for each unit the student has explored: top topic and key concepts, best first. */
export type CompassMemory = Partial<Record<Unit, { topic: string; concepts: Concept[] }>>;

/**
 * A plan with one commentary per unit (2, 3, 4). Each unit takes its own best key concept that
 * no earlier unit has taken. A unit not explored yet takes the first key concept still free.
 */
export function planFromCompass(mem: CompassMemory): PlanRow[] {
  const used = new Set<Concept>();
  return IA_UNITS.map((unit) => {
    const prefs = [...(mem[unit]?.concepts ?? []), ...CONCEPTS];
    const concept = prefs.find((c) => !used.has(c))!;
    used.add(concept);
    return { unit, concept };
  });
}

/** One commentary in the student's plan. */
export interface PlanRow { unit: Unit | null; concept: Concept | null }

export type PlanProblem = 'missing' | 'unit1' | 'sameUnit' | 'sameConcept';

/** What is wrong with a plan of three commentaries, if anything. An empty list means it meets the rules. */
export function planProblems(plan: readonly PlanRow[]): PlanProblem[] {
  const out: PlanProblem[] = [];
  if (plan.length !== 3 || plan.some((r) => r.unit === null || r.concept === null)) out.push('missing');
  const units = plan.map((r) => r.unit).filter((x): x is Unit => x !== null);
  const concepts = plan.map((r) => r.concept).filter((x): x is Concept => x !== null);
  if (units.includes(1)) out.push('unit1');
  if (new Set(units).size < units.length) out.push('sameUnit');
  if (new Set(concepts).size < concepts.length) out.push('sameConcept');
  return out;
}

/** Marks at risk in criterion D from reusing a key concept: 3 if one is used twice, 6 if one is used three times. */
export function conceptMarksAtRisk(concepts: readonly Concept[]): number {
  const count = new Map<Concept, number>();
  for (const c of concepts) count.set(c, (count.get(c) ?? 0) + 1);
  let risk = 0;
  for (const n of count.values()) risk += 3 * (n - 1);
  return risk;
}

/** Strengths: Check it score as a percentage, or null when the student has not answered enough to say. */
export function checkScore(correct: number, total: number, minTotal = 3): number | null {
  if (total < minTotal) return null;
  return Math.round((correct / total) * 100);
}

// ---------------- Level 2: the article scout ----------------

export type Source = 'newspaper' | 'online' | 'journal' | 'tv' | 'radio';
export type LeaveReason = 'old' | 'broadcast' | 'noTheory' | 'teacher';
export const LEAVE_REASONS: LeaveReason[] = ['old', 'broadcast', 'noTheory', 'teacher'];

export interface ScoutArticle {
  source: Source;
  ageMonths: number;
  /** True when the teacher handed the article to the whole class. */
  fromTeacher?: boolean;
  /** The unit whose theory it uses, or null when there is no economic theory to apply. */
  unit: Unit | null;
}

/** Why an article cannot be used, or null when it is a good pick. The first rule broken wins. */
export function leaveReason(a: ScoutArticle): LeaveReason | null {
  if (a.source === 'tv' || a.source === 'radio') return 'broadcast';
  if (a.ageMonths > MAX_AGE_MONTHS) return 'old';
  if (a.fromTeacher) return 'teacher';
  if (a.unit === null || a.unit === 1) return 'noTheory';
  return null;
}

/** Level 1: right first time on the trail rules (of 5), plus a plan that meets the rules. */
export const RULES_GOAL = 4;
/** Level 2: articles per round, and first-try points (keep or leave, then unit or reason). */
export const SCOUT_DRAW = 10;
export const SCOUT_GOAL = 16;
/** Level 3: articles per round, and first-try points (diagram, then key concept link). */
export const LENS_DRAW = 6;
export const LENS_GOAL = 10;

export const trailWon = (rulesRight: number, plan: readonly PlanRow[]) => rulesRight >= RULES_GOAL && planProblems(plan).length === 0;
export const scoutWon = (points: number) => points >= SCOUT_GOAL;
export const lensWon = (points: number) => points >= LENS_GOAL;
