import { Stamp } from '../shared/fun/Stamp';
import { stampsFor } from '../shared/fun/stampDefs';
import { countStamps } from '../shared/progress/stamps';
import { Progress } from '../shared/progress/types';
import { ACTIVITIES } from './registry';

export function StampBook(props: { progress: Progress; enabled: Record<string, boolean>; teacher: boolean }) {
  const acts = ACTIVITIES.filter((a) => a.load && a.goal && (props.enabled[a.id] || props.teacher));
  const total = acts.length * 3;
  const earned = acts.reduce((n, a) => n + countStamps(props.progress.activities[a.id]?.stamps ?? 0), 0);
  return (
    <div class="stack">
      <section class="hero">
        <h1>My stamp book</h1>
        <p>
          You have <strong>{earned} of {total}</strong> stamps. Each activity has three: one for its game, one for getting every Check it question right on
          the first try, and one for finishing all four steps.
        </p>
        <p class="small muted">Stamps are just for you. Nobody else sees them, and they are never taken away. They travel with your progress code.</p>
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
              {stampsFor(a.goal!).map((d) => {
                const has = (stamps & d.flag) !== 0;
                return (
                  <li key={d.flag} class="stamp-slot">
                    <Stamp icon={d.icon} earned={has} />
                    <div>
                      <p style={{ margin: 0 }}>
                        <strong>{d.name}</strong>
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
