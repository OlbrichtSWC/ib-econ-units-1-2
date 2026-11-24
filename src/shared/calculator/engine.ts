/**
 * A four-function calculator, like the one allowed in IB Papers 2 and 3.
 * Works out an expression such as "(12 - 10) / 10 * 100" with the usual order of operations.
 * Never uses eval: the expression is read one symbol at a time.
 */

export type CalcResult = { ok: true; value: number } | { ok: false; error: string };

/** The symbols students see, turned into ones the reader understands. */
export function normalise(expr: string): string {
  return expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/,/g, '').replace(/\s+/g, '');
}

/** Work out an expression. Supports + - * / ( ) %, decimals and negative numbers. */
export function evaluate(input: string): CalcResult {
  const s = normalise(input);
  if (!s) return { ok: false, error: 'Type a calculation first.' };
  let i = 0;
  const peek = () => s[i];

  function number(): number {
    const start = i;
    while (i < s.length && /[0-9.]/.test(s[i])) i++;
    const text = s.slice(start, i);
    if (!text || text === '.' || (text.match(/\./g) ?? []).length > 1) throw new Error('That number does not look right.');
    return parseFloat(text);
  }

  function factor(): number {
    const c = peek();
    if (c === '-') {
      i++;
      return -factor();
    }
    if (c === '+') {
      i++;
      return factor();
    }
    let v: number;
    if (c === '(') {
      i++;
      v = expression();
      if (peek() !== ')') throw new Error('A bracket is not closed.');
      i++;
    } else if (c !== undefined && /[0-9.]/.test(c)) {
      v = number();
    } else {
      throw new Error('Something is missing in the calculation.');
    }
    // "x%" means x hundredths.
    while (peek() === '%') {
      i++;
      v = v / 100;
    }
    return v;
  }

  function term(): number {
    let v = factor();
    while (peek() === '*' || peek() === '/') {
      const op = s[i++];
      const r = factor();
      if (op === '/' && r === 0) throw new Error('You cannot divide by zero.');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }

  function expression(): number {
    let v = term();
    while (peek() === '+' || peek() === '-') {
      const op = s[i++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  try {
    const value = expression();
    if (i < s.length) throw new Error(s[i] === ')' ? 'There is a closing bracket with no opening bracket.' : 'Something in the calculation is not a number or a sign.');
    if (!Number.isFinite(value)) throw new Error('The answer is too big to show.');
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Show an answer without floating point noise: at most 6 decimal places, no trailing zeros. */
export function display(value: number): string {
  if (Object.is(value, -0)) return '0';
  const r = Math.round(value * 1e6) / 1e6;
  return String(r);
}
