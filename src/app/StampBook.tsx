import { Stamp } from '../shared/fun/Stamp';
import { stampsFor } from '../shared/fun/stampDefs';
import { countStamps, totalStamps } from '../shared/progress/stamps';
import { Progress } from '../shared/progress/types';
import { ACTIVITIES } from './registry';
import { nextTitle, titleFor, TITLES, towardNext } from '../shared/fun/titles';

export function StampBook(props: { progress: Progress; enabled: Record<string, boolean>; teacher: boolean }) {
  const acts = ACTIVITIES.filter((a) => a.load && a.goal && (props.enabled[a.id] || props.teacher));
  const total = acts.reduce((n, a) => n + stampsFor(a).length, 0);
  const earned = acts.reduce((n, a) => n + countStamps(props.progress.activities[a.id]?.stamps ?? 0), 0);
  // Titles count every stamp the student has, in any game.
  const all = totalStamps(props.progress);
  const title = titleFor(all);
  const next = nextTitle(all);
  return (
    <div class="stack">
      <section class="hero">
        <h1>My stamp book</h1>
        <p class="book-title">
          <span class="book-title-icon" aria-hidden="true">{title.icon}</span>
          <span>
            Your title: <strong>{title.name}</strong>
            <span class="small" style={{ display: 'block' }}>
              {next ? `${next.at - all} more ${next.at - all === 1 ? 'stamp' : 'stamps'} to ${next.name}` : 'You reached the top title!'}
            </span>
          </span>
        </p>
        <div class="book-bar" role="img" aria-label={`${earned} of ${total} stamps collected`}>
          <span style={{ width: `${total ? Math.round((earned / total) * 100) : 0}%` }} />
          <b>{earned} of {total} stamps</b>
        </div>
        <p>
          Each game has five stamps: one for each of its three levels, one for getting every Check it question right on the first try, and one for
          finishing all four steps.
        </p>
        <p class="small">Stamps and titles are just for you. Nobody else sees them, and they are never taken away. They travel with your progress code.</p>
      </section>
      <section class="card" aria-labelledby="titles-h">
        <h2 id="titles-h" style={{ marginBottom: 10 }}>Economist titles</h2>
        <ol class="title-ladder">
          {TITLES.map((t) => {
            const got = all >= t.at;
            return (
              <li key={t.name} class={`${got ? 'got' : ''} ${t.name === title.name ? 'now' : ''}`}>
                <span class="tl-icon" aria-hidden="true">{got ? t.icon : '🔒'}</span>
                <strong>{t.name}</strong>
                <span class="small">{t.at === 0 ? 'Start here' : `${t.at} ${t.at === 1 ? 'stamp' : 'stamps'}`}{got ? ' (reached)' : ''}</span>
              </li>
            );
          })}
        </ol>
        {next && (
          <div class="ceremony-bar" role="img" aria-label={`Progress to ${next.name}`} style={{ marginTop: 12 }}>
            <span style={{ width: `${Math.round(towardNext(all) * 100)}%` }} />
          </div>
        )}
      </section>
      {acts.map((a) => {
        const stamps = props.progress.activities[a.id]?.stamps ?? 0;
        return (
          <section key={a.id} class="card stack" aria-labelledby={`sb-${a.id}`}>
            <div class="row" style={{ justifyContent: 'space-between' }}>
              <h2 id={`sb-${a.id}`} style={{ margin: 0 }}>{a.title}</h2>
              <a href={`#/a/${a.id}/learn`}>Open activity</a>
            </div>
            <ul class="stamp-row">
              {stampsFor(a).map((d) => {
                const has = (stamps & d.flag) !== 0;
                return (
                  <li key={d.flag} class={`stamp-slot ${has ? 'has' : ''}`}>
                    <Stamp icon={d.icon} level={d.level} earned={has} />
                    <div>
                      <p style={{ margin: 0 }}>
                        <strong>{d.name}</strong>{d.level ? <span class="small muted"> (Level {d.level})</span> : null}
                      </p>
                      <p class="small" style={{ margin: 0 }}>
                        {has ? <span class="badge badge-done">Earned</span> : <span class="muted">Not yet. {d.how}</span>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
