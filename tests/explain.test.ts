import { describe, expect, it } from 'vitest';
import { paragraph, sentence } from '../src/shared/activity/explain';
import type { ExplainTask } from '../src/shared/activity/types';

const files = import.meta.glob<{ explain: ExplainTask }>('../public/content/activities/*.json', { eager: true, import: 'default' });
const tasks = Object.entries(files).map(([path, c]) => ({ id: path.replace(/^.*\//, '').replace('.json', ''), task: c.explain }));

const allText = (t: ExplainTask) => [t.prompt, t.facts ?? '', t.own ?? '', ...t.steps.flatMap((s) => [s.lead, ...s.options.flatMap((o) => [o.text, o.why])])];

describe('Explain it in writing: build a paragraph by clicking', () => {
  it('every activity has a sentence builder', () => {
    expect(tasks.length).toBe(18);
    for (const { id, task } of tasks) {
      expect(task, id).toBeTruthy();
      expect(task.steps.length, id).toBeGreaterThanOrEqual(4);
      expect(task.steps.length, id).toBeLessThanOrEqual(7);
      expect(task.facts, id).toBeTruthy();
    }
  });

  it('every sentence has three different endings, one right, each with a reason', () => {
    for (const { id, task } of tasks) {
      for (const s of task.steps) {
        expect(s.options.length, `${id}: ${s.lead}`).toBe(3);
        expect(new Set(s.options.map((o) => o.text)).size, `${id}: ${s.lead}`).toBe(3);
        expect(s.correct, `${id}: ${s.lead}`).toBeGreaterThanOrEqual(0);
        expect(s.correct, `${id}: ${s.lead}`).toBeLessThan(3);
        for (const o of s.options) expect(o.why.trim().length, `${id}: ${o.text}`).toBeGreaterThan(10);
      }
    }
  });

  it('the right ending is not always in the same place', () => {
    for (const { id, task } of tasks) {
      expect(new Set(task.steps.map((s) => s.correct)).size, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('has no blanks to fill in and follows the house style', () => {
    for (const { id, task } of tasks) {
      for (const t of allText(task)) {
        expect(t, id).not.toMatch(/___/);
        expect(t, id).not.toMatch(/—/);
        expect(t, id).not.toMatch(/\b(genuinely|honestly|actually|tick|invented|fictional|fake)\b/i);
      }
    }
  });

  it('finished sentences end with a full stop and read as one paragraph', () => {
    for (const { id, task } of tasks) {
      for (const s of task.steps) expect(sentence(s), id).toMatch(/[.?!)]$/);
    }
    const t = tasks.find((x) => x.id === 'ppc-explorer')!.task;
    expect(paragraph(t, 2)).toBe(`${sentence(t.steps[0])} ${sentence(t.steps[1])}`);
    expect(paragraph(t, 0, '  My own idea.  ')).toBe('My own idea.');
  });
});
