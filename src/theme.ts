// Appearance: light/dark mode + an accent color variant. State is applied as
// data-theme / data-accent on <html> (see styles.css) and persisted to
// localStorage. A tiny inline script in index.html applies the stored values
// before first paint to avoid a flash; this module keeps React in sync after.

export type ThemeMode = "light" | "dark";
export type Accent = "teal" | "indigo" | "plum" | "amber";

export const ACCENTS: { key: Accent; label: string }[] = [
  { key: "teal", label: "Teal" },
  { key: "indigo", label: "Indigo" },
  { key: "plum", label: "Plum" },
  { key: "amber", label: "Amber" },
];

export const THEME_KEY = "dayone:theme";
export const ACCENT_KEY = "dayone:accent";

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / no storage — appearance just won't persist */
  }
}

export function loadThemeMode(): ThemeMode {
  const s = safeGet(THEME_KEY);
  if (s === "light" || s === "dark") return s;
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function loadAccent(): Accent {
  const s = safeGet(ACCENT_KEY) as Accent | null;
  return ACCENTS.some((a) => a.key === s) ? (s as Accent) : "teal";
}

export function applyTheme(mode: ThemeMode, accent: Accent): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", mode);
  root.setAttribute("data-accent", accent);
  // Keep the browser/OS chrome color in step with the chosen accent.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const c = getComputedStyle(root).getPropertyValue("--accent").trim();
    if (c) meta.setAttribute("content", c);
  }
}

export function persistThemeMode(mode: ThemeMode): void {
  safeSet(THEME_KEY, mode);
}
export function persistAccent(accent: Accent): void {
  safeSet(ACCENT_KEY, accent);
}
