import { useState } from "react";
import type { CharacterOrigin, Mode } from "../engine";
import type { Accent, ThemeMode } from "../theme";
import { humanizeCredential } from "./format";
import { ThemeControls } from "./ThemeControls";

interface Props {
  characters: CharacterOrigin[];
  hasSavedRun: boolean;
  savedTurn: number | null;
  savedMode: Mode | null;
  savedCharacterName: string | null;
  themeMode: ThemeMode;
  accent: Accent;
  onThemeMode: (mode: ThemeMode) => void;
  onAccent: (accent: Accent) => void;
  onChoose: (characterId: string, mode: Mode) => void;
  onResume: () => void;
  onImport: (serialized: string) => void;
}

const MODES: { key: Mode; label: string; blurb: string }[] = [
  { key: "training", label: "Training", blurb: "Practice and plan. Setbacks teach; the run never ends in failure." },
  { key: "empathy", label: "Empathy", blurb: "Feel the wall. The deep end — a run can be walked to the edge." },
];

// A short identity tag per archetype, derived from the origin data.
function archetypeTag(o: CharacterOrigin): string {
  if (o.offense.registry_required) return "Registry · deep end";
  if (o.landing.support === "supported" || o.landing.support === "network") return "Has people in their corner";
  if (o.supervision.type === "probation") return "On probation";
  return "The thesis build";
}

export function StartScreen({
  characters,
  hasSavedRun,
  savedTurn,
  savedMode,
  savedCharacterName,
  themeMode,
  accent,
  onThemeMode,
  onAccent,
  onChoose,
  onResume,
  onImport,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>(characters[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("training");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const activeBlurb = MODES.find((m) => m.key === mode)!.blurb;

  const tryImport = () => {
    setImportError(null);
    try {
      onImport(importText.trim());
    } catch {
      setImportError("That doesn't look like a Day One run. Paste the full exported text.");
    }
  };

  return (
    <div className="screen start">
      <header className="hero">
        <h1>Day One</h1>
        <p className="tagline">The first ninety days home, one week at a time.</p>
      </header>

      {hasSavedRun && (
        <div className="resume-banner" role="region" aria-label="Saved run">
          <p>
            Run in progress
            {savedCharacterName ? ` — ${savedCharacterName}` : ""}
            {savedTurn ? `, week ${savedTurn}` : ""}
            {savedMode ? ` (${savedMode})` : ""}.
          </p>
          <button type="button" className="primary" onClick={onResume}>
            Resume
          </button>
        </div>
      )}

      <section aria-label="Choose a character">
        <h2 className="block-title">Who will you play?</h2>
        <ul className="char-list" role="radiogroup" aria-label="Characters">
          {characters.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selectedId === c.id}
                className={`char-card ${selectedId === c.id ? "char-card-on" : ""}`}
                onClick={() => setSelectedId(c.id)}
              >
                <span className="char-head">
                  <span className="char-name">
                    {c.name}, {c.display_age}
                  </span>
                  <span className="char-tag">{archetypeTag(c)}</span>
                </span>
                {c.summary && <span className="char-summary">{c.summary}</span>}
                <span className="char-meta">
                  {c.time_inside_years} yrs in · {c.supervision.type} · {c.landing.night_one}
                  {(c.person.credentials ?? []).length > 0
                    ? ` · ${c.person.credentials!.map(humanizeCredential).join(", ")}`
                    : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Mode" className="mode-pick">
        <h2 className="block-title">Why are you here?</h2>
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

      <button
        type="button"
        className="primary big"
        onClick={() => selectedId && onChoose(selectedId, mode)}
        disabled={!selectedId}
      >
        Continue
      </button>

      <details className="disclosure">
        <summary>Import a run</summary>
        <p className="muted small">Paste a run someone exported to pick it up where they left off.</p>
        <label className="sr-only" htmlFor="import-run">
          Exported run text
        </label>
        <textarea
          id="import-run"
          className="import-box"
          rows={3}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste exported run text…"
        />
        {importError && <p className="choice-why">{importError}</p>}
        <button type="button" className="primary" onClick={tryImport} disabled={!importText.trim()}>
          Load run
        </button>
      </details>

      <ThemeControls mode={themeMode} accent={accent} onMode={onThemeMode} onAccent={onAccent} />
    </div>
  );
}
