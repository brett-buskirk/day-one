// The between-screens step that sets the mode's emotional contract (training vs
// empathy) and primes how a week works before a run begins.
import type { CharacterOrigin, Mode } from "../engine";

interface Props {
  origin: CharacterOrigin;
  mode: Mode;
  onBegin: () => void;
  onBack: () => void;
}

// The emotional contract differs by mode (DESIGN §1, §10); the engine does not.
const CONTRACT: Record<Mode, { label: string; lead: string; body: string }> = {
  training: {
    label: "Training",
    lead: "Practice, not a prediction.",
    body:
      "You'll live these ninety days one week at a time. Money, time, and goodwill are tight, and setbacks are part of it — but there is always a way forward. Nothing here ends in failure. It ends in a debrief you can learn from and run again.",
  },
  empathy: {
    label: "Empathy",
    lead: "Feel the wall.",
    body:
      "You'll live these ninety days from the inside. This is the deep end: the barriers are real and they stack, and this run can be walked all the way to the edge. The point isn't to win — it's to feel what the week actually demands of someone coming home.",
  },
};

export function Onboarding({ origin, mode, onBegin, onBack }: Props) {
  const c = CONTRACT[mode];
  return (
    <div className="screen onboarding">
      <header className="hero">
        <p className="eyebrow">{c.label} mode</p>
        <h1>{c.lead}</h1>
      </header>

      <section className="card-static">
        <p className="prompt">{c.body}</p>
      </section>

      <section className="card-static">
        <h2>How a week works</h2>
        <ul className="how-list">
          <li>Each week you have a few <strong>days</strong> to spend. Errands cost time — more when you can't get around easily.</li>
          <li>Some things are <strong>due whether you have time or not</strong>. Skip them and there are consequences.</li>
          <li>Moves you can't make yet appear <strong>locked</strong> — so you can see the wall before you can climb it.</li>
          <li>You're scored on <strong>trajectory and decisions</strong>, not just where day 90 leaves you.</li>
        </ul>
      </section>

      <section className="card-static">
        <h2>
          {origin.name}, {origin.display_age}
        </h2>
        {origin.summary && <p className="muted">{origin.summary}</p>}
      </section>

      <button type="button" className="primary big" onClick={onBegin}>
        Begin {origin.name}'s ninety days
      </button>
      <button type="button" className="link-btn" onClick={onBack}>
        ← Choose someone else
      </button>
    </div>
  );
}
