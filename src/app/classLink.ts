/**
 * Class links: a teacher picks which activities are open (and whether HL content shows), and the
 * app makes a short link. When a student opens it on their device, those choices are saved in
 * that browser only. This lets a teacher release activities without editing files on GitHub.
 *
 * Code layout (then Crockford Base32 with a CRC-16 checksum, like progress codes):
 *   byte 0: version (2)
 *   byte 1: flags (bit 0 = show HL content)
 *   byte 2: N, the length of the open mask in bytes
 *   next N bytes: one bit per entry in PROGRESS_ID_TABLE, in order (1 = open)
 *   remaining bytes: the same layout for the activities that existed when the link was made
 * The id table is append-only, so old links keep working when activities are added.
 * A link only decides activities that existed when it was made. Newer activities follow the
 * settings file, so a game released later is not hidden by an old link.
 * Version 1 links had no "existed" mask; see V1_KNOWN.
 */
import { crc16, fromBase32, normalizeCode, toBase32 } from '../shared/progress/code';

export const CLASS_LINK_VERSION = 2;

/** Activities that existed while version 1 links were made. */
export const V1_KNOWN = ['ppc-explorer', 'market-shock', 'surplus-shader', 'elasticity-cafe', 'ped-line', 'gov-toolkit'];
const KEY = 'ib-econ-1-2.class-settings';

export interface ClassSettings {
  modules: Record<string, boolean>;
  showHl: boolean;
  /** Activities the link decides. Missing in links and saved settings from version 1. */
  known?: string[];
}

/** Does this class link decide whether the activity is open? If not, the settings file does. */
export function classDecides(s: ClassSettings, id: string): boolean {
  if (!(id in s.modules)) return false;
  return s.known ? s.known.includes(id) : s.modules[id] || V1_KNOWN.includes(id);
}

function toMask(idTable: readonly string[], on: (id: string) => boolean): number[] {
  const mask: number[] = new Array(Math.ceil(idTable.length / 8)).fill(0);
  idTable.forEach((id, i) => {
    if (on(id)) mask[i >> 3] |= 1 << (i & 7);
  });
  return mask;
}

const bit = (mask: number[], i: number) => ((mask[i >> 3] ?? 0) & (1 << (i & 7))) !== 0;

export function encodeClassLink(s: ClassSettings, idTable: readonly string[], known: readonly string[] = Object.keys(s.modules)): string {
  const open = toMask(idTable, (id) => !!s.modules[id]);
  // Trailing zero bytes add nothing, so leave them out to keep links short.
  while (open.length && open[open.length - 1] === 0) open.pop();
  const seen = toMask(idTable, (id) => known.includes(id));
  while (seen.length && seen[seen.length - 1] === 0) seen.pop();
  const bytes = [CLASS_LINK_VERSION, s.showHl ? 1 : 0, open.length, ...open, ...seen];
  const crc = crc16(bytes);
  return toBase32([...bytes, crc >> 8, crc & 255]);
}

/** Reads a class link code. Activities missing from the code are closed. Returns null for a damaged code. */
export function decodeClassLink(code: string, idTable: readonly string[]): ClassSettings | null {
  const bytes = fromBase32(normalizeCode(code));
  if (!bytes || bytes.length < 4) return null;
  const body = bytes.slice(0, -2);
  const crc = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
  if (crc16(body) !== crc) return null;
  const modules: Record<string, boolean> = {};
  const showHl = (body[1] & 1) === 1;
  if (body[0] === 1) {
    const open = body.slice(2);
    idTable.forEach((id, i) => (modules[id] = bit(open, i)));
    return { modules, showHl };
  }
  if (body[0] !== CLASS_LINK_VERSION || body.length < 3) return null;
  const n = body[2];
  const open = body.slice(3, 3 + n);
  const seen = body.slice(3 + n);
  const known: string[] = [];
  idTable.forEach((id, i) => {
    modules[id] = bit(open, i);
    if (bit(seen, i)) known.push(id);
  });
  return { modules, showHl, known };
}

export function loadClassSettings(): ClassSettings | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v && typeof v.modules === 'object' && typeof v.showHl === 'boolean' && (v.known === undefined || Array.isArray(v.known))) return v as ClassSettings;
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
