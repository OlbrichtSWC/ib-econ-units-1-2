/**
 * An on-screen four-function calculator. A button in the corner opens it beside the game,
 * so students can keep reading the question while they work. Nothing is saved or sent.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { display, evaluate } from './engine';
import './calculator.css';

const KEYS: { label: string; insert?: string; action?: 'clear' | 'back' | 'equals'; aria?: string; wide?: boolean; kind?: 'op' | 'do' }[] = [
  { label: 'C', action: 'clear', aria: 'Clear', kind: 'do' },
  { label: '(', insert: '(' },
  { label: ')', insert: ')' },
  { label: '÷', insert: '÷', aria: 'divide', kind: 'op' },
  { label: '7', insert: '7' }, { label: '8', insert: '8' }, { label: '9', insert: '9' },
  { label: '×', insert: '×', aria: 'times', kind: 'op' },
  { label: '4', insert: '4' }, { label: '5', insert: '5' }, { label: '6', insert: '6' },
  { label: '−', insert: '−', aria: 'minus', kind: 'op' },
  { label: '1', insert: '1' }, { label: '2', insert: '2' }, { label: '3', insert: '3' },
  { label: '+', insert: '+', aria: 'plus', kind: 'op' },
  { label: '0', insert: '0' }, { label: '.', insert: '.', aria: 'point' },
  { label: '⌫', action: 'back', aria: 'Delete last', kind: 'do' },
  { label: '=', action: 'equals', aria: 'Equals', kind: 'do' },
];

const FORMULAS = [
  ['Percentage change', '(new − old) ÷ old × 100'],
  ['PED', '%Δ quantity demanded ÷ %Δ price'],
  ['YED', '%Δ quantity demanded ÷ %Δ income'],
  ['PES', '%Δ quantity supplied ÷ %Δ price'],
  ['Total revenue', 'price × quantity'],
  ['Shortage or surplus', 'gap between Qd and Qs at the set price'],
  ['Spending on a price floor', 'price × units the government buys'],
];

export function Calculator() {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState('');
  const [answer, setAnswer] = useState<{ text: string; ok: boolean } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  const equals = () => {
    const r = evaluate(expr);
    if (r.ok) {
      const text = display(r.value);
      setAnswer({ text, ok: true });
      setHistory((h) => [`${expr} = ${text}`, ...h].slice(0, 3));
      setExpr(text);
    } else setAnswer({ text: r.error, ok: false });
    inputRef.current?.focus();
  };

  const press = (k: (typeof KEYS)[number]) => {
    if (k.action === 'clear') {
      setExpr('');
      setAnswer(null);
    } else if (k.action === 'back') setExpr((e) => e.slice(0, -1));
    else if (k.action === 'equals') return equals();
    else setExpr((e) => e + k.insert);
    inputRef.current?.focus();
  };

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        class={`calc-toggle ${open ? 'on' : ''}`}
        aria-expanded={open}
        aria-controls="calc-panel"
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span aria-hidden="true">🧮</span> Calculator
      </button>
      {open && (
        <div
          id="calc-panel"
          class="calc-panel"
          role="dialog"
          aria-label="Calculator"
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
          }}
        >
          <div class="calc-top">
            <strong>Calculator</strong>
            <button type="button" class="calc-close" onClick={close} aria-label="Close the calculator">✕</button>
          </div>
          <label class="sr-only" for="calc-input">Calculation</label>
          <input
            id="calc-input"
            ref={inputRef}
            class="calc-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellcheck={false}
            value={expr}
            placeholder="For example (12 − 10) ÷ 10 × 100"
            onInput={(e) => {
              setExpr((e.target as HTMLInputElement).value);
              setAnswer(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                equals();
              }
            }}
          />
          <p class={`calc-answer ${answer && !answer.ok ? 'calc-error' : ''}`} aria-live="polite">
            {answer ? (answer.ok ? `= ${answer.text}` : answer.text) : ' '}
          </p>
          <div class="calc-keys">
            {KEYS.map((k) => (
              <button key={k.label} type="button" class={`calc-key ${k.kind ?? ''}`} aria-label={k.aria} onClick={() => press(k)}>
                {k.label}
              </button>
            ))}
          </div>
          {history.length > 0 && (
            <div class="calc-history">
              <p class="small muted" style={{ margin: 0 }}>Recent</p>
              <ul>
                {history.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          )}
          <details class="calc-formulas">
            <summary>Formulas</summary>
            <dl>
              {FORMULAS.map(([n, f]) => (
                <div key={n}>
                  <dt>{n}</dt>
                  <dd>{f}</dd>
                </div>
              ))}
            </dl>
            <p class="small muted" style={{ margin: 0 }}>Paper 1 does not allow a calculator. Papers 2 and 3 do. Show your working in the exam.</p>
          </details>
        </div>
      )}
    </>
  );
}
