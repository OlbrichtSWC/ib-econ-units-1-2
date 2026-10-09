/**
 * Build an explanation, one sentence at a time. Each sentence has a start and three possible
 * endings; the student clicks the right one. A wrong ending says why it is wrong. The finished
 * sentences join into a paragraph, so there are no blanks to fill in and the numbers needed are
 * shown in a facts box. The student can add one sentence in their own words at the end.
 * Progress is saved in this browser only, so it is still there next lesson. It is never sent
 * anywhere. The paragraph shows on the My progress page, which the student can print.
 * The box starts closed, so the game comes first; it opens by itself when work exists.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { Md } from '../content/markdown';
import { loadBuilt, loadWriting, MAX_WRITING, saveBuilt, saveWriting } from '../progress/writing';
import { paragraph, sentence } from './explain';
import type { ExplainTask } from './types';

function startState(activityId: string, n: number): { steps: number; own: string } {
  const b = loadBuilt(activityId);
  if (b) return { steps: Math.min(b.steps, n), own: b.own };
  // Writing saved before the sentence builder existed is kept as the student's own sentence.
  return { steps: 0, own: loadWriting(activityId) };
}

export function ExplainBox(props: { activityId: string; task: ExplainTask }) {
  const { task, activityId } = props;
  const n = task.steps.length;
  const [start] = useState(() => startState(activityId, n));
  const [startOpen] = useState(() => start.steps > 0 || start.own.trim() !== '');
  const [done, setDone] = useState(start.steps);
  const [own, setOwn] = useState(start.own);
  const [wrong, setWrong] = useState<number[]>([]);
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const stepHead = useRef<HTMLParagraphElement>(null);
  const moved = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef({ steps: done, own });

  const save = (steps: number, ownText: string) => {
    latest.current = { steps, own: ownText };
    saveBuilt(activityId, latest.current);
    saveWriting(activityId, paragraph(task, steps, ownText));
  };

  // Save straight away when the student leaves the step, so nothing typed is lost.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      save(latest.current.steps, latest.current.own);
    },
    [],
  );

  // After a right answer, move keyboard focus to the next sentence.
  useEffect(() => {
    if (moved.current) stepHead.current?.focus();
    moved.current = false;
  }, [done]);

  const pick = (i: number) => {
    const step = task.steps[done];
    setCopied(false);
    if (i === step.correct) {
      setSaid({ ok: true, text: step.options[i].why });
      setWrong([]);
      moved.current = true;
      setDone(done + 1);
      save(done + 1, own);
    } else {
      setSaid({ ok: false, text: step.options[i].why });
      setWrong([...wrong, i]);
    }
  };

  const typeOwn = (t: string) => {
    setOwn(t);
    latest.current = { steps: done, own: t };
    setCopied(false);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save(done, t), 600);
  };

  const restart = () => {
    setDone(0);
    setWrong([]);
    setSaid(null);
    setCopied(false);
    moved.current = true;
    save(0, own);
  };

  const text = paragraph(task, done, own);
  const step = done < n ? task.steps[done] : null;

  return (
    <details class="card explain" open={startOpen}>
      <summary>
        <h3 id="explain-h" style={{ display: 'inline' }}>When you finish: explain it in writing</h3>
      </summary>
      <div class="stack" style={{ marginTop: 12 }}>
        <div class="callout">
          <p style={{ margin: 0 }}>
            <strong>The question.</strong> <Md text={task.prompt} inline />
          </p>
        </div>
        <p class="small" style={{ margin: 0 }}>
          <strong>How to do it.</strong> You build the answer one sentence at a time. Read the facts. Then click the right ending for each sentence. Your sentences join into a paragraph.
        </p>
        {task.facts && (
          <div class="explain-facts">
            <p style={{ margin: '0 0 4px' }}>
              <strong>Facts to use</strong>
            </p>
            <Md text={task.facts} />
          </div>
        )}

        {said && (
          <p class={`small explain-said ${said.ok ? 'ok' : 'no'}`} role="status">
            <strong>{said.ok ? '✓ Right.' : '✗ Not quite.'}</strong> {said.text}
          </p>
        )}

        {step ? (
          <div class="explain-step" key={done}>
            <p class="explain-step-head" ref={stepHead} tabIndex={-1}>
              <strong>
                Sentence {done + 1} of {n}.
              </strong>{' '}
              {step.lead ? (
                <>
                  Pick the best ending: <em>{step.lead} …</em>
                </>
              ) : (
                'Pick the best sentence.'
              )}
            </p>
            <div class="stack" style={{ gap: 8 }}>
              {step.options.map((o, i) => (
                <button key={o.text} type="button" class="choice-btn" disabled={wrong.includes(i)} onClick={() => pick(i)}>
                  {step.lead && <span class="sr-only">{step.lead} </span>}
                  {o.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p class="explain-step-head" ref={stepHead} tabIndex={-1}>
            <strong>All {n} sentences done.</strong> Read your paragraph below. You can add a sentence in your own words.
          </p>
        )}

        {done > 0 && (
          <div class="explain-paragraph">
            <p style={{ margin: '0 0 4px' }}>
              <strong>{done < n ? 'Your paragraph so far' : 'Your paragraph'}</strong>
            </p>
            <ol class="explain-sentences">
              {task.steps.slice(0, done).map((s) => (
                <li key={s.lead + s.correct}>{sentence(s)}</li>
              ))}
            </ol>
          </div>
        )}

        {(done === n || own.trim() !== '') && (
          <div class="stack" style={{ gap: 6 }}>
            <label for="explain-own">
              <strong>Your own sentence (optional).</strong> {task.own ?? 'Add one more sentence in your own words.'}
            </label>
            <textarea
              id="explain-own"
              rows={3}
              maxLength={MAX_WRITING}
              style={{ width: '100%' }}
              value={own}
              onInput={(e) => typeOwn((e.target as HTMLTextAreaElement).value)}
            />
          </div>
        )}

        {done > 0 && (
          <div class="row">
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false));
              }}
            >
              Copy my paragraph
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onClick={restart}>
              Start again
            </button>
            <span class="small muted" role="status">
              {copied ? 'Copied.' : ''}
            </span>
          </div>
        )}
        <p class="small muted" style={{ margin: 0 }}>
          Your paragraph is saved in this browser only. It is never sent anywhere and is not part of your progress code. It shows on the My progress page, so you can print it or save it as a PDF.
        </p>
      </div>
    </details>
  );
}
