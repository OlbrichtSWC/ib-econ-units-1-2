/**
 * Class mode: the teacher puts Market Shock on the projector. Teams discuss each event card and
 * hold up their answer; the teacher taps each team's choice, then reveals the answer.
 *
 * Every right team answer adds to ONE shared class score, so teams help the whole class rather
 * than compete. There is no team ranking, no timer, and nothing is saved.
 */
import { useMemo, useState } from 'preact/hooks';
import { equilibrium, Line, Pt } from '../../econ/calc';
import { Md } from '../../shared/content/markdown';
import { CrossIcon, LiveRegion, MarkIcon } from '../../shared/design/components';
import { Arrow, Curve, Diagram, Dot, Guide } from '../../shared/diagrams/Diagram';
import { celebrate } from '../../shared/fun/celebrate';
import { play } from '../../shared/fun/sound';
import { Answer, BASE_D, BASE_S, buildDeck, parseShift, segment, shiftedMarket, SHIFT_SIZE, X_MAX, Y_MAX } from './model';

export interface ClassCard {
  id: string;
  title: string;
  text: string;
  answer: Answer;
  explain: string;
  /** Trap cards ask about one curve only. */
  question?: string;
}

/** Cards in one class round. */
export const CLASS_ROUND = 8;
export const MAX_TEAMS = 6;

/** Adds the right answers in one card's votes to the class score. Missing votes count as not right. */
export function classPoints(votes: (Answer | null)[], answer: Answer): number {
  return votes.filter((v) => v === answer).length;
}

const seg = (l: Line) => segment(l) as Pt[];

function RevealDiagram({ answer }: { answer: Answer }) {
  const e1 = equilibrium(BASE_D, BASE_S);
  if (answer === 'none') {
    return (
      <Diagram xMax={X_MAX} yMax={Y_MAX} xLabel="Quantity" yLabel="Price ($)" title="No shift: both curves stay where they are" description="Demand and supply do not move. A change in the good's own price is a movement along a curve.">
        <Curve points={seg(BASE_S)} label="S" tone="green" />
        <Curve points={seg(BASE_D)} label="D" tone="navy" />
        <Dot at={e1} />
      </Diagram>
    );
  }
  const { side, dir } = parseShift(answer);
  const dq = dir === 'right' ? SHIFT_SIZE : -SHIFT_SIZE;
  const m = shiftedMarket(side, dq);
  const e2 = equilibrium(m.demand, m.supply);
  const moved = side === 'demand' ? m.demand : m.supply;
  const was = side === 'demand' ? BASE_D : BASE_S;
  const name = side === 'demand' ? 'D' : 'S';
  const tone = side === 'demand' ? 'navy' : 'green';
  const ay = side === 'demand' ? 2.4 : 7.6;
  const from = { q: (side === 'demand' ? 86 : 76) + (dir === 'left' ? 0 : -6), p: ay };
  return (
    <Diagram
      xMax={X_MAX}
      yMax={Y_MAX}
      xLabel="Quantity"
      yLabel="Price ($)"
      title={`${side === 'demand' ? 'Demand' : 'Supply'} shifts ${dir}`}
      description={`${side === 'demand' ? 'Demand' : 'Supply'} shifts ${dir} from ${name}₁ to ${name}₂. Equilibrium moves from $${e1.p.toFixed(2)} and ${e1.q} bags to $${e2.p.toFixed(2)} and ${e2.q} bags.`}
    >
      <Guide at={e1} xText="Q₁" yText="P₁" />
      <Guide at={e2} xText="Q₂" yText="P₂" />
      {side === 'demand' ? <Curve points={seg(BASE_S)} label="S" tone="green" /> : <Curve points={seg(BASE_D)} label="D" tone="navy" />}
      <Curve points={seg(was)} label={`${name}₁`} tone={tone} ghost />
      <Curve points={seg(moved)} label={`${name}₂`} tone={tone} />
      <Arrow from={from} to={{ q: from.q + (dir === 'right' ? 16 : -16), p: ay }} tone="red" />
      <Dot at={e1} />
      <Dot at={e2} tone="red" />
    </Diagram>
  );
}

export function ClassMode(props: { cards: ClassCard[]; traps: ClassCard[]; options: { id: Answer; text: string }[] }) {
  const [teams, setTeams] = useState<string[] | null>(null);
  const [draftTeams, setDraftTeams] = useState(['Team 1', 'Team 2', 'Team 3', 'Team 4']);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100));
  const [index, setIndex] = useState(0);
  const [votes, setVotes] = useState<(Answer | null)[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [possible, setPossible] = useState(0);
  const [announce, setAnnounce] = useState('');

  const byId = useMemo(() => new Map([...props.cards, ...props.traps].map((c) => [c.id, c])), [props.cards, props.traps]);
  const deck = useMemo(
    () => buildDeck(props.cards.map((c) => c.id), props.traps.map((c) => c.id), true, seed).slice(0, CLASS_ROUND),
    [props.cards, props.traps, seed],
  );

  const start = () => {
    const names = draftTeams.map((n, i) => n.trim() || `Team ${i + 1}`);
    setTeams(names);
    setIndex(0);
    setVotes(names.map(() => null));
    setRevealed(false);
    setScore(0);
    setPossible(0);
    setAnnounce('Class mode started. Read the first card.');
  };

  if (!teams) {
    return (
      <section class="panel stack" aria-labelledby="class-h">
        <h3 id="class-h">Class mode (for the projector)</h3>
        <p>
          Teams discuss each event card and hold up their answer. You tap each team's answer, then reveal. Every right answer adds to <strong>one class score</strong>. There is no
          ranking of teams and nothing is saved.
        </p>
        <div class="stack">
          {draftTeams.map((n, i) => (
            <div key={i} class="row">
              <label for={`team-${i}`}>Team {i + 1} name</label>
              <input id={`team-${i}`} type="text" maxLength={24} value={n} onInput={(e) => setDraftTeams(draftTeams.map((x, j) => (j === i ? (e.target as HTMLInputElement).value : x)))} />
            </div>
          ))}
          <div class="row">
            <button class="btn btn-secondary btn-sm" disabled={draftTeams.length >= MAX_TEAMS} onClick={() => setDraftTeams([...draftTeams, `Team ${draftTeams.length + 1}`])}>
              Add a team
            </button>
            <button class="btn btn-secondary btn-sm" disabled={draftTeams.length <= 2} onClick={() => setDraftTeams(draftTeams.slice(0, -1))}>
              Remove a team
            </button>
          </div>
        </div>
        <div>
          <button class="btn" onClick={start}>Start class mode ({CLASS_ROUND} cards)</button>
        </div>
      </section>
    );
  }

  const finished = index >= deck.length;
  if (finished) {
    return (
      <section class="panel stack projector" aria-labelledby="class-end-h">
        <LiveRegion text={announce} />
        <h3 id="class-end-h">Round complete</h3>
        <p class="class-score">
          Class score: <strong>{score}</strong> of {possible}
        </p>
        <p>Every team's right answers counted towards one shared score. Which card caused the most discussion? Ask a team to explain it using the determinant.</p>
        <div class="row">
          <button
            class="btn"
            onClick={() => {
              setSeed(seed + 3);
              start();
            }}
          >
            Play a new round
          </button>
          <button class="btn btn-quiet" onClick={() => setTeams(null)}>Change teams</button>
        </div>
      </section>
    );
  }

  const card = byId.get(deck[index])!;
  const options = props.options;
  const allVoted = votes.every((v) => v !== null);

  const reveal = () => {
    const pts = classPoints(votes, card.answer);
    setScore(score + pts);
    setPossible(possible + teams.length);
    setRevealed(true);
    if (pts === teams.length) {
      play('win');
      celebrate({ size: 'big' });
    } else play(pts > 0 ? 'correct' : 'wrong');
    const right = props.options.find((o) => o.id === card.answer)?.text ?? '';
    setAnnounce(`Answer: ${right}. ${pts} of ${teams.length} teams were right.`);
  };

  return (
    <div class="stack projector">
      <LiveRegion text={announce} />
      <p class="class-score" aria-live="polite">
        Card {index + 1} of {deck.length}. Class score: <strong>{score}</strong> of {possible}
      </p>
      <section class="event-card stack" aria-labelledby="class-card-h">
        <h3 id="class-card-h">{card.title}</h3>
        <Md text={card.text} />
        <p>
          <strong>
            <Md text={card.question ?? 'Which curve shifts, and which way? Or is it a movement along a curve?'} inline />
          </strong>
        </p>
      </section>

      <section class="stack" aria-label="Team answers">
        {teams.map((t, i) => (
          <div key={i} class="team-row" role="group" aria-label={`${t}'s answer`}>
            <strong class="team-name">{t}</strong>
            <div class="row" style={{ gap: 6 }}>
              {options.map((o) => {
                const chosen = votes[i] === o.id;
                const right = revealed && o.id === card.answer;
                return (
                  <button
                    key={o.id}
                    type="button"
                    class={`choice-btn btn-sm ${chosen ? 'chosen' : ''} ${right ? 'choice-right' : ''}`}
                    aria-pressed={chosen}
                    disabled={revealed}
                    onClick={() => setVotes(votes.map((v, j) => (j === i ? o.id : v)))}
                  >
                    {o.text}
                  </button>
                );
              })}
            </div>
            {revealed && (
              <span class="team-result">
                {votes[i] === card.answer ? (
                  <>
                    <MarkIcon /> Right
                  </>
                ) : (
                  <>
                    <CrossIcon /> {votes[i] ? 'Not this time' : 'No answer'}
                  </>
                )}
              </span>
            )}
          </div>
        ))}
      </section>

      {!revealed ? (
        <div class="row">
          <button class="btn" onClick={reveal}>
            Reveal the answer
          </button>
          {!allVoted && <span class="small muted">Some teams have no answer yet. You can still reveal.</span>}
        </div>
      ) : (
        <div class="play">
          <RevealDiagram answer={card.answer} />
          <div class="stack">
            <div class="callout callout-ok">
              <p style={{ margin: 0 }}>
                <strong>Answer: {props.options.find((o) => o.id === card.answer)?.text}</strong>
              </p>
              <Md text={card.explain} />
            </div>
            <p>
              <strong>Talk about it:</strong> ask a team to name the determinant and explain the new equilibrium.
            </p>
            <div>
              <button
                class="btn"
                onClick={() => {
                  setIndex(index + 1);
                  setVotes(teams.map(() => null));
                  setRevealed(false);
                  setAnnounce('Next card.');
                }}
              >
                {index + 1 < deck.length ? 'Next card' : 'See the class score'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
