/**
 * Opened from a teacher's class link. Shows what the link changes and asks the student to confirm
 * before saving it on this device.
 */
import { MarkIcon } from '../shared/design/components';
import { ClassSettings, decodeClassLink } from './classLink';
import { ACTIVITIES, PROGRESS_ID_TABLE } from './registry';

export function ClassLinkPage(props: { code: string; current: ClassSettings | null; onSave: (s: ClassSettings | null) => void }) {
  const s = decodeClassLink(props.code, PROGRESS_ID_TABLE);
  const built = ACTIVITIES.filter((a) => a.load);
  if (!s) {
    return (
      <div class="stack" style={{ maxWidth: 640 }}>
        <h1>Class link</h1>
        <div class="callout callout-try" role="alert">
          This class link does not look right. Ask your teacher for the link again, or copy all of it.
        </div>
        <a href="#/">Back to all activities</a>
      </div>
    );
  }
  const open = built.filter((a) => s.modules[a.id]);
  const same = props.current && JSON.stringify(props.current) === JSON.stringify(s);
  return (
    <div class="stack" style={{ maxWidth: 640 }}>
      <h1>Class link</h1>
      <p>Your teacher's link opens these activities on this device:</p>
      {open.length ? (
        <ul>
          {open.map((a) => (
            <li key={a.id}>
              <strong>{a.title}</strong> <span class="muted small">{a.tag}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p class="muted">No activities yet.</p>
      )}
      <p>HL content: {s.showHl ? 'shown' : 'hidden'}.</p>
      <p class="small muted">This is saved in this browser only. Your progress does not change.</p>
      {same ? (
        <p class="callout callout-ok" role="status">
          <MarkIcon /> These class settings are already on this device. <a href="#/">Go to the activities</a>
        </p>
      ) : (
        <div class="row">
          <button
            class="btn"
            onClick={() => {
              props.onSave(s);
              location.hash = '#/';
            }}
          >
            Use these class settings
          </button>
          <a class="btn btn-quiet" href="#/">Not now</a>
        </div>
      )}
    </div>
  );
}
