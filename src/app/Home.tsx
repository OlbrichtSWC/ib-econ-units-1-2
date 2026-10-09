import { CodeBadge, HlBadge, MarkIcon } from '../shared/design/components';
import { DEFAULT_LEVELS } from '../shared/activity/mastery';
import { Stamp } from '../shared/fun/Stamp';
import { stampsFor } from '../shared/fun/stampDefs';
import { countStamps, totalStamps } from '../shared/progress/stamps';
import { titleFor } from '../shared/fun/titles';
import { Progress, STEP } from '../shared/progress/types';
import { ACTIVITIES, SUBTOPICS, UNITS } from './registry';

/** A big picture for each game's card. Decoration only: the title says what it is. */
const ICONS: Record<string, string> = {
  'ppc-explorer': '🏝️', 'island-economy': '🛶', 'circular-flow': '💸', 'positive-normative': '🔬',
  'market-shock': '📈', 'surplus-shader': '🎨', 'bias-lab': '🧠', 'elasticity-cafe': '☕', 'ped-line': '📏',
  'hints-yed': '🛒', 'supply-speed': '🚚', 'gov-toolkit': '🏛️', 'externality-fixer': '🌤️', 'fish-pond': '🐟',
  'streetlight-fund': '💡', 'used-car-lot': '🚗', 'monopoly-game': '🎲', 'fair-efficient': '⚖️',
};

function stepsDone(steps: number) {
  return [STEP.learn, STEP.try, STEP.check, STEP.rated].filter((f) => steps & f).length;
}

export function Home(props: { progress: Progress; enabled: Record<string, boolean>; teacher: boolean; showHl: boolean }) {
  const allowed = ACTIVITIES.filter((a) => props.teacher || ((props.showHl || a.hl !== 'all') && (props.enabled[a.id] || !a.load)));
  // Activities not built yet are folded into one line at the end, so the page shows only what can be played.
  const visible = allowed.filter((a) => a.load);
  const later = allowed.filter((a) => !a.load);
  const withStamps = visible.filter((a) => a.goal);
  const stampMax = withStamps.reduce((n, a) => n + stampsFor(a).length, 0);
  const allStamps = totalStamps(props.progress);
  const stampTotal = withStamps.reduce((n, a) => n + countStamps(props.progress.activities[a.id]?.stamps ?? 0), 0);
  return (
    <div class="stack">
      <section class="hero">
        <div class="hero-icons" aria-hidden="true">
          <span style={{ right: '6%', top: '12%' }}>📈</span>
          <span style={{ right: '20%', top: '48%' }}>🐟</span>
          <span style={{ right: '4%', bottom: '10%' }}>☕</span>
          <span style={{ right: '30%', top: '8%' }}>⚖️</span>
          <span style={{ right: '14%', bottom: '4%' }}>🏝️</span>
        </div>
        <h1>
          Learn economics by <span class="hl-word">playing</span> with it
        </h1>
        <p>
          Each game has four steps: <strong>Learn it</strong>, <strong>Try it</strong>, <strong>Check it</strong> and <strong>Self-rate</strong>. There are no timers and
          no leaderboards. Your progress saves in this browser only.
        </p>
        <div class="hero-stats">
          <span class="hero-stat">{visible.length} games</span>
          <span class="hero-stat">
            {stampTotal} of {stampMax} stamps collected
          </span>
          <a class="hero-stat" href="#/stamps">
            <span aria-hidden="true">{titleFor(allStamps).icon}</span> {titleFor(allStamps).name}
          </a>
        </div>
        <div class="row">
          <a class="btn hero-go" href={`#unit-${UNITS[0].unit}`} onClick={(e) => { e.preventDefault(); const h = document.getElementById(`unit-${UNITS[0].unit}`); h?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); h?.focus({ preventScroll: true }); }}>
            Pick a game
          </a>
          <span class="small">
            Switching devices? Use <a href="#/progress">My progress</a> to get your progress code.
          </span>
        </div>
      </section>

      {UNITS.map((u) => (
        <section key={u.unit} aria-labelledby={`unit-${u.unit}`} class={`stack unit-${u.unit}`}>
          <div>
            <h2 id={`unit-${u.unit}`} class="unit-title" tabIndex={-1}>{u.title}</h2>
          </div>
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
                        {ICONS[a.id] && <span class="game-icon" aria-hidden="true">{ICONS[a.id]}</span>}
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
                            {a.goal && (
                              <span class="mini-stamps" aria-label={`${countStamps(p?.stamps ?? 0)} of ${stampsFor(a).length} stamps`} role="img">
                                {stampsFor(a).map((d) => (
                                  <Stamp key={d.flag} icon={d.icon} level={d.level} earned={((p?.stamps ?? 0) & d.flag) !== 0} size={26} />
                                ))}
                              </span>
                            )}
                            {props.teacher && !props.enabled[a.id] && <span class="badge badge-soon">Hidden from students</span>}
                            <span class="play-chip" aria-hidden="true">{n > 0 ? 'Continue' : 'Play'} ▶</span>
                          </div>
                        ) : (
                          <span class="badge badge-soon">{a.load ? 'Not open yet' : 'Coming in a later version'}</span>
                        )}
                      </>
                    );
                    return open ? (
                      <a key={a.id} class="card card-link game-card" href={`#/a/${a.id}/learn`}>
                        {body}
                      </a>
                    ) : (
                      <div key={a.id} class="card card-muted game-card" aria-disabled="true">
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

      {later.length > 0 && (
        <details class="card coming-later">
          <summary>
            <strong>Coming later:</strong> {later.length} more activities for Units 1 and 2
          </summary>
          <ul class="small" style={{ marginTop: 8 }}>
            {later.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong> ({a.tag}{a.hl === 'all' ? ', HL' : ''}). {a.blurb}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
