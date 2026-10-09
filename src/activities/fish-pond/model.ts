/**
 * Fish Pond (2.8): the rules behind the game, kept apart from the screen so they can be tested.
 *
 * The pond holds at most CAPACITY fish. Each season:
 *   1. every boat fishes (the catch can never be more than the fish in the pond),
 *   2. the fish that are left breed: new fish = GROWTH × left × (1 − left ÷ CAPACITY), rounded.
 *      Few fish make few babies, and a crowded pond has little room, so births are biggest at half full.
 *   3. if fewer than COLLAPSE fish are left after fishing, they cannot find each other to breed:
 *      the stock collapses and the pond is empty.
 */

export const CAPACITY = 100;
export const GROWTH = 0.5;
export const COLLAPSE = 10;
/** The healthy level: births are biggest here, so the pond can give the biggest catch that lasts. */
export const HEALTHY = 50;

/** Round half up, so the same numbers always give the same answer (2.5 becomes 3). */
export const roundHalfUp = (x: number) => Math.floor(x + 0.5);

/** New fish born when `left` fish are in the pond after fishing. */
export function births(left: number): number {
  if (left < COLLAPSE) return 0;
  return roundHalfUp(GROWTH * left * (1 - left / CAPACITY));
}

/** The stock next season, from the fish left after fishing. Never more than the pond can hold. */
export function nextStock(left: number): number {
  if (left < COLLAPSE) return 0;
  return Math.min(CAPACITY, left + births(left));
}

/**
 * Share out the catch. If the boats want more fish than the pond holds, each boat gets
 * its share of the fish, rounded down, so the total is never more than the stock.
 */
export function shareCatch(stock: number, wants: number[]): number[] {
  const total = wants.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= stock) return wants.map((w) => Math.max(0, w));
  return wants.map((w) => Math.floor((Math.max(0, w) * stock) / total));
}

export interface Season {
  start: number;
  catches: number[];
  caught: number;
  left: number;
  born: number;
  end: number;
  collapsed: boolean;
}

/** Play one season: fish, then breed. */
export function playSeason(stock: number, wants: number[]): Season {
  const catches = shareCatch(stock, wants);
  const caught = catches.reduce((s, c) => s + c, 0);
  const left = stock - caught;
  const collapsed = left < COLLAPSE;
  const born = births(left);
  return { start: stock, catches, caught, left, born, end: collapsed ? 0 : nextStock(left), collapsed };
}

/** The stock at the start and after each season, for a list of total catches. Stops at 0 after a collapse. */
export function stockPath(start: number, totals: number[]): number[] {
  const out = [start];
  let s = start;
  for (const c of totals) {
    const r = playSeason(s, [c]);
    out.push(r.end);
    if (r.collapsed) break;
    s = r.end;
  }
  return out;
}

/** Does the pond last every season with these total catches? */
export function survives(start: number, totals: number[]): boolean {
  const p = stockPath(start, totals);
  return p.length === totals.length + 1 && p[p.length - 1] > 0;
}

/** The biggest total catch that keeps the stock where it is (or higher) next season. */
export function sustainableCatch(stock: number): number {
  let best = 0;
  for (let c = 0; c <= stock; c++) if (playSeason(stock, [c]).end >= stock) best = c;
  return best;
}

// ---------------- Level 1: fish for 8 seasons ----------------

export const L1_START = 80;
export const L1_SEASONS = 8;
/** Each computer fisher takes this many fish every season, whatever happens to the pond. */
export const L1_GREEDY = 5;
export const L1_BOTS = 3;
/** The catches the student can choose from. */
export const L1_CHOICES = [1, 3, 5, 8];
/** Level 1 goal: the pond is alive after 8 seasons, and this many "why" answers right first time. */
export const L1_GOAL = 6;

/** The wants of all four boats: the student first, then the computer fishers. */
export const l1Wants = (mine: number) => [mine, ...Array.from({ length: L1_BOTS }, () => L1_GREEDY)];

/**
 * The safe catch: the biggest choice the student could take every season from now on
 * and still have fish in the pond at the end. Null if no choice saves it.
 */
export function safeCatch(stock: number, seasonsLeft: number, choices = L1_CHOICES, bots = L1_BOTS * L1_GREEDY): number | null {
  let best: number | null = null;
  for (const c of choices) if (survives(stock, Array.from({ length: seasonsLeft }, () => c + bots))) best = best === null ? c : Math.max(best, c);
  return best;
}

export const l1Won = (alive: boolean, firstRight: number) => alive && firstRight >= L1_GOAL;

/**
 * The options for "how many new fish are born?": the right answer and three common slips.
 * Slips: forgetting the crowding part (half of the fish left), using the stock before fishing,
 * and giving the new stock instead of the births. Always four different numbers.
 */
export function birthOptions(start: number, left: number): { value: number; slip: 'right' | 'noCrowding' | 'beforeFishing' | 'stock' | 'near' }[] {
  const right = births(left);
  const raw: { value: number; slip: 'right' | 'noCrowding' | 'beforeFishing' | 'stock' | 'near' }[] = [
    { value: right, slip: 'right' },
    { value: roundHalfUp(left * GROWTH), slip: 'noCrowding' },
    { value: births(start), slip: 'beforeFishing' },
    { value: nextStock(left), slip: 'stock' },
  ];
  const out: typeof raw = [];
  for (const o of raw) if (!out.some((x) => x.value === o.value)) out.push(o);
  for (let d = 2; out.length < 4; d += 2) {
    for (const v of [right + d, right - d]) if (v >= 0 && out.length < 4 && !out.some((x) => x.value === v)) out.push({ value: v, slip: 'near' });
  }
  return out;
}

// ---------------- Level 2: make the rules ----------------

export const L2_START = 50;
export const L2_SEASONS = 6;
/** With no rule, every boat takes as much as it can carry. */
export const L2_NO_RULE = 20;
export const L2_GOAL = 12;
export const POINTS_PER_RULE = 3;

export type Trend = 'grows' | 'same' | 'falls' | 'collapses';
export const TRENDS: Trend[] = ['grows', 'same', 'falls', 'collapses'];

/** How the stock changes over the test: collapses (empty), grows or falls by 5 or more, or stays about the same. */
export function trendOf(path: number[]): Trend {
  const end = path[path.length - 1];
  if (end === 0) return 'collapses';
  const d = end - path[0];
  if (d >= 5) return 'grows';
  if (d <= -5) return 'falls';
  return 'same';
}

/** What happens to a pond of L2_START fish when the total catch each season is `total`. */
export function ruleTrend(total: number, start = L2_START, seasons = L2_SEASONS): Trend {
  return trendOf(stockPath(start, Array.from({ length: seasons }, () => total)));
}

export const l2Won = (points: number) => points >= L2_GOAL;

// ---------------- Level 3: one fisher cheats ----------------

export const L3_START = 50;
export const L3_SEASONS = 10;
export const L3_GOAL = 5;
/** Extra fish the student takes when they choose "more than the limit". */
export const L3_EXTRA = 3;

/**
 * The agreed limit per boat in a season. The group agrees 3 each (12 in all, the most a pond of 50 can give).
 * From season 5 the group lowers it to 2 each, so the pond can grow back.
 */
export const l3Limit = (season: number) => (season >= 5 ? 2 : 3);

/** The cheater takes this many fish in seasons 2 and 3. Monitoring finds it, and from season 4 a fine stops it. */
export const CHEAT_CATCH = 8;
export const cheats = (season: number) => season === 2 || season === 3;

/** Wants of the three computer fishers in a season (the cheater last). */
export function l3BotWants(season: number): number[] {
  const lim = l3Limit(season);
  return [lim, lim, cheats(season) ? CHEAT_CATCH : lim];
}

/** The student's three choices in a season: less than the limit, the limit, more than the limit. */
export const l3Choices = (limit: number) => [limit - 1, limit, limit + L3_EXTRA];

/**
 * Is cheating worth it? The cheater gains `gain` fish. Monitoring catches a cheat with probability `chance`,
 * and then the fine is `fine` fish. Cheating pays when the expected fine (chance × fine) is less than the gain.
 */
export function cheatPays(gain: number, fine: number, chance: number): boolean {
  return chance * fine < gain;
}

/** The expected fine: chance of being caught × fine. */
export const expectedFine = (fine: number, chance: number) => chance * fine;

/** Level 3 goal: the pond ends at the healthy level or above, and enough answers right first time. */
export const l3Won = (endStock: number, firstRight: number) => endStock >= HEALTHY && firstRight >= L3_GOAL;
