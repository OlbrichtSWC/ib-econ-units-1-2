import { describe, expect, it } from 'vitest';
import { classDecides, decodeClassLink, encodeClassLink } from '../src/app/classLink';
import { crc16, toBase32 } from '../src/shared/progress/code';
import { PROGRESS_ID_TABLE } from '../src/app/registry';
import { normalizeCode } from '../src/shared/progress/code';

const open = (...ids: string[]) => Object.fromEntries(PROGRESS_ID_TABLE.map((id) => [id, ids.includes(id)]));

describe('Class links', () => {
  it('round-trip the open activities and the HL choice', () => {
    const s = { modules: open('ppc-explorer', 'market-shock', 'gov-toolkit'), showHl: false };
    expect(decodeClassLink(encodeClassLink(s, PROGRESS_ID_TABLE), PROGRESS_ID_TABLE)).toEqual({ ...s, known: [...PROGRESS_ID_TABLE] });
    const t = { modules: open(...PROGRESS_ID_TABLE), showHl: true };
    expect(decodeClassLink(encodeClassLink(t, PROGRESS_ID_TABLE), PROGRESS_ID_TABLE)).toEqual({ ...t, known: [...PROGRESS_ID_TABLE] });
  });

  it('are short enough to type', () => {
    expect(encodeClassLink({ modules: open(...PROGRESS_ID_TABLE), showHl: true }, PROGRESS_ID_TABLE).length).toBeLessThan(24);
  });

  it('reject a damaged link', () => {
    const code = normalizeCode(encodeClassLink({ modules: open('ped-line'), showHl: true }, PROGRESS_ID_TABLE));
    const bad = code.slice(0, 2) + (code[2] === 'A' ? 'B' : 'A') + code.slice(3);
    expect(decodeClassLink(bad, PROGRESS_ID_TABLE)).toBeNull();
    expect(decodeClassLink('', PROGRESS_ID_TABLE)).toBeNull();
    expect(decodeClassLink('hello!', PROGRESS_ID_TABLE)).toBeNull();
  });

  it('still work after new activities are added to the end of the id table', () => {
    const code = encodeClassLink({ modules: open('surplus-shader'), showHl: true }, PROGRESS_ID_TABLE);
    const longer = [...PROGRESS_ID_TABLE, 'new-activity'];
    const r = decodeClassLink(code, longer)!;
    expect(r.modules['surplus-shader']).toBe(true);
    expect(r.modules['new-activity']).toBe(false);
  });

  it('do not hide activities added after the link was made', () => {
    const built = ['ppc-explorer', 'market-shock', 'surplus-shader'];
    const code = encodeClassLink({ modules: { 'ppc-explorer': true, 'market-shock': false, 'surplus-shader': true }, showHl: true }, PROGRESS_ID_TABLE, built);
    const r = decodeClassLink(code, PROGRESS_ID_TABLE)!;
    expect(classDecides(r, 'market-shock')).toBe(true);
    expect(r.modules['market-shock']).toBe(false);
    expect(classDecides(r, 'ppc-explorer')).toBe(true);
    expect(classDecides(r, 'fish-pond')).toBe(false);
  });

  it('read version 1 links: they decide only the first six games and any game they open', () => {
    const mask = new Array(Math.ceil(PROGRESS_ID_TABLE.length / 8)).fill(0);
    PROGRESS_ID_TABLE.forEach((id, i) => {
      if (id === 'ppc-explorer' || id === 'island-economy') mask[i >> 3] |= 1 << (i & 7);
    });
    while (mask.length && mask[mask.length - 1] === 0) mask.pop();
    const bytes = [1, 1, ...mask];
    const crc = crc16(bytes);
    const r = decodeClassLink(toBase32([...bytes, crc >> 8, crc & 255]), PROGRESS_ID_TABLE)!;
    expect(r.known).toBeUndefined();
    expect(classDecides(r, 'ppc-explorer')).toBe(true);
    expect(classDecides(r, 'island-economy')).toBe(true);
    expect(classDecides(r, 'market-shock')).toBe(true);
    expect(r.modules['market-shock']).toBe(false);
    expect(classDecides(r, 'fish-pond')).toBe(false);
    expect(classDecides(r, 'circular-flow')).toBe(false);
  });
});
