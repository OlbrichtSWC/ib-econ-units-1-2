/**
 * Money River (1.1): the circular flow of income model, kept apart from the screen so it can be tested.
 *
 * Level 1: the two-sector flow between households and firms (two real flows, two money flows).
 * Level 2: leakages (savings, taxes, imports) drain out; injections (investment, government spending, exports) flow in.
 * Level 3: compare total leakages and injections to predict whether national income rises, falls or stays the same.
 */

/** The four flows of the two-sector model. */
export type Flow = 'factors' | 'incomes' | 'spending' | 'goods';
export const FLOWS: Flow[] = ['factors', 'incomes', 'spending', 'goods'];

/** Money flows go one way; real flows (resources, goods and services) go the other way. */
export const MONEY_FLOWS: Flow[] = ['incomes', 'spending'];
export const isMoney = (f: Flow) => MONEY_FLOWS.includes(f);

/** Who each flow goes from and to. */
export const FLOW_DIRECTION: Record<Flow, { from: 'households' | 'firms'; to: 'households' | 'firms' }> = {
  factors: { from: 'households', to: 'firms' },
  incomes: { from: 'firms', to: 'households' },
  spending: { from: 'households', to: 'firms' },
  goods: { from: 'firms', to: 'households' },
};

export type Withdrawal = 'savings' | 'taxes' | 'imports';
export type Injection = 'investment' | 'government' | 'exports';
export type Pipe = Withdrawal | Injection;
export const LEAKAGES: Withdrawal[] = ['savings', 'taxes', 'imports'];
export const INJECTIONS: Injection[] = ['investment', 'government', 'exports'];
export const PIPES: Pipe[] = [...LEAKAGES, ...INJECTIONS];

export type Sector = 'banks' | 'government' | 'foreign';
export const SECTORS: Sector[] = ['banks', 'government', 'foreign'];

/** Each leakage and injection belongs to one sector: savings and investment pass through the banks and financial sector, and so on. */
export const PIPE_SECTOR: Record<Pipe, Sector> = {
  savings: 'banks',
  investment: 'banks',
  taxes: 'government',
  government: 'government',
  imports: 'foreign',
  exports: 'foreign',
};

export const isLeakage = (p: Pipe): p is Withdrawal => (LEAKAGES as Pipe[]).includes(p);

export type Change = 'rise' | 'fall' | 'same';

export interface Totals {
  savings: number;
  taxes: number;
  imports: number;
  investment: number;
  government: number;
  exports: number;
}

export const totalLeakages = (t: Totals) => t.savings + t.taxes + t.imports;
export const totalInjections = (t: Totals) => t.investment + t.government + t.exports;

/**
 * National income rises when injections are greater than leakages, falls when they are smaller,
 * and stays the same when they are equal (equilibrium).
 */
export function incomeChange(t: Totals): Change {
  const d = totalInjections(t) - totalLeakages(t);
  if (Math.abs(d) < 1e-9) return 'same';
  return d > 0 ? 'rise' : 'fall';
}

/** Apply a change to one leakage or injection (for "what if" rounds). */
export function applyChange(t: Totals, pipe: Pipe, by: number): Totals {
  return { ...t, [pipe]: t[pipe] + by };
}

/** Level goals. */
export const BUILD_MISTAKES_ALLOWED = 2;
export const SPOT_GOAL = 4;
export const PIPE_MISTAKES_ALLOWED = 2;
export const LEAK_SPOT_GOAL = 5;
export const FORECAST_GOAL = 5;

export function buildWon(mistakes: number, spotRight: number, allowed = BUILD_MISTAKES_ALLOWED, goal = SPOT_GOAL): boolean {
  return mistakes <= allowed && spotRight >= goal;
}
