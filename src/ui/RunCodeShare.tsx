import { useState } from "react";
import type { GameState } from "../engine";
import { encodeScenario } from "./scenario";

interface Props {
  state: GameState;
  label?: string;
  hint?: string;
}

// Shows the run's scenario code with a copy button — share it so others play the
// identical run (same character, mode, and seed → same RNG).
export function RunCodeShare({ state, label = "This run", hint }: Props) {
  const [copied, setCopied] = useState(false);
  const code = encodeScenario({ characterId: state.characterId, mode: state.mode, seed: state.seed });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the code is still visible to copy by hand */
    }
  };

  return (
    <div className="run-code">
      <div className="run-code-row">
        <span className="run-code-label">{label}</span>
        <code className="run-code-value">{code}</code>
        <button type="button" className="link-btn" onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      {hint && <p className="muted small">{hint}</p>}
    </div>
  );
}
