import { describe, expect, it } from 'vitest';
import { checkLabels } from '../src/shared/activity/CheckIt';
import type { ActivityContent, LabelQuestion } from '../src/shared/activity/types';

const files = import.meta.glob('../public/content/activities/*.json', { eager: true, import: 'default' });
const all = Object.values(files) as unknown as ActivityContent[];

describe('Check it: diagram questions in the content files', () => {
  it('every built activity has at least one label-the-diagram question', () => {
    for (const c of all) expect(c.check.some((q) => q.type === 'label'), c.id).toBe(true);
  });

  it('each label question is well formed: a tag for every slot, every answer is a choice, no duplicate choices', () => {
    for (const c of all) {
      for (const q of c.check.filter((x): x is LabelQuestion => x.type === 'label')) {
        const letters = q.slots.map((s) => s.letter);
        expect((q.diagram.tags ?? []).map((t) => t.letter).sort(), `${c.id} ${q.id}`).toEqual([...letters].sort());
        for (const s of q.slots) expect(q.choices, `${c.id} ${q.id} ${s.letter}`).toContain(s.answer);
        expect(new Set(q.choices).size).toBe(q.choices.length);
        // At least one label that does not fit, so the last slot is not a free answer.
        expect(q.choices.length).toBeGreaterThan(q.slots.length);
        // Different slots need different labels.
        expect(new Set(q.slots.map((s) => s.answer)).size).toBe(q.slots.length);
      }
    }
  });

  it('diagram descriptions never name the answers for label questions', () => {
    for (const c of all) {
      for (const q of c.check.filter((x): x is LabelQuestion => x.type === 'label')) {
        for (const s of q.slots) expect(q.diagram.description.toLowerCase(), `${c.id} ${q.id}`).not.toContain(s.answer.toLowerCase());
      }
    }
  });
});

describe('Check it: marking a label question', () => {
  const q = {
    slots: [
      { letter: 'A', answer: 'Consumer surplus', feedback: 'fa' },
      { letter: 'B', answer: 'Producer surplus', feedback: 'fb' },
    ],
  } as LabelQuestion;

  it('is right only when every letter is right', () => {
    expect(checkLabels(q, { A: 'Consumer surplus', B: 'Producer surplus' })).toEqual({ ok: true, wrong: [] });
    expect(checkLabels(q, { A: 'Producer surplus', B: 'Producer surplus' })).toEqual({ ok: false, wrong: [{ letter: 'A', feedback: 'fa' }] });
    expect(checkLabels(q, {}).wrong).toHaveLength(2);
  });
});
