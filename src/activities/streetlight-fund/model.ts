/**
 * Streetlight Fund (2.9): the rules behind the game, kept apart from the screen so they can be tested.
 *
 * Level 1 sorts goods by two questions: is it rivalrous, and is it excludable?
 * Level 2 is a contribution game on one street: five households (the student and four computer
 * neighbours) each have $10 a week. Every $5 in the fund lights one lamp. The light reaches every
 * house, paid or not. The neighbours free ride more each week, by fixed rules.
 * Level 3 sets a tax per household: total cost / households.
 */

// ---------------- Level 1: the four kinds of good ----------------

export type Kind = 'private' | 'club' | 'common' | 'public';
export const KINDS: Kind[] = ['private', 'club', 'common', 'public'];

/** The kind of good from its two features. */
export function kindOf(rival: boolean, excludable: boolean): Kind {
  if (rival) return excludable ? 'private' : 'common';
  return excludable ? 'club' : 'public';
}

/** The two features of each kind (the reverse of kindOf). */
export function featuresOf(kind: Kind): { rival: boolean; excludable: boolean } {
  return {
    private: { rival: true, excludable: true },
    club: { rival: false, excludable: true },
    common: { rival: true, excludable: false },
    public: { rival: false, excludable: false },
  }[kind];
}

/** Which feature a wrong choice got wrong, for feedback. */
export function sortSlip(answer: Kind, picked: Kind): { rival: boolean; excludable: boolean } {
  const a = featuresOf(answer), p = featuresOf(picked);
  return { rival: a.rival !== p.rival, excludable: a.excludable !== p.excludable };
}

/** Level 1: goods sorted right first time. */
export const SORT_GOAL = 8;
export const sortWon = (firstRight: number, goal = SORT_GOAL) => firstRight >= goal;

// ---------------- Level 2: the contribution game ----------------

/** Money each household has each week. */
export const ENDOWMENT = 10;
/** Lamps on the street. */
export const LAMPS = 6;
/** Cost of running one lamp for a week. */
export const LAMP_COST = 5;
/** What the whole street needs each week to light every lamp. */
export const TARGET = LAMPS * LAMP_COST;
/** Households on the street: the student and four neighbours. */
export const HOUSEHOLDS = 5;
/** What one lit lamp is worth to each household each week. */
export const BENEFIT_PER_LAMP = 2;
/** The amounts the student can give. */
export const GIFTS = [0, 2, 4, 6, 8, 10];
/** Weeks with voluntary giving, then one week where the council taxes everyone. */
export const VOLUNTARY_WEEKS = 5;
export const WEEKS = VOLUNTARY_WEEKS + 1;

export interface Neighbour {
  id: string;
  name: string;
  /** What they give in week 1. */
  start: number;
  /** How much less they give each week after that. */
  drop: number;
}

/** The computer neighbours. Dev always free rides; the others give less each week. */
export const NEIGHBOURS: Neighbour[] = [
  { id: 'ama', name: 'Ama', start: 8, drop: 1 },
  { id: 'ben', name: 'Ben', start: 6, drop: 2 },
  { id: 'chen', name: 'Chen', start: 4, drop: 2 },
  { id: 'dev', name: 'Dev', start: 0, drop: 0 },
];

/** A neighbour's gift in a voluntary week (week 1 is the first). Never below zero. */
export function neighbourGift(n: Neighbour, week: number): number {
  return Math.max(0, n.start - n.drop * (week - 1));
}

/** Everything the neighbours give in a voluntary week. */
export function neighboursTotal(week: number): number {
  return NEIGHBOURS.reduce((s, n) => s + neighbourGift(n, week), 0);
}

/** Tax per household: total cost shared equally. */
export function taxPerHousehold(totalCost: number, households: number): number {
  return totalCost / households;
}

/** The council's tax in the last week: the full cost of the lights shared by every household. */
export const COUNCIL_TAX = taxPerHousehold(TARGET, HOUSEHOLDS);

/** Lamps the fund can light: one per $5, up to the number of lamps. */
export function lampsLit(total: number): number {
  return Math.max(0, Math.min(LAMPS, Math.floor(total / LAMP_COST + 1e-9)));
}

/** A household's week: the money it kept plus the value of the light it got. Paid or not, the light is the same. */
export function payoff(gift: number, lamps: number): number {
  return ENDOWMENT - gift + BENEFIT_PER_LAMP * lamps;
}

/** The benefit of one lamp to the whole street, and the cost of it. A lamp is worth it to society when benefit > cost. */
export const STREET_BENEFIT_PER_LAMP = BENEFIT_PER_LAMP * HOUSEHOLDS;

export interface WeekResult {
  week: number;
  taxed: boolean;
  gifts: { id: string; name: string; gift: number; payoff: number }[];
  total: number;
  lamps: number;
}

/** One week of the game. In the tax week every household pays the council tax. */
export function playWeek(week: number, studentGift: number): WeekResult {
  const taxed = week > VOLUNTARY_WEEKS;
  const raw = [
    { id: 'you', name: 'You', gift: taxed ? COUNCIL_TAX : studentGift },
    ...NEIGHBOURS.map((n) => ({ id: n.id, name: n.name, gift: taxed ? COUNCIL_TAX : neighbourGift(n, week) })),
  ];
  const total = raw.reduce((s, g) => s + g.gift, 0);
  const lamps = lampsLit(total);
  return { week, taxed, total, lamps, gifts: raw.map((g) => ({ ...g, payoff: payoff(g.gift, lamps) })) };
}

/** Can giving voluntarily ever light the whole street, even when the student gives everything? */
export function fullyLitPossible(week: number): boolean {
  return neighboursTotal(week) + ENDOWMENT >= TARGET;
}

/** Level 2: round questions right first time. */
export const FUND_GOAL = 5;
export const fundWon = (firstRight: number) => firstRight >= FUND_GOAL;

// ---------------- Level 3: the council ----------------

export type Way = 'direct' | 'contract';
export const WAYS: Way[] = ['direct', 'contract'];

/** The total cost of a project: items x cost of each. */
export function totalCost(items: number, costEach: number): number {
  return items * costEach;
}

/** The tax each household pays: (items x cost of each) / households. */
export function councilTax(items: number, costEach: number, households: number): number {
  return taxPerHousehold(totalCost(items, costEach), households);
}

export type TaxSlip = 'total' | 'noMultiply' | 'byItems' | 'times';

/** Common slips in the tax calculation, used for feedback. A slip that gives the right answer is left out. */
export function taxMistakes(items: number, costEach: number, households: number): { kind: TaxSlip; value: number }[] {
  const total = totalCost(items, costEach);
  const out = [
    { kind: 'total' as const, value: total },
    { kind: 'noMultiply' as const, value: costEach / households },
    { kind: 'byItems' as const, value: total / items },
    { kind: 'times' as const, value: total * households },
  ];
  const right = councilTax(items, costEach, households);
  return out.filter((x, i) => Math.abs(x.value - right) > 1e-6 && out.findIndex((y) => Math.abs(y.value - x.value) < 1e-6) === i);
}

/** Check a typed number, allowing a small rounding slip. */
export function numberRight(typed: number, answer: number, tol = 0.01): boolean {
  return Number.isFinite(typed) && Math.abs(typed - answer) <= tol + 1e-9;
}

/** Read a typed number: accepts "30", "$30", "30.00" and "1,200". NaN if it is not a number. */
export function parseNumber(text: string): number {
  const t = text.replace(/[$,\s]/g, '');
  if (!/^-?\d*\.?\d+$/.test(t)) return NaN;
  return Number(t);
}

/** Level 3: first-try points (way, tax, judgement in each case). */
export const POINTS_PER_CASE = 3;
export const COUNCIL_GOAL = 10;
export const councilWon = (points: number) => points >= COUNCIL_GOAL;

/** Lamps to show lit for progress through a level: share of the work done, on the six lamps. */
export function progressLamps(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(LAMPS, Math.round((done / total) * LAMPS)));
}
