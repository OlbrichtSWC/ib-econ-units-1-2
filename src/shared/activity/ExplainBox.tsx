/**
 * A short written task with sentence frames (EAL support) and a model-answer checklist.
 * The draft is saved in this browser only, so it is still there next lesson. It is never sent
 * anywhere. It shows on the My progress page, which the student can print or save as a PDF.
 * The box starts closed, so the game comes first; it opens by itself when a draft exists.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { Md } from '../content/markdown';
import { loadWriting, MAX_WRITING, saveWriting } from '../progress/writing';

export function ExplainBox(props: { activityId: string; prompt: string; frames: string[]; checklist?: string[] }) {
  const [text, setText] = useState(() => loadWriting(props.activityId));
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [startOpen] = useState(() => loadWriting(props.activityId).trim() !== '');
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(text);

  // Save straight away when the student leaves the step, so nothing typed is lost.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      saveWriting(props.activityId, latest.current);
    },
    [],
  );

  const update = (t: string) => {
    setText(t);
    latest.current = t;
    setSaved(false);
    setCopied(false);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveWriting(props.activityId, t);
      setSaved(true);
    }, 600);
  };

  const list = props.checklist ?? [];
  const done = checked.filter(Boolean).length;

  return (
    <details class="card explain" open={startOpen}>
      <summary>
        <h3 id="explain-h" style={{ display: 'inline' }}>When you finish: explain it in writing</h3>
      </summary>
      <div class="stack" style={{ marginTop: 12 }}>
        <Md text={props.prompt} />
        <div>
          <p class="small">
            <strong>Sentence frames.</strong> Tap one to add it, then fill in the blanks.
          </p>
          <div class="row" style={{ gap: 8 }}>
            {props.frames.map((f) => (
              <button key={f} type="button" class="btn btn-secondary btn-sm frame-btn" onClick={() => update((text ? text.trimEnd() + ' ' : '') + f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <label for="explain-box" class="sr-only">
          Your explanation
        </label>
        <textarea
          id="explain-box"
          rows={6}
          maxLength={MAX_WRITING}
          style={{ width: '100%' }}
          value={text}
          onInput={(e) => update((e.target as HTMLTextAreaElement).value)}
        />
        <div class="row">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            disabled={!text}
            onClick={() => {
              navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false));
            }}
          >
            Copy my answer
          </button>
          <span class="small muted" role="status">
            {copied ? 'Copied.' : saved && text.trim() ? 'Saved on this device.' : ''}
          </span>
        </div>
        {list.length > 0 && (
          <fieldset class="checklist">
            <legend><strong>Check your answer.</strong> Does it do all of these?</legend>
            {list.map((item, i) => (
              <label key={item} class="check-row">
                <input
                  type="checkbox"
                  checked={!!checked[i]}
                  onChange={(e) => {
                    const n = [...checked];
                    n[i] = (e.target as HTMLInputElement).checked;
                    setChecked(n);
                  }}
                />
                <span>{item}</span>
              </label>
            ))}
            <p class="small muted" style={{ margin: 0 }} aria-live="polite">
              {done === list.length ? 'All done. A strong answer does all of these.' : `${done} of ${list.length} done.`}
            </p>
          </fieldset>
        )}
        <p class="small muted">
          Your writing is saved in this browser only. It is never sent anywhere and is not part of your progress code. It shows on the My progress page, so you can print it or save it as a PDF.
        </p>
      </div>
    </details>
  );
}
