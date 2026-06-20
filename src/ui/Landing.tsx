import type { Accent, ThemeMode } from "../theme";
import { ThemeControls } from "./ThemeControls";

interface Props {
  hasSavedRun: boolean;
  themeMode: ThemeMode;
  accent: Accent;
  onThemeMode: (mode: ThemeMode) => void;
  onAccent: (accent: Accent) => void;
  onPlay: () => void;
  onAbout: () => void;
  onResume: () => void;
}

export function Landing({
  hasSavedRun,
  themeMode,
  accent,
  onThemeMode,
  onAccent,
  onPlay,
  onAbout,
  onResume,
}: Props) {
  return (
    <div className="screen landing">
      <header className="hero landing-hero">
        <img className="landing-logo" src="/favicon.svg" alt="" width="96" height="96" />
        <h1>Day One</h1>
        <p className="tagline">The first ninety days home, one week at a time.</p>
      </header>

      <p className="landing-blurb">
        A phone-first reentry simulator. Step into someone's first ninety days after
        release and live the decisions, the trade-offs, and the walls — to practice, or
        to feel what it actually demands.
      </p>

      {hasSavedRun && (
        <button type="button" className="primary" onClick={onResume}>
          Resume your run
        </button>
      )}

      <div className="landing-actions">
        <button type="button" className="primary big" onClick={onPlay}>
          Play
        </button>
        <button type="button" className="btn-outline big" onClick={onAbout}>
          About
        </button>
      </div>

      <ThemeControls mode={themeMode} accent={accent} onMode={onThemeMode} onAccent={onAccent} />
    </div>
  );
}
