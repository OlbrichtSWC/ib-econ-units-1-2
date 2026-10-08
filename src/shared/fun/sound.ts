/**
 * Short sound effects, made in the browser with the Web Audio API.
 * There are no sound files to download, and nothing is sent anywhere.
 * Students turn sound on or off with the button in the top bar; the choice is saved in this browser.
 */
export type SoundName = 'tap' | 'correct' | 'wrong' | 'coin' | 'whoosh' | 'win' | 'stamp' | 'pop';

const KEY = 'ib-econ.sound';
let ctx: AudioContext | null = null;
let on = readSetting();
const listeners = new Set<(on: boolean) => void>();

function readSetting(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function soundOn(): boolean {
  return on;
}

export function setSoundOn(value: boolean) {
  on = value;
  try {
    localStorage.setItem(KEY, value ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(value));
  if (value) play('pop');
}

export function onSoundChange(l: (on: boolean) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  return ctx;
}

/** One short tone. */
function tone(a: AudioContext, freq: number, start: number, length: number, type: OscillatorType = 'sine', volume = 0.12, slideTo?: number) {
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + length);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(a.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

export function play(name: SoundName) {
  if (!on) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  switch (name) {
    case 'tap':
      tone(a, 660, t, 0.06, 'triangle', 0.06);
      break;
    case 'pop':
      tone(a, 520, t, 0.08, 'sine', 0.1, 900);
      break;
    case 'correct':
      tone(a, 660, t, 0.12, 'triangle');
      tone(a, 990, t + 0.1, 0.18, 'triangle');
      break;
    case 'wrong':
      // Soft and low, not a buzzer: a wrong answer is part of learning.
      tone(a, 330, t, 0.14, 'sine', 0.08);
      tone(a, 262, t + 0.12, 0.2, 'sine', 0.08);
      break;
    case 'coin':
      tone(a, 1320, t, 0.06, 'square', 0.04);
      tone(a, 1760, t + 0.06, 0.12, 'square', 0.04);
      break;
    case 'whoosh':
      tone(a, 300, t, 0.25, 'sawtooth', 0.03, 900);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(a, f, t + i * 0.1, 0.22, 'triangle', 0.1));
      break;
    case 'stamp':
      tone(a, 140, t, 0.12, 'square', 0.08, 70);
      [784, 1047, 1319].forEach((f, i) => tone(a, f, t + 0.15 + i * 0.08, 0.2, 'triangle', 0.08));
      break;
  }
}
