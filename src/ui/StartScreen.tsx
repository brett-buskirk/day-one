import { useState } from "react";
import type { CharacterOrigin, Mode } from "../engine";
import { humanizeCredential } from "./format";

interface Props {
  marcus: CharacterOrigin;
  hasSavedRun: boolean;
  savedTurn: number | null;
  savedMode: Mode | null;
  onStart: (mode: Mode) => void;
  onResume: () => void;
}

const MODES: { key: Mode; label: string; blurb: string }[] = [
  { key: "training", label: "Training", blurb: "Practice and plan. Setbacks teach; the run never ends in failure." },
  { key: "empathy", label: "Empathy", blurb: "Feel the wall. The deep end — a run can be walked to the edge." },
];

export function StartScreen({ marcus, hasSavedRun, savedTurn, savedMode, onStart, onResume }: Props) {
  const [mode, setMode] = useState<Mode>("training");
  const activeBlurb = MODES.find((m) => m.key === mode)!.blurb;
  return (
    <div className="screen start">
      <header className="hero">
        <h1>Day One</h1>
        <p className="tagline">The first ninety days home, one week at a time.</p>
      </header>

      {hasSavedRun && (
        <div className="resume-banner" role="region" aria-label="Saved run">
          <p>
            You have a run in progress{savedTurn ? ` (week ${savedTurn}` : ""}
            {savedTurn && savedMode ? `, ${savedMode}` : ""}
            {savedTurn ? ")" : ""}.
          </p>
          <button type="button" className="primary" onClick={onResume}>
            Resume
          </button>
        </div>
      )}

      <section className="card-static">
        <h2>
          {marcus.name}, {marcus.display_age}
        </h2>
        {marcus.summary && <p className="prompt">{marcus.summary}</p>}
        <dl className="origin-grid">
          <div>
            <dt>Inside</dt>
            <dd>{marcus.time_inside_years} years</dd>
          </div>
          <div>
            <dt>Supervision</dt>
            <dd>{marcus.supervision.type}</dd>
          </div>
          <div>
            <dt>Tonight</dt>
            <dd>{marcus.landing.night_one}</dd>
          </div>
          <div>
            <dt>Getting around</dt>
            <dd>{marcus.landing.transportation}</dd>
          </div>
          <div>
            <dt>Gate money</dt>
            <dd>${marcus.landing.gate_money}</dd>
          </div>
          <div>
            <dt>Skills</dt>
            <dd>{(marcus.person.credentials ?? []).map(humanizeCredential).join(", ") || "—"}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Mode" className="mode-pick">
        <div className="segmented" role="radiogroup" aria-label="Choose a mode">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={mode === m.key}
              className={`segment ${mode === m.key ? "segment-on" : ""}`}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="muted small">{activeBlurb}</p>
      </section>

      <button type="button" className="primary big" onClick={() => onStart(mode)}>
        Begin as {marcus.name}
      </button>
    </div>
  );
}
