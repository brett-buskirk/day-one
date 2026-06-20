// Minimal run persistence via Dexie/IndexedDB — so a player can close the tab on
// the bus and resume (DESIGN §11). Sprint 1 keeps a single current-run slot;
// full save management and export land in Sprint 3. This is also where the
// serializeRun/loadRun pair earns its keep.

import Dexie, { type Table } from "dexie";
import { serializeRun, loadRun } from "./engine";
import type { GameState } from "./engine";

export interface SavedRun {
  id: string; // single slot: "current"
  serialized: string;
  characterId: string;
  turn: number;
  updatedAt: number;
}

class DayOneDB extends Dexie {
  runs!: Table<SavedRun, string>;
  constructor() {
    super("day-one");
    this.version(1).stores({ runs: "id" });
  }
}

const db = new DayOneDB();
const CURRENT = "current";

// All calls are best-effort: a blocked IndexedDB (private mode, low storage)
// must never crash the game. Persistence degrades; play continues.
export async function saveRun(state: GameState, now: number): Promise<void> {
  try {
    await db.runs.put({
      id: CURRENT,
      serialized: serializeRun(state),
      characterId: state.characterId,
      turn: state.turn,
      updatedAt: now,
    });
  } catch (err) {
    console.warn("saveRun failed (continuing without persistence):", err);
  }
}

export async function loadSavedRun(): Promise<GameState | null> {
  try {
    const row = await db.runs.get(CURRENT);
    return row ? loadRun(row.serialized) : null;
  } catch (err) {
    console.warn("loadSavedRun failed:", err);
    return null;
  }
}

export async function clearSavedRun(): Promise<void> {
  try {
    await db.runs.delete(CURRENT);
  } catch (err) {
    console.warn("clearSavedRun failed:", err);
  }
}
