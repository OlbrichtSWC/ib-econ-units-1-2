import { describe, expect, it } from 'vitest';
import { pedAtPoint } from '../src/econ/calc';
import { challengesForMove, DEMAND, ibCheck, priceFromDrag, schedule, snapPrice, trCurve, unitaryCurve, zoneAt } from '../src/activities/ped-line/model';

describe('Same Slope, Different PED: bike rental model', () => {
  it('snaps prices to $0.50 and keeps them between $1 and $19', () => {
    expect(snapPrice(12.3)).toBe(12.5);
    expect(snapPrice(12.2)).toBe(12);
    expect(snapPrice(0)).toBe(1);
    expect(snapPrice(25)).toBe(19);
  });

  it('maps a dragged point to the nearest price on the line', () => {
    expect(priceFromDrag({ q: 100, p: 10 })).toBe(10); // on the line at the midpoint
    expect(priceFromDrag({ q: 60, p: 14 })).toBe(14); // on the line: 200 - 10 x 14 = 60
    // Off the line: (120, 14) -> u = 0.6, v = 0.7, t = (0.6 - 0.7 + 1)/2 = 0.45, price = 20 x 0.55 = 11
    expect(priceFromDrag({ q: 120, p: 14 })).toBe(11);
  });

  it('PED at a point uses slope x P/Q: same slope, different PED', () => {
    // dQ/dP = -10 everywhere. At P = 16, Q = 40: -10 x 16/40 = -4
    expect(pedAtPoint(DEMAND, 16)).toBeCloseTo(-4, 10);
    // At P = 10, Q = 100: -10 x 10/100 = -1
    expect(pedAtPoint(DEMAND, 10)).toBeCloseTo(-1, 10);
    // At P = 4, Q = 160: -10 x 4/160 = -0.25
    expect(pedAtPoint(DEMAND, 4)).toBeCloseTo(-0.25, 10);
  });

  it('finds the zone: upper half elastic, midpoint unitary, lower half inelastic', () => {
    expect(zoneAt(16)).toBe('elastic');
    expect(zoneAt(10.5)).toBe('elastic'); // -10 x 10.5/95 = -1.105
    expect(zoneAt(10)).toBe('unitary');
    expect(zoneAt(9.5)).toBe('inelastic'); // -10 x 9.5/105 = -0.905
    expect(zoneAt(2)).toBe('inelastic');
  });

  it('the TR curve rises to a peak of $1000 at Q = 100, then falls', () => {
    const pts = trCurve(DEMAND, 40);
    expect(pts[0]).toEqual({ q: 0, p: 0 });
    expect(pts[20].q).toBe(100);
    expect(pts[20].p).toBeCloseTo(1000, 10); // $10 x 100
    expect(pts[8].p).toBeCloseTo(640, 10); // Q = 40, P = $16: 16 x 40
    expect(pts[40].p).toBeCloseTo(0, 10); // Q = 200, P = $0
    expect(Math.max(...pts.map((p) => p.p))).toBeCloseTo(1000, 10);
  });

  it('the IB formula check for a $1 cut matches PED at the point', () => {
    const c = ibCheck(16);
    // P 16 -> 15: (15 - 16)/16 = -6.25%. Q 40 -> 50: (50 - 40)/40 = +25%. PED = 25 / -6.25 = -4
    expect(c.p2).toBe(15);
    expect(c.q1).toBeCloseTo(40, 10);
    expect(c.q2).toBeCloseTo(50, 10);
    expect(c.pctP).toBeCloseTo(-6.25, 10);
    expect(c.pctQ).toBeCloseTo(25, 10);
    expect(c.ped).toBeCloseTo(-4, 10);
    for (const p of [1, 1.5, 3, 7.5, 10, 13, 19]) expect(ibCheck(p).ped).toBeCloseTo(pedAtPoint(DEMAND, p), 10);
    // Below $2 a $1 rise is used: P 1.5 -> 2.5 (+66.67%), Q 185 -> 175 (-5.41%), PED = -0.0811
    expect(ibCheck(1.5).p2).toBe(2.5);
    expect(ibCheck(1.5).ped).toBeCloseTo(-0.0811, 4);
  });

  it('a unitary PED curve has the same spending P x Q at every point', () => {
    const pts = unitaryCurve(200, 10, 90, 8);
    expect(pts[0]).toEqual({ q: 10, p: 20 });
    expect(pts[1].q).toBe(20);
    expect(pts[1].p).toBe(10); // 200 / 20
    for (const pt of pts) expect(pt.q * pt.p).toBeCloseTo(200, 10);
  });

  it('the schedule lists P, Q and TR every $2', () => {
    const s = schedule();
    expect(s).toHaveLength(9);
    expect(s[0]).toEqual({ p: 18, q: 20, tr: 360 });
    expect(s[4]).toEqual({ p: 10, q: 100, tr: 1000 });
    expect(s[8]).toEqual({ p: 2, q: 180, tr: 360 });
  });

  it('checks the discovery challenges', () => {
    // 16 -> 15: TR 16 x 40 = 640 -> 15 x 50 = 750, a price cut raises TR (elastic)
    expect(challengesForMove(16, 15, true, false)).toEqual(['cut-raises']);
    // 6 -> 5: TR 6 x 140 = 840 -> 5 x 150 = 750, a price cut lowers TR (inelastic)
    expect(challengesForMove(6, 5, false, true)).toEqual(['cut-lowers']);
    // 10.5 -> 10: TR 10.5 x 95 = 997.5 -> 1000
    expect(challengesForMove(10.5, 10, true, false)).toEqual(['cut-raises', 'unitary']);
    // Reaching the midpoint after seeing both halves also finds the TR maximum
    expect(challengesForMove(9.5, 10, true, true)).toEqual(['unitary', 'tr-max']);
    // 12 -> 8: TR 12 x 80 = 960 -> 8 x 120 = 960, no change, so neither price-cut challenge
    expect(challengesForMove(12, 8, true, true)).toEqual([]);
    // A price rise never counts as a price cut
    expect(challengesForMove(5, 6, false, true)).toEqual([]);
  });
});
