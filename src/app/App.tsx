import { useEffect, useMemo, useState } from 'preact/hooks';
import { ActivityShell, StepName } from '../shared/activity/ActivityShell';
import { GlossaryProvider } from '../shared/content/Glossary';
import { loadJson } from '../shared/content/loader';
import { celebrate } from '../shared/fun/celebrate';
import { CelebrationLayer } from '../shared/fun/CelebrationLayer';
import { play } from '../shared/fun/sound';
import { SoundToggle } from '../shared/fun/SoundToggle';
import { stampsFor } from '../shared/fun/stampDefs';
import { StampToast } from '../shared/fun/StampToast';
import { LocalProgressStore } from '../shared/progress/localStore';
import { autoStamps, levelFlag, newStampFlags } from '../shared/progress/stamps';
import { emptyActivity, Progress, STEP, today } from '../shared/progress/types';
import { GlossaryPage } from './GlossaryPage';
import { Home } from './Home';
import { ProgressPage } from './ProgressPage';
import { StampBook } from './StampBook';
import { ACTIVITIES, findActivity, PROGRESS_ID_TABLE } from './registry';
import { DEFAULT_SETTINGS, loadSettings, Settings } from './settings';
import { TeacherPage } from './TeacherPage';
import { ClassLinkPage } from './ClassLinkPage';
import { classDecides, ClassSettings, loadClassSettings, saveClassSettings } from './classLink';

export const store = new LocalProgressStore('ib-econ-1-2.progress', PROGRESS_ID_TABLE);

function readHash() {
  return location.hash.replace(/^#\/?/, '');
}

function session(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function setSession(key: string, v: string | null) {
  try {
    if (v === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, v);
  } catch {
    /* ignore */
  }
}

export function App() {
  const [route, setRoute] = useState(readHash());
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<Progress>(store.load());
  const [toasts, setToasts] = useState<{ activityId: string; flag: number }[]>([]);
  const [teacher, setTeacher] = useState(session('teacher') === '1');
  const [projector, setProjector] = useState(session('projector') === '1');
  /** Activities and HL choice from a teacher's class link, saved on this device. */
  const [classSettings, setClassSettings] = useState<ClassSettings | null>(() => loadClassSettings());
  const [preview, setPreview] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('ib-econ-1-2.teacher-modules') ?? '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    loadSettings().then(setSettings);
    // Fetch every activity's content once, so the offline cache has it all after the first visit.
    const warm = () => ACTIVITIES.filter((a) => a.load).forEach((a) => loadJson(`content/activities/${a.id}.json`).catch(() => undefined));
    setTimeout(warm, 1500);
    const onHash = () => {
      setRoute(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    const unsub = store.subscribe(setProgress);
    return () => {
      window.removeEventListener('hashchange', onHash);
      unsub();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('projector', projector);
    setSession('projector', projector ? '1' : null);
  }, [projector]);

  /** Modules students can see: settings file, plus the teacher's local preview when in teacher view. */
  const enabled = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const a of ACTIVITIES) {
      // A class link from the teacher overrides the settings file on this device.
      const base = classSettings && classDecides(classSettings, a.id) ? classSettings.modules[a.id] : settings.modules[a.id] !== false;
      m[a.id] = teacher && a.id in preview ? preview[a.id] : base;
    }
    return m;
  }, [settings, teacher, preview, classSettings]);
  const showHl = classSettings ? classSettings.showHl : settings.showHlContent;

  const updateActivity = (id: string, patch: Partial<Progress['activities'][string]>, addSteps = 0, addStamps = 0, sharp = false) => {
    const current = store.load();
    const prev = current.activities[id] ?? emptyActivity();
    const next = { ...prev, ...patch, steps: prev.steps | addSteps, stamps: (prev.stamps ?? 0) | addStamps, updated: today() };
    next.stamps = autoStamps(next, (addSteps & STEP.check) !== 0 && patch.total !== undefined, sharp);
    const fresh = newStampFlags(prev.stamps ?? 0, next.stamps);
    // Nothing new to save (for example, a goal stamp already earned): keep the saved date as it is.
    if (!fresh.length && next.steps === prev.steps && !Object.keys(patch).length && current.activities[id]) return;
    store.save({ activities: { ...current.activities, [id]: next } });
    if (fresh.length) {
      setToasts((t) => [...t, ...fresh.map((flag) => ({ activityId: id, flag }))]);
      // Let a "correct" sound finish before the stamp lands.
      setTimeout(() => {
        play('stamp');
        celebrate({ size: 'big' });
      }, 350);
    }
  };

  const parts = route.split('/');
  let page;
  if (parts[0] === 'a' && parts[1]) {
    const meta = findActivity(parts[1]);
    if (!meta || !meta.load || (!enabled[meta.id] && !teacher)) {
      page = (
        <div class="callout callout-try">
          <p>This activity is not open yet. Your teacher will release it when your class reaches this topic.</p>
          <a href="#/">Back to all activities</a>
        </div>
      );
    } else {
      const step = (['learn', 'try', 'check', 'rate'].includes(parts[2]) ? parts[2] : 'learn') as StepName;
      page = (
        <ActivityShell
          key={meta.id}
          meta={meta}
          contentPath={`content/activities/${meta.id}.json`}
          step={step}
          onStep={(s) => (location.hash = `#/a/${meta.id}/${s}`)}
          progress={progress.activities[meta.id]}
          onProgress={(patch, add, sharp) => updateActivity(meta.id, patch, add, 0, sharp)}
          onGoal={(level = 1) => updateActivity(meta.id, {}, STEP.try, levelFlag(level))}
          teacher={teacher}
          showHl={showHl || teacher}
          scale={settings.scale}
        />
      );
    }
  } else if (parts[0] === 'progress') {
    page = <ProgressPage store={store} progress={progress} settings={settings} initialCode={parts[1] === 'load' ? decodeURIComponent(parts[2] ?? '') : ''} />;
  } else if (parts[0] === 'stamps') {
    page = <StampBook progress={progress} enabled={enabled} teacher={teacher} />;
  } else if (parts[0] === 'glossary') {
    page = <GlossaryPage />;
  } else if (parts[0] === 'class' && parts[1]) {
    page = (
      <ClassLinkPage
        code={decodeURIComponent(parts[1])}
        current={classSettings}
        onSave={(c) => {
          setClassSettings(c);
          saveClassSettings(c);
        }}
      />
    );
  } else if (parts[0] === 'teacher') {
    page = (
      <TeacherPage
        settings={settings}
        unlocked={teacher}
        onUnlock={(ok) => {
          setTeacher(ok);
          setSession('teacher', ok ? '1' : null);
          if (!ok) setProjector(false);
        }}
        projector={projector}
        onProjector={setProjector}
        enabled={enabled}
        showHl={showHl}
        classSettings={classSettings}
        onClearClass={() => {
          setClassSettings(null);
          saveClassSettings(null);
        }}
        preview={preview}
        onPreview={(p) => {
          setPreview(p);
          try {
            localStorage.setItem('ib-econ-1-2.teacher-modules', JSON.stringify(p));
          } catch {
            /* ignore */
          }
        }}
      />
    );
  } else {
    page = <Home progress={progress} enabled={enabled} teacher={teacher} showHl={showHl} />;
  }

  return (
    <GlossaryProvider path="content/glossary.json">
      <a class="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to main content
      </a>
      <header class="topbar no-print">
        <div class="wrap row" style={{ justifyContent: 'space-between' }}>
          <a href="#/" class="brand">
            <span class="brand-mark" aria-hidden="true">IB</span>
            <span>
              <span class="brand-title">Economics</span>
              <span class="brand-sub">Units 1 and 2</span>
            </span>
          </a>
          <nav aria-label="Main" class="row" style={{ gap: 4 }}>
            <a class="navlink" href="#/" aria-current={route === '' ? 'page' : undefined}>Activities</a>
            <a class="navlink" href="#/glossary" aria-current={route === 'glossary' ? 'page' : undefined}>Glossary</a>
            <a class="navlink" href="#/stamps" aria-current={route === 'stamps' ? 'page' : undefined}>Stamps</a>
            <a class="navlink" href="#/progress" aria-current={route.startsWith('progress') ? 'page' : undefined}>My progress</a>
            <a class="navlink" href="#/teacher" aria-current={route === 'teacher' ? 'page' : undefined}>{teacher ? 'Teacher (on)' : 'Teacher'}</a>
            <SoundToggle class="btn-sound" />
          </nav>
        </div>
      </header>
      {teacher && (
        <div class="teacher-bar no-print" role="status">
          <div class="wrap">Teacher view is on: answers are shown and hidden activities are visible on this device.</div>
        </div>
      )}
      <main id="main" tabIndex={-1} class="wrap" style={{ outline: 'none', paddingTop: 20, paddingBottom: 48 }}>
        {page}
      </main>
      <CelebrationLayer />
      {toasts.length > 0 && (() => {
        const t = toasts[0];
        const meta = findActivity(t.activityId);
        const def = meta?.goal ? stampsFor(meta).find((d) => d.flag === t.flag) : undefined;
        if (!meta || !def) {
          setTimeout(() => setToasts((all) => all.slice(1)), 0);
          return null;
        }
        return (
          <StampToast
            key={`${t.activityId}-${t.flag}`}
            name={def.name}
            icon={def.icon}
            level={def.level}
            activity={meta.title}
            bookHref="#/stamps"
            onClose={() => setToasts((all) => all.slice(1))}
          />
        );
      })()}
      <footer class="wrap small muted no-print" style={{ paddingBottom: 24 }}>
        Made for IB Economics students. No accounts, no tracking: your progress stays in this browser.
      </footer>
    </GlossaryProvider>
  );
}
