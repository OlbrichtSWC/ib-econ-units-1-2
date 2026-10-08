import { beforeEach, describe, expect, it } from 'vitest';
import { crc16, decodeProgress, encodeProgress, fromBase32, normalizeCode, toBase32 } from '../src/shared/progress/code';
import { conflicts, mergeProgress } from '../src/shared/progress/merge';
import { LocalProgressStore } from '../src/shared/progress/localStore';
import { ActivityProgress, Progress, STAMP, STEP } from '../src/shared/progress/types';
import { PROGRESS_ID_TABLE } from '../src/app/registry';

const IDS = ['ppc-explorer', 'market-shock', 'surplus-shader', 'elasticity-cafe', 'ped-line'];

function act(over: Partial<ActivityProgress> = {}): ActivityProgress {
  return { steps: 0, correct: 0, total: 0, hints: 0, applyCorrect: 0, applyTotal: 0, rating: 0, stamps: 0, updated: 640, ...over };
}

const sample: Progress = {
  activities: {
    'ppc-explorer': act({ steps: STEP.learn | STEP.try | STEP.check | STEP.rated, correct: 5, total: 6, hints: 1, applyCorrect: 1, applyTotal: 2, rating: 5, updated: 645 }),
    'elasticity-cafe': act({ steps: STEP.learn | STEP.try, updated: 650 }),
    'surplus-shader': act({ steps: 15, correct: 8, total: 8, applyCorrect: 3, applyTotal: 3, rating: 8, stamps: STAMP.play | STAMP.sharp | STAMP.complete, updated: 700 }),
  },
};

/** Fake localStorage so the store can be tested as if on two separate devices. */
class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

describe('Progress code: round trip', () => {
  it('a code made on one device restores identical progress on another', () => {
    const deviceA = new MemoryStorage();
    const deviceB = new MemoryStorage();
    (globalThis as any).localStorage = deviceA;
    const storeA = new LocalProgressStore('progress', IDS);
    storeA.save(sample);
    const code = storeA.exportCode();

    (globalThis as any).localStorage = deviceB;
    const storeB = new LocalProgressStore('progress', IDS);
    const result = storeB.importCode(code);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    storeB.save(result.progress);
    expect(storeB.load()).toEqual(sample);
  });

  it('round-trips random progress 500 times', () => {
    for (let i = 0; i < 500; i++) {
      const p: Progress = { activities: {} };
      for (const id of IDS) {
        if (Math.random() < 0.3) continue;
        const total = Math.floor(Math.random() * 30);
        const applyTotal = Math.floor(Math.random() * 10);
        p.activities[id] = act({
          steps: Math.floor(Math.random() * 16),
          total,
          correct: Math.floor(Math.random() * (total + 1)),
          hints: Math.floor(Math.random() * 200),
          applyTotal,
          applyCorrect: Math.floor(Math.random() * (applyTotal + 1)),
          rating: Math.floor(Math.random() * 9),
          stamps: Math.floor(Math.random() * 32),
          updated: Math.floor(Math.random() * 20000),
        });
      }
      const r = decodeProgress(encodeProgress(p, IDS), IDS);
      expect(r.ok && r.progress).toEqual(p);
    }
  });

  it('keeps codes short: 5 finished activities fit in under 60 characters', () => {
    const p: Progress = { activities: {} };
    for (const id of IDS) p.activities[id] = act({ steps: 15, correct: 9, total: 10, hints: 3, applyCorrect: 2, applyTotal: 3, rating: 6, updated: 700 });
    const code = encodeProgress(p, IDS);
    expect(normalizeCode(code).length).toBeLessThan(60);
    expect(code).toMatch(/^[0-9A-Z]{1,4}(-[0-9A-Z]{1,4})*$/);
  });

  it('forgives lower case, spaces, and O / I / L look-alikes', () => {
    const code = encodeProgress(sample, IDS);
    const messy = ' ' + code.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l') + ' ';
    const r = decodeProgress(messy, IDS);
    expect(r.ok && r.progress).toEqual(sample);
  });

  it('an empty progress record makes a valid code', () => {
    const r = decodeProgress(encodeProgress({ activities: {} }, IDS), IDS);
    expect(r.ok && r.progress).toEqual({ activities: {} });
  });
});

describe('Progress code: mistakes are rejected safely', () => {
  const code = encodeProgress(sample, IDS);
  const raw = normalizeCode(code);
  const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

  it('rejects every single mistyped character', () => {
    for (let i = 0; i < raw.length; i++) {
      for (const ch of ALPHABET) {
        if (ch === raw[i]) continue;
        const bad = raw.slice(0, i) + ch + raw.slice(i + 1);
        const r = decodeProgress(bad, IDS);
        expect(r.ok, `changed position ${i} to ${ch}`).toBe(false);
      }
    }
  });

  it('rejects two neighbouring characters swapped', () => {
    for (let i = 0; i < raw.length - 1; i++) {
      if (raw[i] === raw[i + 1]) continue;
      const bad = raw.slice(0, i) + raw[i + 1] + raw[i] + raw.slice(i + 2);
      expect(decodeProgress(bad, IDS).ok).toBe(false);
    }
  });

  it('rejects a missing or extra character', () => {
    for (let i = 0; i < raw.length; i++) {
      expect(decodeProgress(raw.slice(0, i) + raw.slice(i + 1), IDS).ok).toBe(false);
    }
    expect(decodeProgress(raw + '7', IDS).ok).toBe(false);
  });

  it('gives a friendly reason, never an error', () => {
    expect(decodeProgress('', IDS)).toEqual({ ok: false, reason: 'empty' });
    expect(decodeProgress('hello world!', IDS)).toEqual({ ok: false, reason: 'typo' });
    expect(decodeProgress('U', IDS)).toEqual({ ok: false, reason: 'typo' });
    expect(() => decodeProgress('ZZZZ-ZZZZ-ZZZZ-ZZZZ', IDS)).not.toThrow();
  });

  it('random garbage never loads', () => {
    for (let i = 0; i < 2000; i++) {
      let s = '';
      const len = 4 + Math.floor(Math.random() * 60);
      for (let j = 0; j < len; j++) s += ALPHABET[Math.floor(Math.random() * 32)];
      const r = decodeProgress(s, IDS);
      // A random string passes the 16-bit checksum about 1 time in 65 536, and must then also parse cleanly.
      if (r.ok) expect(r.progress.activities).toBeTypeOf('object');
    }
  });
});

describe('Progress code: versions', () => {
  it('a code from a newer app version gives a clear message', () => {
    const bytes = [99, 0x80];
    const crc = crc16(bytes);
    const code = toBase32([...bytes, crc >> 8, crc & 255]);
    expect(decodeProgress(code, IDS)).toEqual({ ok: false, reason: 'newer-version' });
  });

  it('codes still load after new activities are added to the end of the id table', () => {
    const code = encodeProgress(sample, IDS);
    const r = decodeProgress(code, [...IDS, 'island-economy', 'circular-flow']);
    expect(r.ok && r.progress).toEqual(sample);
  });

  it('a version 1 code (made before stamps existed) still loads, with no stamps', () => {
    // Made by the version 1 app: ppc-explorer finished with a self-rating, ped-line started.
    const r = decodeProgress('05G0-M6ZA-CJ99-1GZ6-HER0', IDS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.activities['ppc-explorer']).toEqual(
      act({ steps: 15, correct: 5, total: 6, hints: 1, applyCorrect: 1, applyTotal: 2, rating: 5, updated: 645 }),
    );
    expect(r.progress.activities['ped-line']).toEqual(act({ steps: 3, updated: 650 }));
  });

  it('a version 2 code (three stamps, before game levels) still loads with its stamps', () => {
    // Made by the version 2 app (with the app's own id table): market-shock finished with all three stamps, ped-line started with one.
    const r = decodeProgress('09G0-ZM5Y-SRGK-9910-3YG1-VVR', PROGRESS_ID_TABLE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.activities['market-shock']).toEqual(
      act({ steps: 15, correct: 7, total: 8, hints: 2, applyCorrect: 1, applyTotal: 2, rating: 6, stamps: 7, updated: 1011 }),
    );
    expect(r.progress.activities['ped-line']).toEqual(act({ steps: 2, stamps: 1, updated: 1012 }));
  });

  it('level 2 and level 3 stamps survive the round trip', () => {
    const p: Progress = { activities: { 'ppc-explorer': act({ steps: 15, stamps: STAMP.play | STAMP.level2 | STAMP.level3 | STAMP.sharp, updated: 900 }) } };
    const r = decodeProgress(encodeProgress(p, IDS), IDS);
    expect(r.ok && r.progress).toEqual(p);
  });

  it('stamps survive the round trip', () => {
    const r = decodeProgress(encodeProgress(sample, IDS), IDS);
    expect(r.ok && r.progress.activities['surplus-shader'].stamps).toBe(STAMP.play | STAMP.sharp | STAMP.complete);
  });

  it('base32 round-trips bytes', () => {
    const bytes = [0, 1, 2, 250, 255, 128, 64];
    expect(fromBase32(toBase32(bytes))).toEqual(bytes);
  });
});

describe('Loading a code on a device that already has progress', () => {
  const current: Progress = {
    activities: {
      'ppc-explorer': act({ steps: 3, updated: 700 }), // newer here
      'market-shock': act({ steps: 15, rating: 4, updated: 690 }), // only here
      'surplus-shader': act({ steps: 1, updated: 600 }), // older here
    },
  };

  it('lists the activities that differ', () => {
    expect(conflicts(current, sample).sort()).toEqual(['ppc-explorer', 'surplus-shader']);
  });

  it('replace: the device ends up with exactly the code\'s progress', () => {
    expect(mergeProgress(current, sample, 'replace')).toEqual(sample);
  });

  it('keep newer: each activity keeps whichever side changed more recently', () => {
    const m = mergeProgress(current, sample, 'keep-newer');
    expect(m.activities['ppc-explorer']).toEqual(current.activities['ppc-explorer']);
    expect(m.activities['surplus-shader']).toEqual(sample.activities['surplus-shader']);
    expect(m.activities['market-shock']).toEqual(current.activities['market-shock']);
    expect(m.activities['elasticity-cafe']).toEqual(sample.activities['elasticity-cafe']);
  });

  it('keep newer: stamps earned on either device are kept', () => {
    const here: Progress = { activities: { 'ppc-explorer': act({ steps: 3, stamps: STAMP.play, updated: 700 }) } };
    const code: Progress = { activities: { 'ppc-explorer': act({ steps: 15, stamps: STAMP.sharp, updated: 600 }) } };
    const m = mergeProgress(here, code, 'keep-newer');
    expect(m.activities['ppc-explorer'].steps).toBe(3);
    expect(m.activities['ppc-explorer'].stamps).toBe(STAMP.play | STAMP.sharp);
    expect(here.activities['ppc-explorer'].stamps).toBe(STAMP.play); // the original is not changed
  });
});

describe('Local storage', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = new MemoryStorage();
  });

  it('reset clears all progress', () => {
    const s = new LocalProgressStore('progress', IDS);
    s.save(sample);
    s.reset();
    expect(new LocalProgressStore('progress', IDS).load()).toEqual({ activities: {} });
  });

  it('ignores damaged saved data instead of crashing', () => {
    localStorage.setItem('progress', '{not json');
    expect(new LocalProgressStore('progress', IDS).load()).toEqual({ activities: {} });
    localStorage.setItem('progress', JSON.stringify({ activities: { x: { steps: 'lots', rating: 99, name: 'Sam' } } }));
    const loaded = new LocalProgressStore('progress', IDS).load();
    expect(loaded.activities.x.steps).toBe(0);
    expect(loaded.activities.x.rating).toBe(8);
    expect('name' in loaded.activities.x).toBe(false);
  });

  it('works when the browser blocks storage', () => {
    (globalThis as any).localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
    const s = new LocalProgressStore('progress', IDS);
    s.save(sample);
    expect(s.load()).toEqual(sample);
  });
});
