import { useEffect, useRef, useState } from 'preact/hooks';
import { ConfirmDialog, Dialog, MarkIcon } from '../shared/design/components';
import { conflicts, mergeProgress, MergeChoice } from '../shared/progress/merge';
import { qrSvg } from '../shared/progress/qr';
import { downloadCanvas, drawSummary } from '../shared/progress/summary';
import { Progress, ProgressStore, STEP } from '../shared/progress/types';
import { ACTIVITIES } from './registry';
import { stampsFor } from '../shared/fun/stampDefs';
import type { Settings } from './settings';
import { allWriting, clearWriting } from '../shared/progress/writing';

const ERRORS = {
  empty: 'Type or paste your progress code first.',
  typo: 'That code does not look right. Check each character and try again. Codes use only numbers and capital letters.',
  'newer-version': 'This code was made by a newer version of the app. Refresh this page to get the latest version, then try again.',
};

export function ProgressPage(props: { store: ProgressStore; progress: Progress; settings: Settings; initialCode: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState(props.initialCode);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Progress | null>(null);
  const [loaded, setLoaded] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelNames = props.settings.scale.levels.map((l) => l.name);
  const built = ACTIVITIES.filter((a) => a.load);
  const writing = allWriting(built.map((a) => a.id));
  const hasProgress = Object.keys(props.progress.activities).length > 0 || writing.length > 0;

  useEffect(() => {
    if (props.initialCode) tryLoad(props.initialCode);
  }, []);

  function tryLoad(text: string) {
    setError('');
    setLoaded('');
    const r = props.store.importCode(text);
    if (!r.ok) {
      setError(ERRORS[r.reason]);
      return;
    }
    setPending(r.progress);
  }

  function apply(choice: MergeChoice) {
    if (!pending) return;
    props.store.save(mergeProgress(props.store.load(), pending, choice));
    setPending(null);
    setInput('');
    setCode(null);
    setLoaded(choice === 'replace' ? 'Done. This device now has the progress from your code.' : 'Done. For each activity, the newer progress was kept.');
    if (location.hash.includes('/load/')) history.replaceState(null, '', '#/progress');
  }

  const pendingConflicts = pending ? conflicts(props.progress, pending) : [];
  const shareUrl = code ? `${location.origin}${location.pathname}#/progress/load/${code}` : '';

  return (
    <div class="stack">
      <h1>My progress</h1>
      <p>Your progress is saved in this browser only. Nothing about you is sent anywhere. Use a progress code to move it to another device.</p>

      <section class="card stack" aria-labelledby="h-summary">
        <h2 id="h-summary">Where you are</h2>
        <div class="table-scroll">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">Activity</th>
                <th scope="col">Steps done</th>
                <th scope="col">Check it</th>
                <th scope="col">Self-rating</th>
              </tr>
            </thead>
            <tbody>
              {built.map((a) => {
                const p = props.progress.activities[a.id];
                const steps = [STEP.learn, STEP.try, STEP.check, STEP.rated].filter((f) => p && p.steps & f).length;
                return (
                  <tr key={a.id}>
                    <td>
                      <a href={`#/a/${a.id}/learn`}>{a.title}</a>
                      <div class="small muted">{a.tag}</div>
                    </td>
                    <td>{steps} of 4</td>
                    <td>{p && p.total ? `${p.correct} of ${p.total}` : 'Not yet'}</td>
                    <td>{p && p.rating ? levelNames[p.rating - 1] : 'Not rated'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section class="card stack" aria-labelledby="h-get">
        <h2 id="h-get">Get my progress code</h2>
        <p>Your code holds only which activities you finished, your scores and your self-ratings. No name, no written answers.</p>
        <div>
          <button class="btn" onClick={() => { setCode(props.store.exportCode()); setCopied(false); }}>
            Get my progress code
          </button>
        </div>
        {code && (
          <div class="code-box stack">
            <p class="progress-code" aria-label={`Your progress code: ${code.split('').join(' ')}`}>{code}</p>
            <div class="row">
              <button
                class="btn btn-secondary"
                onClick={() => navigator.clipboard?.writeText(code).then(() => setCopied(true), () => setCopied(false))}
              >
                Copy code
              </button>
              {copied && (
                <span role="status">
                  <MarkIcon /> Copied
                </span>
              )}
            </div>
            <div class="qr" role="img" aria-label="QR code that opens this app with your progress code" dangerouslySetInnerHTML={{ __html: qrSvg(shareUrl) }} />
            <p class="small muted">Scan the QR code with another device's camera to open the app with your code filled in.</p>
            <div class="callout callout-try">
              <p>
                <strong>Save your code somewhere safe, like your notes app. Anyone with your code can load your progress.</strong>
              </p>
              <p class="small">Your code changes as you make progress. Get a new one each time you switch devices.</p>
            </div>
          </div>
        )}
      </section>

      <section class="card stack" aria-labelledby="h-enter">
        <h2 id="h-enter">Enter my progress code</h2>
        <form
          class="row"
          onSubmit={(e) => {
            e.preventDefault();
            tryLoad(input);
          }}
        >
          <label for="code-in" class="sr-only">
            Progress code
          </label>
          <input
            id="code-in"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellcheck={false}
            placeholder="ABCD-1234-..."
            value={input}
            style={{ flex: '1 1 260px', fontFamily: 'monospace', letterSpacing: '0.06em' }}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          />
          <button class="btn" type="submit">
            Load my progress
          </button>
        </form>
        {error && (
          <div class="callout callout-try" role="alert">
            {error}
          </div>
        )}
        {loaded && (
          <div class="callout callout-ok" role="status">
            <MarkIcon /> {loaded}
          </div>
        )}
      </section>

      <section class="card stack" aria-labelledby="h-writing">
        <h2 id="h-writing">My writing</h2>
        {writing.length === 0 ? (
          <p class="muted">No writing yet. At the end of each Try it step, open "When you finish: explain it in writing".</p>
        ) : (
          <>
            <p class="small muted">Saved in this browser only. It is not part of your progress code. Print this page or save it as a PDF to keep it.</p>
            {writing.map((w) => {
              const a = built.find((x) => x.id === w.id)!;
              return (
                <div key={w.id} class="writing-entry">
                  <h3 style={{ margin: 0 }}>{a.title}</h3>
                  <p class="writing-text">{w.text}</p>
                </div>
              );
            })}
          </>
        )}
      </section>

      <section class="card stack" aria-labelledby="h-sum">
        <h2 id="h-sum">Download my progress summary</h2>
        <p>Make a one-page image of your progress. You can choose to hand it in on your school's learning platform. The app does not send it anywhere.</p>
        <div class="row">
          <button
            class="btn"
            onClick={() => {
              const c = canvasRef.current!;
              drawSummary(c, {
                appTitle: 'IB Economics: Units 1 and 2',
                levelNames,
                rows: built.map((a) => ({ tag: a.tag, title: a.title, progress: props.progress.activities[a.id], stampTotal: stampsFor(a).length })),
                code: props.store.exportCode(),
              });
              downloadCanvas(c, `ib-econ-progress-${new Date().toISOString().slice(0, 10)}.png`);
            }}
          >
            Download summary (image)
          </button>
          <button class="btn btn-secondary" onClick={() => window.print()}>
            Print or save as PDF
          </button>
        </div>
        <canvas ref={canvasRef} hidden />
      </section>

      <section class="card stack" aria-labelledby="h-reset">
        <h2 id="h-reset">Start over</h2>
        <p>This deletes all progress and writing saved in this browser. Get your progress code first if you might want it back.</p>
        <div>
          <button class="btn btn-danger" onClick={() => setConfirmReset(true)} disabled={!hasProgress}>
            Reset my progress
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Are you sure?"
        message={<p>All your progress and writing on this device will be deleted. This cannot be undone.</p>}
        confirmLabel="Yes, reset my progress"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          props.store.reset();
          clearWriting(built.map((a) => a.id));
          setConfirmReset(false);
          setCode(null);
        }}
      />

      <Dialog open={!!pending} onClose={() => setPending(null)} title="Load this progress?">
        <div class="stack">
          {!hasProgress ? (
            <>
              <p>Your code is valid. Load it onto this device?</p>
              <div class="row" style={{ justifyContent: 'flex-end' }}>
                <button class="btn btn-secondary" onClick={() => setPending(null)}>Cancel</button>
                <button class="btn" onClick={() => apply('replace')}>Load progress</button>
              </div>
            </>
          ) : (
            <>
              <p>
                This device already has progress.
                {pendingConflicts.length > 0
                  ? ` ${pendingConflicts.length} ${pendingConflicts.length === 1 ? 'activity is' : 'activities are'} different on this device and in your code.`
                  : ' Your code adds to it without any differences.'}
              </p>
              <p>What would you like to do?</p>
              <div class="stack">
                <button class="btn" onClick={() => apply('keep-newer')}>
                  Keep the newer progress for each activity
                </button>
                <button class="btn btn-secondary" onClick={() => apply('replace')}>
                  Replace everything with the code
                </button>
                <button class="btn btn-quiet" onClick={() => setPending(null)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
