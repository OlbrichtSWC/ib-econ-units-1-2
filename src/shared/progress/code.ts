/**
 * Progress codes: turn saved progress into a short code a student can copy or photograph,
 * and turn the code back into progress on another device.
 *
 * Format (version 2), before encoding as text:
 *   8 bits          format version (2)
 *   number          how many activities
 *   number          earliest "updated" day (only if there is at least one activity)
 *   per activity:   gap in activity number since the previous one (position in the id table)
 *                   4 bits steps, 4 bits rating, 4 bits stamps (version 1 codes have no stamps)
 *                   numbers: correct, wrong, hints, applyCorrect, applyWrong, days after the earliest day
 *   zero padding to a whole byte, then a 2-byte CRC-16 checksum of everything before it
 *
 * Numbers are packed bit by bit (this is the compression) and written in Crockford Base32:
 * digits and capital letters without I, L, O or U, so 0/O and 1/I/L mix-ups are forgiven.
 * Codes are shown in groups of 4 separated by dashes.
 *
 * The activity id table is append-only: never remove or reorder ids, only add new ones at
 * the end, so codes from older versions of the app still load.
 */
import { ActivityProgress, ImportResult, Progress } from './types';

export const CODE_VERSION = 2;
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// ---------- CRC-16/CCITT-FALSE ----------

export function crc16(bytes: ArrayLike<number>): number {
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

// ---------- Base32 (Crockford) ----------

export function toBase32(bytes: number[]): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >> (bits - 5)) & 31];
      bits -= 5;
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

/** Returns null if the text contains a character that cannot be part of a code. */
export function fromBase32(text: string): number[] | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of text) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    buffer = (buffer << 5) | v;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >> (bits - 8)) & 255);
      bits -= 8;
    }
    buffer &= (1 << bits) - 1;
  }
  // Leftover bits must be zero padding shorter than one character; otherwise the code was mistyped.
  if (bits >= 5 || buffer !== 0) return null;
  return bytes;
}

/** Cleans up what a student typed: ignores spaces and dashes, case, and O/I/L look-alikes. */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s\-_.]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

export function formatCode(raw: string): string {
  return raw.match(/.{1,4}/g)?.join('-') ?? '';
}

// ---------- Bit packing ----------
// Small numbers are common (1 hint, 6 questions), so each number uses Elias gamma coding:
// 0 takes 1 bit, 1 to 2 take 3 bits, 3 to 6 take 5 bits, 7 to 14 take 7 bits, and so on.

class BitWriter {
  bits: number[] = [];
  fixed(value: number, width: number) {
    for (let i = width - 1; i >= 0; i--) this.bits.push((value >> i) & 1);
  }
  gamma(value: number) {
    const v = Math.max(0, Math.floor(value)) + 1;
    const width = Math.floor(Math.log2(v)) + 1;
    for (let i = 1; i < width; i++) this.bits.push(0);
    this.fixed(v, width);
  }
  toBytes(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | (this.bits[i + j] ?? 0);
      out.push(b);
    }
    return out;
  }
}

class BitReader {
  pos = 0;
  constructor(private bytes: number[]) {}
  bit(): number {
    if (this.pos >= this.bytes.length * 8) throw new Error('end');
    const b = (this.bytes[this.pos >> 3] >> (7 - (this.pos & 7))) & 1;
    this.pos++;
    return b;
  }
  fixed(width: number): number {
    let v = 0;
    for (let i = 0; i < width; i++) v = v * 2 + this.bit();
    return v;
  }
  gamma(): number {
    let zeros = 0;
    while (this.bit() === 0) {
      if (++zeros > 30) throw new Error('bad number');
    }
    return 2 ** zeros + this.fixed(zeros) - 1;
  }
  /** True if only zero padding is left. */
  onlyPaddingLeft(): boolean {
    const total = this.bytes.length * 8;
    if (total - this.pos >= 8) return false;
    while (this.pos < total) if (this.bit()) return false;
    return true;
  }
}

// ---------- Encode / decode ----------

/** Turns progress into a code. Activities not in `idTable` are left out. */
export function encodeProgress(progress: Progress, idTable: readonly string[]): string {
  const entries = Object.entries(progress.activities)
    .map(([id, a]) => [idTable.indexOf(id), a] as const)
    .filter(([n]) => n >= 0)
    .sort((x, y) => x[0] - y[0]);
  const w = new BitWriter();
  w.fixed(CODE_VERSION, 8);
  w.gamma(entries.length);
  const baseDay = entries.length ? Math.min(...entries.map(([, a]) => a.updated)) : 0;
  if (entries.length) w.gamma(baseDay);
  let prev = -1;
  for (const [n, a] of entries) {
    w.gamma(n - prev - 1); // gap since the previous activity number
    prev = n;
    w.fixed(a.steps & 15, 4);
    w.fixed(Math.min(8, a.rating), 4);
    w.fixed((a.stamps ?? 0) & 15, 4);
    w.gamma(a.correct);
    w.gamma(a.total - a.correct);
    w.gamma(a.hints);
    w.gamma(a.applyCorrect);
    w.gamma(a.applyTotal - a.applyCorrect);
    w.gamma(a.updated - baseDay);
  }
  const bytes = w.toBytes();
  const crc = crc16(bytes);
  bytes.push(crc >> 8, crc & 255);
  return formatCode(toBase32(bytes));
}

/** Turns a code back into progress. Never throws: a bad code returns { ok: false }. */
export function decodeProgress(input: string, idTable: readonly string[]): ImportResult {
  const text = normalizeCode(input);
  if (!text) return { ok: false, reason: 'empty' };
  const bytes = fromBase32(text);
  if (!bytes || bytes.length < 3) return { ok: false, reason: 'typo' };
  const body = bytes.slice(0, -2);
  const crc = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
  if (crc16(body) !== crc) return { ok: false, reason: 'typo' };
  const version = body[0];
  if (version > CODE_VERSION) return { ok: false, reason: 'newer-version' };
  if (version < 1) return { ok: false, reason: 'typo' };
  try {
    return decodeBody(body, version, idTable);
  } catch {
    return { ok: false, reason: 'typo' };
  }
}

function decodeBody(body: number[], version: number, idTable: readonly string[]): ImportResult {
  const r = new BitReader(body);
  r.fixed(8); // version
  const count = r.gamma();
  const baseDay = count ? r.gamma() : 0;
  const progress: Progress = { activities: {} };
  let unknown = 0;
  let prev = -1;
  for (let i = 0; i < count; i++) {
    const n = prev + 1 + r.gamma();
    prev = n;
    const steps = r.fixed(4);
    const rating = r.fixed(4);
    if (rating > 8) throw new Error('bad rating');
    const stamps = version >= 2 ? r.fixed(4) : 0;
    const correct = r.gamma();
    const total = correct + r.gamma();
    const hints = r.gamma();
    const applyCorrect = r.gamma();
    const applyTotal = applyCorrect + r.gamma();
    const updated = baseDay + r.gamma();
    const a: ActivityProgress = { steps, correct, total, hints, applyCorrect, applyTotal, rating, stamps, updated };
    const id = idTable[n];
    if (id) progress.activities[id] = a;
    else unknown++;
  }
  if (!r.onlyPaddingLeft()) throw new Error('trailing data');
  return { ok: true, progress, unknownActivities: unknown };
}
