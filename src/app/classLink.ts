/**
 * Class links: a teacher picks which activities are open (and whether HL content shows), and the
 * app makes a short link. When a student opens it on their device, those choices are saved in
 * that browser only. This lets a teacher release activities without editing files on GitHub.
 *
 * Code layout (then Crockford Base32 with a CRC-16 checksum, like progress codes):
 *   byte 0: version (1)
 *   byte 1: flags (bit 0 = show HL content)
 *   bytes 2+: one bit per entry in PROGRESS_ID_TABLE, in order (1 = open)
 * The id table is append-only, so old links keep working when activities are added.
 */
import { crc16, fromBase32, normalizeCode, toBase32 } from '../shared/progress/code';

export const CLASS_LINK_VERSION = 1;
const KEY = 'ib-econ-1-2.class-settings';

export interface ClassSettings {
  modules: Record<string, boolean>;
  showHl: boolean;
}

export function encodeClassLink(s: ClassSettings, idTable: readonly string[]): string {
  const mask: number[] = new Array(Math.ceil(idTable.length / 8)).fill(0);
  idTable.forEach((id, i) => {
    if (s.modules[id]) mask[i >> 3] |= 1 << (i & 7);
  });
  // Trailing zero bytes add nothing, so leave them out to keep links short.
  while (mask.length && mask[mask.length - 1] === 0) mask.pop();
  const bytes = [CLASS_LINK_VERSION, s.showHl ? 1 : 0, ...mask];
  const crc = crc16(bytes);
  return toBase32([...bytes, crc >> 8, crc & 255]);
}

/** Reads a class link code. Activities missing from the code are closed. Returns null for a damaged code. */
export function decodeClassLink(code: string, idTable: readonly string[]): ClassSettings | null {
  const bytes = fromBase32(normalizeCode(code));
  if (!bytes || bytes.length < 4) return null;
  const body = bytes.slice(0, -2);
  const crc = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
  if (crc16(body) !== crc || body[0] !== CLASS_LINK_VERSION) return null;
  const modules: Record<string, boolean> = {};
  idTable.forEach((id, i) => {
    const b = body[2 + (i >> 3)] ?? 0;
    modules[id] = (b & (1 << (i & 7))) !== 0;
  });
  return { modules, showHl: (body[1] & 1) === 1 };
}

export function loadClassSettings(): ClassSettings | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v && typeof v.modules === 'object' && typeof v.showHl === 'boolean') return v as ClassSettings;
  } catch {
    /* storage blocked or damaged */
  }
  return null;
}

export function saveClassSettings(s: ClassSettings | null): void {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
}
