import { describe, expect, it } from 'vitest';
import { display, evaluate } from '../src/shared/calculator/engine';

const val = (s: string) => {
  const r = evaluate(s);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe('Calculator: working out', () => {
  it('follows the order of operations', () => {
    expect(val('2 + 3 × 4')).toBe(14);
    expect(val('(2 + 3) × 4')).toBe(20);
    expect(val('10 − 4 − 3')).toBe(3);
    expect(val('100 ÷ 10 ÷ 2')).toBe(5);
  });
  it('works out a percentage change and a PED the IB way', () => {
    // Price rises from $4 to $5 (25%), quantity falls from 200 to 150 (−25%): PED = −1.
    expect(val('(5 − 4) ÷ 4 × 100')).toBe(25);
    expect(val('(150 − 200) ÷ 200 × 100')).toBe(-25);
    expect(val('-25 ÷ 25')).toBe(-1);
  });
  it('handles decimals, negative numbers, brackets and per cent', () => {
    expect(val('0.5 × 0.4')).toBeCloseTo(0.2);
    expect(val('-(3 − 5)')).toBe(2);
    expect(val('--2')).toBe(2);
    expect(val('50%')).toBe(0.5);
    expect(val('200 × 15%')).toBe(30);
    expect(val('1,200 ÷ 4')).toBe(300);
  });
  it('total revenue and spending on a price floor', () => {
    expect(val('3.5 × 150')).toBe(525);
    expect(val('6 × (80 − 50)')).toBe(180);
  });
  it('explains mistakes instead of crashing', () => {
    for (const bad of ['', '5 ÷ 0', '(2 + 3', '2 + 3)', '2 +', '1.2.3', 'abc', '×5']) {
      const r = evaluate(bad);
      expect(r.ok, bad).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(5);
    }
  });
  it('shows answers without floating point noise', () => {
    expect(display(0.1 + 0.2)).toBe('0.3');
    expect(display(-0)).toBe('0');
    expect(display(2 / 3)).toBe('0.666667');
    expect(display(1500)).toBe('1500');
  });
});
