/**
 * The frame every activity sits in: header, the four step tabs, and progress saving.
 * The activity itself only provides its Try it game (and optionally a Learn it diagram).
 */
import { useEffect, useState } from 'preact/hooks';
import { loadJson } from '../content/loader';
import { Md } from '../content/markdown';
import { CodeBadge, HlBadge, MarkIcon, StepNo } from '../design/components';
import { ActivityProgress, STEP } from '../progress/types';
import { CheckIt } from './CheckIt';
import { ExplainBox } from './ExplainBox';
import type { Evidence } from './mastery';
import { ScaleLevel, SelfRate } from './SelfRate';
import type { ActivityContent, ActivityMeta, ActivityModule } from './types';

export type StepName = 'learn' | 'try' | 'check' | 'rate';
const STEPS: { key: StepName; label: string; flag: number }[] = [
  { key: 'learn', label: 'Learn it', flag: STEP.learn },
  { key: 'try', label: 'Try it', flag: STEP.try },
  { key: 'check', label: 'Check it', flag: STEP.check },
  { key: 'rate', label: 'Self-rate', flag: STEP.rated },
];

export interface ShellProps {
  meta: ActivityMeta;
  contentPath: string;
  step: StepName;
  onStep: (s: StepName) => void;
  progress: ActivityProgress | undefined;
  /** Merge a change into this activity's saved progress. */
  onProgress: (patch: Partial<ActivityProgress>, addSteps?: number, sharp?: boolean) => void;
  /** The student reached the goal of a Try it game level (1, 2 or 3). */
  onGoal: (level?: number) => void;
  teacher: boolean;
  showHl: boolean;
  scale: { name: string; levels: ScaleLevel[] };
}

export function ActivityShell(props: ShellProps) {
  const { meta } = props;
  const [content, setContent] = useState<ActivityContent | null>(null);
  const [mod, setMod] = useState<ActivityModule | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setContent(null);
    setMod(null);
    Promise.all([loadJson<ActivityContent>(props.contentPath), meta.load ? meta.load() : Promise.reject(new Error('not built'))])
      .then(([c, m]) => {
        setContent(c);
        setMod(m);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, [meta.id]);

  const steps = props.progress?.steps ?? 0;
  const evidence: Evidence | null = props.progress && props.progress.total > 0 ? props.progress : null;

  useEffect(() => {
    document.getElementById('activity-panel')?.focus({ preventScroll: true });
  }, [props.step]);

  if (error) return <div class="callout callout-red">Sorry, this activity could not load. Check your internet connection and refresh. ({error})</div>;
  if (!content || !mod) return <p aria-busy="true">Loading…</p>;

  const idx = STEPS.findIndex((s) => s.key === props.step);
  const goNext = () => idx < STEPS.length - 1 && props.onStep(STEPS[idx + 1].key);

  return (
    <article class="activity stack">
      <header class="stack" >
        <div class="row" style={{ gap: 8 }}>
          <CodeBadge code={meta.tag} />
          {meta.hl === 'all' && <HlBadge />}
          {meta.hl === 'part' && <span class="badge badge-hl">Includes HL</span>}
          <span class="badge badge-soon">{meta.style}</span>
        </div>
        <h1>{meta.title}</h1>
      </header>

      <div class="tabs" role="tablist" aria-label="Activity steps">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            role="tab"
            id={`tab-${s.key}`}
            class="tab"
            aria-selected={props.step === s.key}
            aria-controls="activity-panel"
            tabIndex={props.step === s.key ? 0 : -1}
            onClick={() => props.onStep(s.key)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const n = (i + (e.key === 'ArrowRight' ? 1 : STEPS.length - 1)) % STEPS.length;
                props.onStep(STEPS[n].key);
                document.getElementById(`tab-${STEPS[n].key}`)?.focus();
              }
            }}
          >
            <span class={`step-num ${steps & s.flag ? 'done' : ''}`} aria-hidden="true">
              {steps & s.flag ? <MarkIcon size={14} /> : i + 1}
            </span>
            {s.label}
            {steps & s.flag ? <span class="sr-only">(done)</span> : null}
          </button>
        ))}
      </div>

      <section id="activity-panel" role="tabpanel" aria-labelledby={`tab-${props.step}`} tabIndex={-1} class="stack" style={{ outline: 'none' }}>
        {props.step === 'learn' && (
          <div class="learn-grid">
            <div class="stack">
              <Md text={content.learn.text} />
              {props.teacher && content.teacherNotes && (
                <div class="callout callout-red">
                  <p><strong>Teacher notes</strong></p>
                  <Md text={content.teacherNotes} />
                </div>
              )}
              <div>
                <button
                  class="btn"
                  onClick={() => {
                    props.onProgress({}, STEP.learn);
                    goNext();
                  }}
                >
                  Next: Try it
                </button>
              </div>
            </div>
            {mod.LearnDiagram && (
              <figure style={{ margin: 0 }}>
                <mod.LearnDiagram content={content} />
                {content.learn.caption && <figcaption class="small muted">{content.learn.caption}</figcaption>}
              </figure>
            )}
          </div>
        )}

        {props.step === 'try' && (
          <div class="stack">
            {typeof content.try.goal === 'string' ? (
              <div class="callout stack">
                <p style={{ margin: 0 }}>
                  <strong>Your goal:</strong> <Md text={content.try.goal} inline />
                </p>
                <p class="small" style={{ margin: 0 }}>
                  Follow the numbered steps in order: <StepNo n={1} /> first, then <StepNo n={2} />, and so on.
                </p>
                <details class="how-to-play">
                  <summary>How to play</summary>
                  <Md text={content.try.intro} />
                </details>
              </div>
            ) : (
              <div class="callout">
                <Md text={content.try.intro} />
              </div>
            )}
            <mod.Try
              content={content}
              teacher={props.teacher}
              stamps={props.progress?.stamps ?? 0}
              onComplete={() => props.onProgress({}, STEP.try)}
              onGoal={props.onGoal}
            />
            {content.explain && (
              <ExplainBox activityId={meta.id} prompt={content.explain.prompt} frames={content.explain.frames} checklist={content.explain.checklist} />
            )}
            <div>
              <button
                class="btn"
                onClick={() => {
                  props.onProgress({}, STEP.try);
                  goNext();
                }}
              >
                Next: Check it
              </button>
            </div>
          </div>
        )}

        {props.step === 'check' && (
          <CheckIt
            questions={content.check}
            teacher={props.teacher}
            showHl={props.showHl}
            onFinish={(e, sharp) => props.onProgress({ ...e }, STEP.check, sharp)}
          />
        )}

        {props.step === 'rate' && (
          <SelfRate
            outcome={content.outcome}
            levels={props.scale.levels}
            scaleName={props.scale.name}
            evidence={evidence}
            rating={props.progress?.rating ?? 0}
            onRate={(level) => props.onProgress({ rating: level }, STEP.rated)}
          />
        )}
      </section>
    </article>
  );
}
