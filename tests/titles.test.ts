import { describe, expect, it } from 'vitest';
import { nextTitle, titleFor, TITLES, towardNext } from '../src/shared/fun/titles';

describe('Economist titles', () => {
  it('start at New Recruit and go up in order', () => {
    expect(titleFor(0).name).toBe('New Recruit');
    expect(titleFor(1).name).toBe('Apprentice Economist');
    expect(titleFor(4).name).toBe('Apprentice Economist');
    expect(titleFor(5).name).toBe('Junior Economist');
    expect(titleFor(90).name).toBe('Economics Legend');
    for (let i = 1; i < TITLES.length; i++) expect(TITLES[i].at).toBeGreaterThan(TITLES[i - 1].at);
  });

  it('point to the next title and how far along it is', () => {
    expect(nextTitle(5)?.name).toBe('Economist');
    expect(towardNext(10)).toBeCloseTo(0.5, 9);
    expect(nextTitle(80)).toBeNull();
    expect(towardNext(80)).toBe(1);
  });

  it('the top title can be reached with the stamps on offer (18 games, 5 stamps each)', () => {
    expect(TITLES[TITLES.length - 1].at).toBeLessThanOrEqual(18 * 5);
  });
});
