import { useState } from "react";
import { RANDOM_ID, type CharacterOrigin, type Mode } from "../engine";
import { humanizeCredential } from "./format";
import { encodeScenario, parseScenario } from "./scenario";

interface Props {
  characters: CharacterOrigin[];
  hasSavedRun: boolean;
  savedTurn: number | null;
  savedMode: Mode | null;
  savedCharacterName: string | null;
  onChoose: (characterId: string, mode: Mode, seed?: number) => void;
  onResume: () => void;
  onImport: (serialized: string) => void;
  onBack: () => void;
}

const MODES: { key: Mode; label: string; blurb: string }[] = [
  { key: "training", label: "Training", blurb: "Practice and plan. Setbacks teach; the run never ends in failure." },
  { key: "empathy", label: "Empathy", blurb: "Feel the wall. The deep end — a run can be walked to the edge." },
];

// A short identity tag per archetype, derived from the origin data.
function archetypeTag(o: CharacterOrigin): string {
  if (o.time_inside_years >= 20) return "The longtimer · deepest end";
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
  onChoose,
  onResume,
  onImport,
  onBack,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>(characters[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("training");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [seedText, setSeedText] = useState("");
  const [codeText, setCodeText] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const activeBlurb = MODES.find((m) => m.key === mode)!.blurb;

  // A typed seed makes the run you start reproducible; blank = random.
  const seedNum = /^\d+$/.test(seedText.trim()) ? Number(seedText.trim()) : undefined;
  const validSeed = seedNum !== undefined && seedNum > 0 && seedNum <= 0xffffffff;
  const shareCode =
    validSeed && selectedId ? encodeScenario({ characterId: selectedId, mode, seed: seedNum! }) : null;

  const tryImport = () => {
    setImportError(null);
    try {
      onImport(importText.trim());
    } catch {
      setImportError("That doesn't look like a Day One run. Paste the full exported text.");
    }
  };

  const playSharedCode = () => {
    setCodeError(null);
    const scenario = parseScenario(codeText, [...characters.map((c) => c.id), RANDOM_ID]);
    if (!scenario) {
      setCodeError("That code doesn't look right. Use the form character.mode.seed.");
      return;
    }
    onChoose(scenario.characterId, scenario.mode, scenario.seed);
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
          <li>
            <button
              type="button"
              role="radio"
              aria-checked={selectedId === RANDOM_ID}
              className={`char-card ${selectedId === RANDOM_ID ? "char-card-on" : ""}`}
              onClick={() => setSelectedId(RANDOM_ID)}
            >
              <span className="char-head">
                <span className="char-name">Surprise me</span>
                <span className="char-tag">Random</span>
              </span>
              <span className="char-summary">
                A fresh life, generated for you — and reproducible from its seed, so a
                group can share one.
              </span>
            </button>
          </li>
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
        onClick={() => selectedId && onChoose(selectedId, mode, validSeed ? seedNum : undefined)}
        disabled={!selectedId}
      >
        Continue
      </button>

      <details className="disclosure">
        <summary>Classroom / shared run</summary>
        <p className="muted small">
          A run is fully decided by its character, mode, and seed — so a group can play
          the <em>identical</em> run and compare how their choices diverged.
        </p>

        <label className="sr-only" htmlFor="play-code">
          Shared run code
        </label>
        <input
          id="play-code"
          className="import-box"
          inputMode="text"
          value={codeText}
          onChange={(e) => setCodeText(e.target.value)}
          placeholder="Play a shared code, e.g. marcus.training.482913"
        />
        {codeError && <p className="choice-why">{codeError}</p>}
        <button type="button" className="primary" onClick={playSharedCode} disabled={!codeText.trim()}>
          Play this run
        </button>

        <p className="muted small classroom-or">
          — or pin a seed to the run you start above (blank = random) —
        </p>
        <label className="sr-only" htmlFor="seed-input">
          Seed
        </label>
        <input
          id="seed-input"
          className="import-box"
          inputMode="numeric"
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
          placeholder="Seed (e.g. 482913)"
        />
        {seedText.trim() && !validSeed && (
          <p className="choice-why">Use a whole number seed (1–4294967295).</p>
        )}
        {shareCode && (
          <p className="muted small">
            Hand out this code: <code className="run-code-value">{shareCode}</code>
          </p>
        )}
      </details>

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

      <button type="button" className="link-btn" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}
