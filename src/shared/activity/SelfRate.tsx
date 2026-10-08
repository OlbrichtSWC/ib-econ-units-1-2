/**
 * Self-rate: the student rates their own understanding of the outcome.
 * Formative only. The app shows the evidence and a suggested level; the student decides.
 */
import { MarkIcon } from '../design/components';
import { Evidence, suggestLevel } from './mastery';

export interface ScaleLevel {
  name: string;
  group: string;
  description?: string;
}

export function SelfRate(props: {
  outcome: string;
  levels: ScaleLevel[];
  scaleName: string;
  evidence: Evidence | null;
  rating: number;
  onRate: (level: number) => void;
}) {
  const suggestion = props.evidence ? suggestLevel(props.evidence) : null;
  const groups: { group: string; items: { level: number; l: ScaleLevel }[] }[] = [];
  props.levels.forEach((l, i) => {
    let g = groups.find((x) => x.group === l.group);
    if (!g) groups.push((g = { group: l.group, items: [] }));
    g.items.push({ level: i + 1, l });
  });

  return (
    <div class="stack">
      <div class="callout">
        <p>
          <strong>Outcome:</strong> {props.outcome}
        </p>
        <p class="small muted">This rating is for you and your teacher to talk about. It is not a mark.</p>
      </div>

      {props.evidence ? (
        <div class="card">
          <h3>Your evidence from Check it</h3>
          <p>
            {props.evidence.correct} of {props.evidence.total} correct on the first try, {props.evidence.hints}{' '}
            {props.evidence.hints === 1 ? 'hint' : 'hints'} used
            {props.evidence.applyTotal > 0 && `, ${props.evidence.applyCorrect} of ${props.evidence.applyTotal} "apply it" questions on the first try with no more than one hint`}.
          </p>
          {suggestion && (
            <p>
              Your answers suggest about <strong>{props.levels[suggestion - 1]?.name}</strong>. Exemplary needs every "apply it" question right on the first try, with no more than one hint.
            </p>
          )}
        </div>
      ) : (
        <p class="muted">Finish Check it first to see your evidence. You can still rate yourself now.</p>
      )}

      <fieldset class="scale">
        <legend>
          <h3 style={{ margin: 0 }}>Where are you now? ({props.scaleName})</h3>
        </legend>
        <div class="scale-groups">
          {groups.map((g) => (
            <div key={g.group} class="scale-group">
              <div class="scale-group-name">{g.group}</div>
              {g.items[0]?.l.description && <p class="small muted">{g.items[0].l.description}</p>}
              <div class="row" style={{ gap: 8 }}>
                {g.items.map(({ level, l }) => (
                  <button
                    key={level}
                    type="button"
                    class={`btn btn-sm ${props.rating === level ? '' : 'btn-secondary'}`}
                    aria-pressed={props.rating === level}
                    onClick={() => props.onRate(level)}
                  >
                    {props.rating === level && <MarkIcon size={14} />}
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
      {props.rating > 0 && (
        <p role="status" class="callout callout-ok">
          <MarkIcon /> Saved on this device: {props.levels[props.rating - 1]?.name}.
        </p>
      )}
    </div>
  );
}
