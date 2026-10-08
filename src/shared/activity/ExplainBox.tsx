/**
 * A short written task with sentence frames (EAL support).
 * What the student types is never saved or sent anywhere.
 */
import { useState } from 'preact/hooks';
import { Md } from '../content/markdown';

export function ExplainBox({ prompt, frames }: { prompt: string; frames: string[] }) {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  return (
    <section class="card stack" aria-labelledby="explain-h">
      <h3 id="explain-h">Explain it in writing</h3>
      <Md text={prompt} />
      <div>
        <p class="small">
          <strong>Sentence frames.</strong> Tap one to add it, then fill in the blanks.
        </p>
        <div class="row" style={{ gap: 8 }}>
          {frames.map((f) => (
            <button key={f} type="button" class="btn btn-secondary btn-sm frame-btn" onClick={() => setText((t) => (t ? t.trimEnd() + ' ' : '') + f)}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <label for="explain-box" class="sr-only">
        Your explanation
      </label>
      <textarea id="explain-box" rows={5} style={{ width: '100%' }} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
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
        {copied && <span role="status">Copied.</span>}
      </div>
      <p class="small muted">This box is not saved or sent anywhere. Copy your answer if you want to keep it.</p>
    </section>
  );
}
