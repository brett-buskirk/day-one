import { HowYouPlay } from "./HowYouPlay";
import { SECURE_BUILD } from "./build";

interface Props {
  onBack: () => void;
  onPlay: () => void;
  onHelp: () => void;
}

// A condensed, in-app version of docs/ABOUT.md — for a public visitor deciding
// whether to play.
export function AboutScreen({ onBack, onPlay, onHelp }: Props) {
  return (
    <div className="screen about">
      <header className="hero">
        <h1>About Day One</h1>
        <p className="tagline">What it is, and why it exists.</p>
      </header>

      <section className="card-static">
        <h2>The short version</h2>
        <p className="prompt">
          Day One is a simulator about coming home from prison. You step into the life
          of someone recently released and live their first ninety days — one week at a
          time — trying to get an ID, a place to stay, work, and some footing, while the
          clock, the money, and the goodwill of the people around you all run short.
        </p>
        <p className="muted">
          It plays a little like <em>Oregon Trail</em> or the <em>Spent</em> poverty
          simulator: no flashy graphics, just decisions that matter — light enough to
          run on an old phone, offline.
        </p>
      </section>

      <section className="card-static">
        <h2>Why it exists</h2>
        <p className="muted">
          The first ninety days are a maze of small, stacked obstacles, and one missing
          piece can block all the others: no job without an ID, no ID without a birth
          certificate and proof of address, no proof of address from someone's couch —
          while rent is due and a parole officer expects you across town. It's built for
          two groups, equally:
        </p>
        <ul className="how-list">
          <li>
            <strong>People preparing to come home</strong> — to rehearse hard decisions
            safely. <em>Practice, not a prediction, and always a way forward.</em>
          </li>
          <li>
            <strong>Everyone else</strong> — staff, volunteers, the public — to feel what
            reentry actually demands. <em>Feel the wall.</em>
          </li>
        </ul>
      </section>

      <section className="card-static">
        <h2>How you play</h2>
        <HowYouPlay />
        <p className="muted">
          You choose who to play — nine hand-built people, or a randomly generated
          one (Surprise me) — and why you're here (to practice, or to feel the wall).
          Throughout, the system models barriers and consequences — never moral
          judgment.
        </p>
      </section>

      <section className="card-static">
        <h2>Who made it</h2>
        <p className="muted">
          Day One is built by someone who has lived it — a returning citizen — for
          people walking the same road. The barriers here aren't imagined; they're
          remembered.
        </p>
        {!SECURE_BUILD && (
          <p className="muted">
            It's open source.{" "}
            <a
              href="https://github.com/brett-buskirk/day-one"
              target="_blank"
              rel="noopener noreferrer"
            >
              View the code, or propose a character, event, or fix on GitHub
            </a>
            .
          </p>
        )}
      </section>

      <button type="button" className="primary big" onClick={onPlay}>
        Play
      </button>
      {!SECURE_BUILD && (
        <button type="button" className="help-link" onClick={onHelp}>
          Where to get help
        </button>
      )}
      <button type="button" className="link-btn" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}
