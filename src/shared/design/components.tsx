/** Shared building blocks. Styles live in tokens.css. */
import { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

export function HlBadge() {
  return (
    <span class="badge badge-hl" title="Higher Level only">
      HL
    </span>
  );
}

/** A numbered step marker. Panels in a game carry these so students know the order to work in. */
export function StepNo({ n }: { n: number }) {
  return (
    <span class="step-no">
      <span class="sr-only">Step </span>
      {n}
      <span class="sr-only">:</span>
    </span>
  );
}

export function CodeBadge({ code }: { code: string }) {
  return <span class="badge badge-code">{code}</span>;
}

/** A mark (checkmark) icon. Always paired with text, never colour alone. */
export function MarkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function CrossIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
    </svg>
  );
}

export function InfoIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M10 9v5M10 6v.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
    </svg>
  );
}

/** A modal dialog built on the native <dialog> element (keyboard and screen reader friendly). */
export function Dialog(props: { open: boolean; onClose: () => void; title: string; children: ComponentChildren }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (props.open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    }
    if (!props.open && d.open) d.close();
  }, [props.open]);
  return (
    <dialog ref={ref} onClose={props.onClose} aria-labelledby="dialog-title">
      <h2 id="dialog-title">{props.title}</h2>
      {props.children}
    </dialog>
  );
}

/** "Are you sure?" confirmation. */
export function ConfirmDialog(props: {
  open: boolean;
  title: string;
  message: ComponentChildren;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={props.open} onClose={props.onCancel} title={props.title}>
      <div class="stack">
        <div>{props.message}</div>
        <div class="row" style={{ justifyContent: 'flex-end' }}>
          <button class="btn btn-secondary" onClick={props.onCancel} autoFocus>
            Cancel
          </button>
          <button class={props.danger ? 'btn btn-danger' : 'btn'} onClick={props.onConfirm}>
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** Polite live region: screen readers announce changes to its text. */
export function LiveRegion({ text }: { text: string }) {
  return (
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      {text}
    </div>
  );
}
