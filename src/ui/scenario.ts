// Facilitator/classroom hook (DESIGN §13): the run is fully determined by
// character + mode + seed, so a "scenario code" like `marcus.training.482913`
// lets a whole room play the *identical* run and compare how their choices
// diverged. Lighter than exporting a full run — it just specifies the setup.

import type { Mode } from "../engine";

export interface Scenario {
  characterId: string;
  mode: Mode;
  seed: number;
}

export function encodeScenario(s: Scenario): string {
  return `${s.characterId}.${s.mode}.${s.seed}`;
}

export function parseScenario(code: string, validIds: string[]): Scenario | null {
  const m = code.trim().toLowerCase().match(/^([a-z0-9_]+)\.(training|empathy)\.(\d+)$/);
  if (!m) return null;
  const [, characterId, mode, seedStr] = m;
  if (!validIds.includes(characterId)) return null;
  const seed = Number(seedStr);
  if (!Number.isInteger(seed) || seed <= 0 || seed > 0xffffffff) return null;
  return { characterId, mode: mode as Mode, seed };
}
