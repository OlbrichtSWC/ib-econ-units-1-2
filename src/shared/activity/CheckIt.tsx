/**
 * Check it: one question at a time, with a hint ladder.
 *   Hint 1 nudges -> Hint 2 narrows -> Worked example -> Show the answer.
 * Wrong answers get feedback that explains the mistake, and the student can try again.
 * No timers. The score is only for the student's own self-rating.
 */
import { useState } from 'preact/hooks';
import { Md } from '../content/markdown';
import { CrossIcon, HlBadge, InfoIcon, LiveRegion, MarkIcon } from '../design/components';
import { celebrateAt } from '../fun/celebrate';
import { play } from '../fun/sound';
import type { Evidence } from './mastery';
import type { NumberQuestion, Question, TableData } from './types';

interface QState {
  attempts: number;
  hints: number; // 0..3 (3 = worked example shown)
  revealed: boolean;
  solved: boolean;
  feedback: { kind: 'ok' | 'try'; text: string } | null;
  choice: number | null;
  value: string;
}

const fresh = (): QState => ({ attempts: 0, hints: 0, revealed: false, solved: false, feedback: null, choice: null, value: '' });

export function DataTable({ table }: { table: TableData }) {
  return (
    <div class="table-scroll">
      <table class="table">
        {table.caption && <caption class="muted small" style={{ textAlign: 'left', paddingBottom: 4 }}>{table.caption}</caption>}
        <thead>
          <tr>{table.headers.map((h) => <th key={h} scope="col">{h}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Parses what a student typed: allows $, %, commas, spaces and a unicode minus. */
export function parseNumber(raw: string): number | null {
  const s = raw.replace(/[$,%\s]/g, '').replace('−', '-');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  return Number(s);
}

export function checkNumber(q: NumberQuestion, value: number): { ok: boolean; feedback: string } {
  const tol = q.tolerance ?? 0.01;
  if (Math.abs(value - q.answer) <= tol + 1e-9) return { ok: true, feedback: '' };
  const m = q.mistakes?.find((mm) => Math.abs(mm.value - value) <= tol + 1e-9);
  if (m) return { ok: false, feedback: m.feedback };
  if (Math.abs(Math.abs(value) - Math.abs(q.answer)) <= tol + 1e-9) {
    return { ok: false, feedback: 'The size is right but the sign is not. Think about which direction the change goes.' };
  }
  return { ok: false, feedback: 'Not yet. Check each step of your working, or take a hint.' };
}

/** One hint per question is allowed without losing a first-try answer's place in the First-Try Star. */
export const FREE_HINTS = 1;

/**
 * Evidence from one Check it attempt, plus whether it earns the First-Try Star:
 * every question right on the first try, using at most one hint on each.
 */
export function attemptEvidence(questions: Question[], states: { attempts: number; hints: number; revealed: boolean; solved: boolean }[]): Evidence & { sharp: boolean } {
  let correct = 0, hints = 0, applyCorrect = 0, applyTotal = 0, sharp = questions.length > 0;
  states.forEach((s, i) => {
    // Honest evidence: only answers right on the first try count. Retrying still helps learning.
    const ok = s.solved && !s.revealed && s.attempts === 1;
    if (ok) correct++;
    hints += Math.min(s.hints, 3);
    if (!ok || s.hints > FREE_HINTS) sharp = false;
    if (questions[i].level === 'apply') {
      applyTotal++;
      if (ok && s.hints <= FREE_HINTS) applyCorrect++;
    }
  });
  return { correct, total: questions.length, hints, applyCorrect, applyTotal, sharp };
}

export function CheckIt(props: { questions: Question[]; teacher: boolean; onFinish: (e: Evidence, sharp: boolean) => void; showHl: boolean }) {
  const questions = props.questions.filter((q) => props.showHl || !q.hl);
  const [index, setIndex] = useState(0);
  const [states, setStates] = useState<QState[]>(() => questions.map(fresh));
  const [finished, setFinished] = useState(false);
  const [announce, setAnnounce] = useState('');

  if (!questions.length) return <p>No questions yet.</p>;
  const q = questions[index];
  const st = states[index];
  const set = (patch: Partial<QState>) => setStates((all) => all.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const evidence = () => attemptEvidence(questions, states);

  const right = () => {
    play('correct');
    celebrateAt(document.getElementById('check-submit'), 'small');
  };

  const submit = () => {
    if (st.solved || st.revealed) return;
    if (q.type === 'choice') {
      if (st.choice === null) return;
      const opt = q.options[st.choice];
      if (opt.correct) {
        set({ solved: true, attempts: st.attempts + 1, feedback: { kind: 'ok', text: opt.feedback } });
        setAnnounce('Correct.');
        right();
      } else {
        set({ attempts: st.attempts + 1, feedback: { kind: 'try', text: opt.feedback } });
        setAnnounce('Not yet. ' + opt.feedback);
        play('wrong');
      }
    } else {
      const v = parseNumber(st.value);
      if (v === null) {
        set({ feedback: { kind: 'try', text: 'Type a number, for example 12.5 or -0.8.' } });
        return;
      }
      const r = checkNumber(q, v);
      if (r.ok) {
        set({ solved: true, attempts: st.attempts + 1, feedback: { kind: 'ok', text: '' } });
        setAnnounce('Correct.');
        right();
      } else {
        set({ attempts: st.attempts + 1, feedback: { kind: 'try', text: r.feedback } });
        setAnnounce('Not yet. ' + r.feedback);
        play('wrong');
      }
    }
  };

  const next = () => {
    if (index < questions.length - 1) {
      setIndex(index + 1);
      setAnnounce('');
    } else {
      setFinished(true);
      play('win');
      const { sharp, ...e } = evidence();
      props.onFinish(e, sharp);
    }
  };

  if (finished) {
    const e = evidence();
    return (
      <div class="stack">
        <div class="callout callout-ok">
          <h3>
            <MarkIcon /> Check it complete
          </h3>
          <p>
            You answered <strong>{e.correct} of {e.total}</strong> correctly on the first try. You used {e.hints} {e.hints === 1 ? 'hint' : 'hints'}.
            {e.applyTotal > 0 && (
              <>
                {' '}
                You solved {e.applyCorrect} of {e.applyTotal} "apply it" questions on the first try with no more than one hint.
              </>
            )}
          </p>
          <p>Mistakes are part of learning. Next, rate yourself in step 4.</p>
        </div>
        <button
          class="btn btn-secondary"
          onClick={() => {
            setStates(questions.map(fresh));
            setIndex(0);
            setFinished(false);
          }}
        >
          Try the questions again
        </button>
      </div>
    );
  }

  const done = st.solved || st.revealed;
  const correctText = q.type === 'choice' ? q.options.find((o) => o.correct)?.text ?? '' : `${q.prefix ?? ''}${q.answer}${q.suffix ? ' ' + q.suffix : ''}`;

  return (
    <div class="stack">
      <LiveRegion text={announce} />
      <div class="row" style={{ justifyContent: 'space-between' }}>
        <span class="muted">
          Question {index + 1} of {questions.length}
        </span>
        <span class="row" style={{ gap: 6 }}>
          {q.hl && <HlBadge />}
          {q.level === 'apply' && <span class="badge badge-code">Apply it</span>}
        </span>
      </div>
      <div class="qprompt">
        <Md text={q.prompt} />
      </div>
      {q.table && <DataTable table={q.table} />}

      {q.type === 'choice' ? (
        <fieldset class="options" disabled={done}>
          <legend class="sr-only">Choose one answer</legend>
          {q.options.map((o, i) => (
            <label key={i} class={`option ${st.choice === i ? 'chosen' : ''} ${done && o.correct ? 'right' : ''}`}>
              <input type="radio" name={`q-${q.id}`} checked={st.choice === i} onChange={() => set({ choice: i, feedback: null })} />
              <span>
                <Md text={o.text} inline />
                {(props.teacher || done) && o.correct && (
                  <span class="badge badge-done" style={{ marginLeft: 8 }}>
                    <MarkIcon size={14} /> Answer
                  </span>
                )}
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <div class="row">
          <label for={`n-${q.id}`} class="sr-only">
            Your answer
          </label>
          {q.prefix && <span aria-hidden="true">{q.prefix}</span>}
          <input
            id={`n-${q.id}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={st.value}
            disabled={done}
            style={{ width: 140 }}
            onInput={(e) => set({ value: (e.target as HTMLInputElement).value, feedback: null })}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          {q.suffix && <span>{q.suffix}</span>}
          {props.teacher && (
            <span class="badge badge-done">
              <MarkIcon size={14} /> Answer: {correctText}
            </span>
          )}
        </div>
      )}

      {st.feedback && (
        <div class={`callout ${st.feedback.kind === 'ok' ? 'callout-ok' : 'callout-try'}`} role="status">
          <p style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
            {st.feedback.kind === 'ok' ? <MarkIcon /> : <CrossIcon />}
            {st.feedback.kind === 'ok' ? 'Correct.' : 'Not yet.'}
          </p>
          {st.feedback.text && <Md text={st.feedback.text} />}
        </div>
      )}

      {st.revealed && (
        <div class="callout" role="status">
          <p>
            <strong>Answer:</strong> <Md text={correctText} inline />
          </p>
        </div>
      )}
      {done && (
        <div class="callout">
          <p>
            <strong>Why:</strong>
          </p>
          <Md text={q.explanation} />
        </div>
      )}

      {!done && st.hints > 0 && (
        <div class="hint-ladder stack">
          <div class="callout">
            <p><strong>Hint 1</strong></p>
            <Md text={q.hints[0]} />
          </div>
          {st.hints > 1 && (
            <div class="callout">
              <p><strong>Hint 2</strong></p>
              <Md text={q.hints[1]} />
            </div>
          )}
          {st.hints > 2 && (
            <div class="callout">
              <p><strong>Worked example</strong></p>
              <Md text={q.worked} />
            </div>
          )}
        </div>
      )}

      <div class="row">
        {!done && (
          <button id="check-submit" class="btn" onClick={submit} disabled={q.type === 'choice' ? st.choice === null : !st.value.trim()}>
            Check my answer
          </button>
        )}
        {!done && st.hints < 3 && (
          <button
            class="btn btn-secondary"
            aria-describedby={st.hints === 0 ? 'free-hint-note' : undefined}
            onClick={() => set({ hints: st.hints + 1 })}
          >
            <InfoIcon /> {st.hints === 0 ? 'Get a hint' : st.hints === 1 ? 'Get another hint' : 'Show a worked example'}
          </button>
        )}
        {!done && st.hints >= 3 && (
          <button class="btn btn-quiet" onClick={() => set({ revealed: true })}>
            Show the answer
          </button>
        )}
        {!done && st.hints === 0 && (
          <span id="free-hint-note" class="small muted">One hint still counts as a first try.</span>
        )}
        {done && (
          <button class="btn" onClick={next}>
            {index < questions.length - 1 ? 'Next question' : 'Finish'}
          </button>
        )}
      </div>
    </div>
  );
}
