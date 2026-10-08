/** Pops up at the bottom of the screen when a new stamp is earned. Screen readers hear it too. */
import { useEffect, useRef } from 'preact/hooks';
import { Stamp, StampIcon } from './Stamp';

export function StampToast(props: { name: string; icon: StampIcon; level?: number; activity: string; bookHref: string; onClose: () => void }) {
  const closeRef = useRef(props.onClose);
  closeRef.current = props.onClose;
  useEffect(() => {
    // Hides itself after a while. The stamp stays in the stamp book, so nothing is lost.
    const t = setTimeout(() => closeRef.current(), 8000);
    return () => clearTimeout(t);
  }, [props.name, props.activity]);
  return (
    <div class="toast" role="status" aria-live="polite">
      <Stamp icon={props.icon} level={props.level} earned size={64} animate />
      <div style={{ flex: 1 }}>
        <p class="small muted">New stamp: {props.activity}</p>
        <p>
          <strong>{props.name}</strong>
        </p>
        <a class="small" href={props.bookHref} onClick={props.onClose}>
          Open my stamp book
        </a>
      </div>
      <button class="btn btn-secondary" style={{ minHeight: 36, padding: '4px 10px' }} onClick={props.onClose} aria-label="Close">
        Close
      </button>
    </div>
  );
}
