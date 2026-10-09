/** Turning the sentences a student has built into one paragraph. */
import type { ExplainStep, ExplainTask } from './types';

/** One finished sentence: the lead plus the right ending. */
export function sentence(step: ExplainStep): string {
  const end = step.options[step.correct].text;
  return step.lead ? `${step.lead} ${end}` : end;
}

/** The paragraph so far: the first `done` sentences, then the student's own sentence. */
export function paragraph(task: ExplainTask, done: number, own = ''): string {
  const parts = task.steps.slice(0, done).map(sentence);
  if (own.trim()) parts.push(own.trim());
  return parts.join(' ');
}
