import { useEffect, useState } from 'preact/hooks';
import { onSoundChange, setSoundOn, soundOn } from './sound';

/** Button that turns sound effects on or off. */
export function SoundToggle({ class: cls }: { class?: string }) {
  const [on, setOn] = useState(soundOn());
  useEffect(() => onSoundChange(setOn), []);
  return (
    <button class={cls} aria-pressed={on} onClick={() => setSoundOn(!on)} title={on ? 'Turn sound off' : 'Turn sound on'}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor" />
        {on ? (
          <path d="M13 7.5a3.5 3.5 0 010 5M15 5a7 7 0 010 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        ) : (
          <path d="M13 7l5 6M18 7l-5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        )}
      </svg>
      <span>{on ? 'Sound on' : 'Sound off'}</span>
    </button>
  );
}
