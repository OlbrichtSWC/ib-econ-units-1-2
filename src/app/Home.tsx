import { CodeBadge, HlBadge, MarkIcon } from '../shared/design/components';
import { DEFAULT_LEVELS } from '../shared/activity/mastery';
import { Progress, STEP } from '../shared/progress/types';
import { ACTIVITIES, SUBTOPICS, UNITS } from './registry';

function stepsDone(steps: number) {
  return [STEP.learn, STEP.try, STEP.check, STEP.rated].filter((f) => steps & f).length;
}

export function Home(props: { progress: Progress; enabled: Record<string, boolean>; teacher: boolean; showHl: boolean }) {
  const visible = ACTIVITIES.filter((a) => props.teacher || ((props.showHl || a.hl !== 'all') && (props.enabled[a.id] || !a.load)));
  return (
    <div class="stack">
      <section class="hero">
        <h1>Learn economics by playing with it</h1>
        <p>
          Each activity has four steps: <strong>Learn it</strong>, <strong>Try it</strong>, <strong>Check it</strong> and <strong>Self-rate</strong>. There are no timers and
          no leaderboards. Your progress saves in this browser only.
        </p>
        <p class="small">
          Switching devices? Use <a href="#/progress">My progress</a> to get your progress code.
        </p>
      </section>

      {UNITS.map((u) => (
        <section key={u.unit} aria-labelledby={`unit-${u.unit}`} class="stack">
          <h2 id={`unit-${u.unit}`} class="unit-title">{u.title}</h2>
          {SUBTOPICS.filter((s) => s.unit === u.unit).map((s) => {
            const acts = visible.filter((a) => a.code === s.code);
            if (!acts.length) return null;
            return (
              <div key={s.code} class="subtopic">
                <h3>
                  {s.code} {s.title} {s.hl && <HlBadge />}
                </h3>
                <div class="grid">
                  {acts.map((a) => {
                    const p = props.progress.activities[a.id];
                    const n = p ? stepsDone(p.steps) : 0;
                    const open = !!a.load && (props.enabled[a.id] || props.teacher);
                    const body = (
                      <>
                        <div class="row" style={{ gap: 6, marginBottom: 8 }}>
                          <CodeBadge code={a.tag} />
                          {a.hl === 'all' && <HlBadge />}
                          {a.hl === 'part' && <span class="badge badge-hl">Includes HL</span>}
                        </div>
                        <h3>{a.title}</h3>
                        <p class="small muted" style={{ marginBottom: 6 }}>{a.style}</p>
                        <p class="small">{a.blurb}</p>
                        {open ? (
                          <div class="card-foot">
                            <span class="steps-meter" aria-label={`${n} of 4 steps done`}>
                              {[0, 1, 2, 3].map((i) => (
                                <span key={i} class={`pip ${i < n ? 'on' : ''}`} aria-hidden="true" />
                              ))}
                            </span>
                            <span class="small">
                              {n === 4 ? (
                                <span class="badge badge-done">
                                  <MarkIcon size={14} /> Done
                                </span>
                              ) : (
                                `${n} of 4 steps`
                              )}
                            </span>
                            {p && p.rating > 0 && <span class="small muted">Self-rating: {DEFAULT_LEVELS[p.rating - 1]?.name}</span>}
                            {props.teacher && !props.enabled[a.id] && <span class="badge badge-soon">Hidden from students</span>}
                          </div>
                        ) : (
                          <span class="badge badge-soon">{a.load ? 'Not open yet' : 'Coming in a later version'}</span>
                        )}
                      </>
                    );
                    return open ? (
                      <a key={a.id} class="card card-link" href={`#/a/${a.id}/learn`}>
                        {body}
                      </a>
                    ) : (
                      <div key={a.id} class="card card-muted" aria-disabled="true">
                        {body}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
