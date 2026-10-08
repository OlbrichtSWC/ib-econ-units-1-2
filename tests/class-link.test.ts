import { describe, expect, it } from 'vitest';
import { decodeClassLink, encodeClassLink } from '../src/app/classLink';
import { PROGRESS_ID_TABLE } from '../src/app/registry';
import { normalizeCode } from '../src/shared/progress/code';

const open = (...ids: string[]) => Object.fromEntries(PROGRESS_ID_TABLE.map((id) => [id, ids.includes(id)]));

describe('Class links', () => {
  it('round-trip the open activities and the HL choice', () => {
    const s = { modules: open('ppc-explorer', 'market-shock', 'gov-toolkit'), showHl: false };
    expect(decodeClassLink(encodeClassLink(s, PROGRESS_ID_TABLE), PROGRESS_ID_TABLE)).toEqual(s);
    const t = { modules: open(...PROGRESS_ID_TABLE), showHl: true };
    expect(decodeClassLink(encodeClassLink(t, PROGRESS_ID_TABLE), PROGRESS_ID_TABLE)).toEqual(t);
  });

  it('are short enough to type', () => {
    expect(encodeClassLink({ modules: open(...PROGRESS_ID_TABLE), showHl: true }, PROGRESS_ID_TABLE).length).toBeLessThan(16);
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
});
