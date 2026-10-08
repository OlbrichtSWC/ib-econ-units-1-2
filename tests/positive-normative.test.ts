import { describe, expect, it } from 'vitest';
import {
  bare, BELT_GOAL, beltWon, CENTURIES, isValueWord, KINDS, LAB_GOAL, labMax, labWon, nextMethodStep, tokenize, VALUE_GOAL, valueWon, valuesInText,
} from '../src/activities/positive-normative/model';
import content from '../public/content/activities/positive-normative.json';

const t = content.try;

describe('Fact Lab: value words', () => {
  it('ignores capitals and punctuation when matching a tapped word', () => {
    expect(bare('Should,')).toBe('should');
    expect(isValueWord('unfair.', ['unfair'])).toBe(true);
    expect(isValueWord('Fair', ['unfair'])).toBe(false);
  });
  it('a positive statement has no value word, so every word tap is wrong', () => {
    for (const w of tokenize('If income tax rises, households will have less money to spend.')) {
      expect(isValueWord(w, [])).toBe(false);
    }
  });
  it('every value word in the content appears in its statement', () => {
    for (const r of t.valueRounds) expect(valuesInText(r.text, r.values), r.id).toBe(true);
  });
  it('level 2 has both positive and normative statements', () => {
    expect(t.valueRounds.some((r) => r.values.length === 0)).toBe(true);
    expect(t.valueRounds.filter((r) => r.values.length > 0).length).toBeGreaterThan(t.valueRounds.length / 2);
  });
});

describe('Fact Lab: method order', () => {
  it('accepts only the next step', () => {
    expect(nextMethodStep(0, 0)).toBe(1);
    expect(nextMethodStep(2, 2)).toBe(3);
    expect(nextMethodStep(2, 4)).toBe(-1);
    expect(nextMethodStep(2, 1)).toBe(-1);
  });
  it('the method follows the IB order: hypothesis, model with ceteris paribus, evidence, refutation', () => {
    expect(t.methodSteps.map((s) => s.id)).toEqual(['observe', 'hypothesis', 'model', 'test', 'verdict']);
  });
});

describe('Fact Lab: goals', () => {
  it('level 1 and 2 count first-try answers', () => {
    expect(beltWon(BELT_GOAL)).toBe(true);
    expect(beltWon(BELT_GOAL - 1)).toBe(false);
    expect(valueWon(VALUE_GOAL)).toBe(true);
    expect(valueWon(VALUE_GOAL - 1)).toBe(false);
  });
  it('level 3 adds the points from all three stations', () => {
    const max = labMax(t.methodSteps.length, t.rewrites.length, t.ideas.length);
    expect(max).toBe(15);
    expect(labWon(LAB_GOAL)).toBe(true);
    expect(labWon(LAB_GOAL - 1)).toBe(false);
    expect(LAB_GOAL).toBeLessThanOrEqual(max);
    expect(LAB_GOAL).toBeGreaterThan(max / 2);
  });
  it('every goal can be reached with the content', () => {
    expect(t.statements.length).toBeGreaterThanOrEqual(BELT_GOAL);
    expect(BELT_GOAL).toBeGreaterThan(t.statements.length / 2);
    expect(t.valueRounds.length).toBeGreaterThanOrEqual(VALUE_GOAL);
  });
});

describe('Fact Lab: content', () => {
  it('statements are positive or normative, both kinds appear, and there are traps', () => {
    for (const s of t.statements) expect(KINDS).toContain(s.kind);
    expect(t.statements.filter((s) => s.kind === 'positive').length).toBeGreaterThanOrEqual(4);
    expect(t.statements.filter((s) => s.kind === 'normative').length).toBeGreaterThanOrEqual(4);
    expect(t.statements.filter((s) => s.trap && s.kind === 'positive').length).toBeGreaterThanOrEqual(1);
    expect(t.statements.filter((s) => s.trap && s.kind === 'normative').length).toBeGreaterThanOrEqual(1);
  });
  it('every rewrite has exactly one testable answer', () => {
    for (const r of t.rewrites) expect(r.options.filter((o) => 'correct' in o && o.correct).length, r.id).toBe(1);
  });
  it('the timeline uses every century from the IB guide, in a real century', () => {
    for (const i of t.ideas) expect(CENTURIES).toContain(i.century);
    for (const c of CENTURIES) expect(t.ideas.some((i) => i.century === c), c).toBe(true);
    expect(t.ideas.find((i) => i.id === 'smith')?.century).toBe('18');
    expect(t.ideas.find((i) => i.id === 'keynes')?.century).toBe('20');
    expect(t.ideas.find((i) => i.id === 'behaviour')?.century).toBe('21');
  });
  it('on-screen text follows the house style', () => {
    const text = JSON.stringify(content);
    expect(text).not.toMatch(/—|genuinely|honestly|actually|\btick\b|\bcards?\b/i);
  });
});
