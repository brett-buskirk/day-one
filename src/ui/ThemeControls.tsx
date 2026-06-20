import { ACCENTS, type Accent, type ThemeMode } from "../theme";

interface Props {
  mode: ThemeMode;
  accent: Accent;
  onMode: (mode: ThemeMode) => void;
  onAccent: (accent: Accent) => void;
}

const MODES: { key: ThemeMode; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

export function ThemeControls({ mode, accent, onMode, onAccent }: Props) {
  return (
    <section className="appearance" aria-label="Appearance">
      <div className="appearance-row">
        <span className="appearance-label">Theme</span>
        <div className="segmented seg-compact" role="radiogroup" aria-label="Light or dark theme">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={mode === m.key}
              className={`segment ${mode === m.key ? "segment-on" : ""}`}
              onClick={() => onMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="appearance-row">
        <span className="appearance-label">Color</span>
        <div className="swatches" role="radiogroup" aria-label="Accent color">
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              type="button"
              role="radio"
              aria-checked={accent === a.key}
              aria-label={a.label}
              title={a.label}
              className={`swatch swatch-${a.key}`}
              onClick={() => onAccent(a.key)}
            >
              <i aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
