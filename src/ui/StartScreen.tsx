// Character + mode selection, plus run import and the classroom (shared-run) panel.
// Compact cards expand on tap to reveal the build, pick a mode, and Play.
import { useState } from "react";
import { RANDOM_ID, type CharacterOrigin, type Mode } from "../engine";
import { humanizeCredential, nightOneShort, avatarFor, tagForId, avatarStyle } from "./format";
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

// Fallback tag for the random / generated build (the fixed roster has unique tags
// via tagForId).
function archetypeTag(o: CharacterOrigin): string {
  if (o.time_inside_years >= 20) return "The longtimer";
  if (o.offense.registry_required) return "Registry — the deep end";
  if (o.supervision.type === "none") return "Maxed out — no net";
  if (o.supervision.type === "probation") return "On probation";
  return "Fresh out";
}

function metaLine(c: CharacterOrigin): string {
  const creds = (c.person.credentials ?? []).length
    ? ` · ${c.person.credentials!.map(humanizeCredential).join(", ")}`
    : "";
  const supervision = c.supervision.type.replace(/_/g, " "); // e.g. "home_detention" → "home detention"
  return `${c.time_inside_years} yrs in · ${supervision} · ${nightOneShort(c.landing.night_one)}${creds}`;
}

interface Card {
  id: string;
  name: string;
  age: number | null;
  avatar: string;
  tag: string;
  summary: string;
  meta: string | null;
  playName: string;
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
  const [expandedId, setExpandedId] = useState<string>("");
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
  const startSeed = () => (validSeed ? seedNum : undefined);
  const codeTarget = expandedId || characters[0]?.id || "";
  const shareCode = validSeed && codeTarget ? encodeScenario({ characterId: codeTarget, mode, seed: seedNum! }) : null;

  const cards: Card[] = [
    ...characters.map((c) => ({
      id: c.id,
      name: c.name,
      age: c.display_age,
      avatar: avatarFor(c.id),
      tag: tagForId(c.id) ?? archetypeTag(c),
      summary: c.summary ?? "",
      meta: metaLine(c),
      playName: c.name,
    })),
    {
      id: RANDOM_ID,
      name: "Surprise me",
      age: null,
      avatar: "🎲",
      tag: "Random — reproducible from its seed",
      summary:
        "A fresh life, generated for you — and reproducible from its seed, so a group can share one.",
      meta: null,
      playName: "a random life",
    },
  ];

  const tryImport = () => {
    setImportError(null);
    try {
      onImport(importText.trim());
    } catch {
      setImportError(
        "That doesn't look like a complete Day One run — a long paste can get cut off on a phone. Try uploading the .json file instead."
      );
    }
  };

  // Full runs are large; pasting them (especially on a phone) can truncate. Reading the
  // exported .json file directly sidesteps the paste entirely.
  const importFile = (file: File) => {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImport(String(reader.result ?? "").trim());
      } catch {
        setImportError("That file doesn't look like a Day One run.");
      }
    };
    reader.onerror = () => setImportError("Couldn't read that file — try again.");
    reader.readAsText(file);
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
        <p className="muted small select-hint">
          Tap a person to meet them — then press <strong>Play</strong>.
        </p>
        <ul className="char-list">
          {cards.map((c) => {
            const open = expandedId === c.id;
            return (
              <li key={c.id} className={`char-item ${open ? "char-item-on" : ""}`}>
                <button
                  type="button"
                  className="char-card-head"
                  aria-expanded={open}
                  onClick={() => setExpandedId(open ? "" : c.id)}
                >
                  <span className="avatar" style={avatarStyle(c.id)} aria-hidden="true">
                    {c.avatar}
                  </span>
                  <span className="char-head-text">
                    <span className="char-name">
                      {c.name}
                      {c.age ? `, ${c.age}` : ""}
                    </span>
                    <span className="char-tag">{c.tag}</span>
                  </span>
                  <span className="char-chevron" aria-hidden="true">
                    {open ? "▾" : "▸"}
                  </span>
                </button>
                {open && (
                  <div className="char-body">
                    {c.summary && <p className="char-summary">{c.summary}</p>}
                    {c.meta && <p className="char-meta">{c.meta}</p>}
                    <div className="char-mode">
                      <span className="char-mode-label">Why are you here?</span>
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
                    </div>
                    <button
                      type="button"
                      className="primary big"
                      onClick={() => onChoose(c.id, mode, startSeed())}
                    >
                      Play {c.playName}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

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
        <p className="muted small">
          Pick up a run someone exported. Paste the text — or, more reliably for a full run
          (a long paste can get cut off on a phone), upload the <code>.json</code> file.
        </p>
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
        <div className="import-actions">
          <button type="button" className="primary" onClick={tryImport} disabled={!importText.trim()}>
            Load pasted run
          </button>
          <label className="link-btn import-upload">
            Upload .json file
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
                e.target.value = ""; // allow re-picking the same file
              }}
            />
          </label>
        </div>
      </details>

      <button type="button" className="link-btn" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}
