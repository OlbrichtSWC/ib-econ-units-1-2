import { useState } from 'preact/hooks';
import { MarkIcon } from '../shared/design/components';
import { ACTIVITIES } from './registry';
import type { Settings } from './settings';

export function TeacherPage(props: {
  settings: Settings;
  unlocked: boolean;
  onUnlock: (ok: boolean) => void;
  projector: boolean;
  onProjector: (on: boolean) => void;
  enabled: Record<string, boolean>;
  preview: Record<string, boolean>;
  onPreview: (p: Record<string, boolean>) => void;
}) {
  const [pass, setPass] = useState('');
  const [wrong, setWrong] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!props.unlocked) {
    return (
      <div class="stack" style={{ maxWidth: 520 }}>
        <h1>Teacher view</h1>
        <p>Enter the teacher passcode to show answers, turn activities on or off, and open projector mode.</p>
        <form
          class="row"
          onSubmit={(e) => {
            e.preventDefault();
            const ok = pass === props.settings.teacherPasscode;
            setWrong(!ok);
            if (ok) props.onUnlock(true);
          }}
        >
          <label for="pass" class="sr-only">Passcode</label>
          <input id="pass" type="password" autoComplete="off" value={pass} onInput={(e) => setPass((e.target as HTMLInputElement).value)} />
          <button class="btn" type="submit">Unlock</button>
        </form>
        {wrong && <p class="callout callout-try" role="alert">That passcode does not match. It is set in config/settings.json.</p>}
      </div>
    );
  }

  const modulesJson = JSON.stringify(
    Object.fromEntries(ACTIVITIES.filter((a) => a.load).map((a) => [a.id, props.enabled[a.id]])),
    null,
    2,
  );

  return (
    <div class="stack">
      <h1>Teacher view</h1>
      <div class="row">
        <button class="btn btn-secondary" onClick={() => props.onUnlock(false)}>Turn off teacher view</button>
      </div>

      <section class="card stack">
        <h2>Projector mode</h2>
        <p>Large text for whole-class demos on a projector or smart board.</p>
        <label class="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={props.projector} onChange={(e) => props.onProjector((e.target as HTMLInputElement).checked)} style={{ width: 24, height: 24 }} />
          Projector mode {props.projector ? '(on)' : '(off)'}
        </label>
      </section>

      <section class="card stack">
        <h2>Show answers</h2>
        <p>
          <MarkIcon /> While teacher view is on, Check it shows the answer to every question and Learn it shows your teacher notes. Students never see these.
        </p>
      </section>

      <section class="card stack">
        <h2>Turn activities on or off</h2>
        <p>
          Changes here affect <strong>this device only</strong>, so you can preview. To release an activity to students, copy the settings below into{' '}
          <code>config/settings.json</code> on GitHub (see the README, "Turn activities on or off").
        </p>
        <div class="stack">
          {ACTIVITIES.filter((a) => a.load).map((a) => (
            <label key={a.id} class="row" style={{ gap: 8, fontWeight: 400 }}>
              <input
                type="checkbox"
                style={{ width: 22, height: 22 }}
                checked={props.enabled[a.id]}
                onChange={(e) => props.onPreview({ ...props.preview, [a.id]: (e.target as HTMLInputElement).checked })}
              />
              <span>
                <strong>{a.title}</strong> <span class="muted small">{a.tag}</span>
                {props.settings.modules[a.id] === false ? <span class="small muted"> (off in settings file)</span> : null}
              </span>
            </label>
          ))}
        </div>
        <details>
          <summary>Settings to copy into config/settings.json ("modules" part)</summary>
          <pre class="code-pre">{`"modules": ${modulesJson}`}</pre>
          <button class="btn btn-secondary btn-sm" onClick={() => navigator.clipboard?.writeText(`"modules": ${modulesJson}`).then(() => setCopied(true))}>
            Copy
          </button>
          {copied && <span role="status"> Copied.</span>}
        </details>
        <button class="btn btn-quiet" onClick={() => props.onPreview({})}>Clear my preview changes</button>
      </section>
    </div>
  );
}
