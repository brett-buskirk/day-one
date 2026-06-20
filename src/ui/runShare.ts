// Run export — the classroom/facilitator hook (DESIGN §13): a run is plain,
// serializable data, so it can be saved out and shared (everyone replays the
// same seeded run, or a facilitator hands one out). Import lives in App/loadRun.

import { serializeRun, type GameState } from "../engine";

export function runFilename(state: GameState): string {
  return `day-one-${state.characterId}-week${state.turn}.json`;
}

export function downloadRun(state: GameState): void {
  const blob = new Blob([serializeRun(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = runFilename(state);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyRun(state: GameState): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(serializeRun(state));
    return true;
  } catch {
    return false;
  }
}
