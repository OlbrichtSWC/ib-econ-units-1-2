/** Teacher settings from public/config/settings.json. */
import { loadJson } from '../shared/content/loader';
import { DEFAULT_LEVELS } from '../shared/activity/mastery';
import type { ScaleLevel } from '../shared/activity/SelfRate';

export interface Settings {
  /** Unlocks the teacher view. Keeps answers out of casual view only: anyone could read this file. */
  teacherPasscode: string;
  /** Show HL-only questions and activities to everyone (labelled HL). */
  showHlContent: boolean;
  /** true = students can open it; false = hidden until you release it. Missing = on. */
  modules: Record<string, boolean>;
  scale: { name: string; levels: ScaleLevel[] };
}

export const DEFAULT_SETTINGS: Settings = {
  teacherPasscode: 'change-me',
  showHlContent: true,
  modules: {},
  scale: { name: 'Proficiency scale', levels: DEFAULT_LEVELS },
};

export async function loadSettings(): Promise<Settings> {
  try {
    const s = await loadJson<Partial<Settings>>('config/settings.json');
    return {
      ...DEFAULT_SETTINGS,
      ...s,
      modules: { ...(s.modules ?? {}) },
      scale: s.scale?.levels?.length === 8 ? s.scale : DEFAULT_SETTINGS.scale,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
