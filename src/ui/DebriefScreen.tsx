import { useState } from "react";
import type { Corpus, GameState } from "../engine";
import { buildDebrief } from "../engine";
import { downloadRun, copyRun } from "./runShare";
import { RunCodeShare } from "./RunCodeShare";
import { ResourceList } from "./ResourceList";

interface Props {
  state: GameState;
  corpus: Corpus;
  characterName: string;
  onPlayAgain: () => void;
}

export function DebriefScreen({ state, corpus, characterName, onPlayAgain }: Props) {
  const debrief = buildDebrief(state, characterName);
  const resources = corpus.resources ?? [];
  const [copied, setCopied] = useState(false);

  // Group the full run log by week for the narrative replay.
  const weeks = Array.from({ length: state.endTurn }, (_, i) => i + 1)
    .map((turn) => ({ turn, entries: state.log.filter((l) => l.turn === turn) }))
    .filter((w) => w.entries.length > 0);

  return (
    <div className="screen debrief">
      <header className="hero">
        <h1>{debrief.endedTerminal ? "The road closed early" : "Ninety days"}</h1>
        <p className="framing-intro">{debrief.framing.intro}</p>
        <p className="tagline">{debrief.headline}</p>
      </header>

      <section className="block" aria-label="Where things landed">
        <h2 className="block-title">Where things landed</h2>
        <ul className="profile">
          {debrief.profile.map((d) => (
            <li key={d.key} className={`profile-row tone-${d.tone}`}>
              <span className="profile-label">{d.label}</span>
              <span className="profile-status">{d.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="block" aria-label="How it landed here">
        <h2 className="block-title">Why it landed here</h2>
        <p className="trajectory">{debrief.trajectoryNote}</p>
        <ul className="why">
          {debrief.why.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </section>

      <section className="block" aria-label="Milestones">
        <h2 className="block-title">
          Milestones <span className="muted">({debrief.milestonesAchieved} of {debrief.milestones.length})</span>
        </h2>
        <ul className="milestones">
          {debrief.milestones.map((m) => (
            <li key={m.key} className={m.achieved ? "ms-hit" : "ms-miss"}>
              <span aria-hidden="true">{m.achieved ? "✓" : "○"}</span>
              <span>{m.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="block" aria-label="How it went, week by week">
        <h2 className="block-title">How it went</h2>
        <ol className="weeks">
          {weeks.map((w) => (
            <li key={w.turn} className="week">
              <h3 className="week-title">Week {w.turn}</h3>
              <ul className="feed">
                {w.entries.map((e, i) => (
                  <li key={i} className="feed-item">
                    {e.text}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {debrief.framing.prompts.length > 0 && (
        <section className="block" aria-label="Reflection">
          <h2 className="block-title">Sit with it</h2>
          <ul className="prompts">
            {debrief.framing.prompts.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {debrief.framing.showResources && resources.length > 0 && (
        <section className="block" aria-label="Where to get help">
          <h2 className="block-title">Where to get help</h2>
          <div className="block-resources">
            <p className="muted small">
              Free, confidential places to start — these are national, and your area
              likely has more.
            </p>
            <ResourceList resources={resources} />
          </div>
        </section>
      )}

      <section className="block" aria-label="Export this run">
        <h2 className="block-title">Take it with you</h2>
        <RunCodeShare
          state={state}
          hint="Hand this code to a group so everyone plays — and debriefs — the same run."
        />
        <p className="muted small">
          Or export the whole run (every choice) to share or replay it exactly:
        </p>
        <div className="export-row">
          <button type="button" className="primary" onClick={() => downloadRun(state)}>
            Download
          </button>
          <button
            type="button"
            className="primary"
            onClick={async () => {
              const ok = await copyRun(state);
              setCopied(ok);
              if (ok) setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </section>

      <button type="button" className="primary big" onClick={onPlayAgain}>
        Play again
      </button>
    </div>
  );
}
