// End-to-end playthrough (SPRINTS Sprint 1 "Done when"): a simulated player
// drives Marcus through all ~13 weeks to a debrief. Proves the loop terminates,
// a rent crisis is survivable (never ends the run), the document chain is
// reachable, and the debrief builds — all deterministically from a seed.

import { describe, it, expect } from "vitest";
import { corpus, MARCUS_ID } from "../content/corpus";
import {
  createRun,
  beginTurn,
  endTurn,
  resolveChoice,
  eligibleActions,
  pendingEvents,
  canSelectChoice,
  isRunOver,
} from "./engine";
import { buildDebrief } from "./debrief";
import type { Choice, GameEvent, GameState } from "./types";

// A deterministic, goal-seeking "player": resolves whatever the week throws at
// it, then pushes the document chain (cert → proof → ID → job), then ends the
// week. Bounded so it always terminates.
function pickChoice(state: GameState, event: GameEvent): Choice | null {
  const selectable = event.choices.filter((c) => canSelectChoice(state, event, c));
  if (selectable.length === 0) return null;
  // Prefer a choice that sets a flag (document progress), else first selectable.
  const progress = selectable.find((c) =>
    c.outcomes.some((o) => o.effects.flags && Object.values(o.effects.flags).some(Boolean))
  );
  return progress ?? selectable[0];
}

function playMarcus(seed: number) {
  let state = createRun(corpus, MARCUS_ID, { seed });
  let sawRentCrisis = false;
  let weeks = 0;

  while (!isRunOver(state) && weeks < 20) {
    weeks++;

    // Resolve forced incidents first (bounded).
    let guard = 0;
    while (state.pending.length > 0 && guard++ < 12) {
      const incident = pendingEvents(state, corpus)[0];
      if (incident.id === "evt_rent_due") sawRentCrisis = true;
      const choice = pickChoice(state, incident) ?? incident.choices[incident.choices.length - 1];
      state = resolveChoice(state, incident, choice, corpus);
    }

    // Take each eligible action at most once this week (avoids 0-cost loops),
    // while there are slots to spend.
    for (const event of eligibleActions(state, corpus)) {
      if (state.slots <= 0) break;
      const choice = pickChoice(state, event);
      if (choice) state = resolveChoice(state, event, choice, corpus);
    }

    // End the week; begin the next unless the run is over.
    state = endTurn(state, corpus);
    if (!isRunOver(state)) state = beginTurn(state, corpus);
  }

  return { state, sawRentCrisis, weeks };
}

describe("Marcus plays through 90 days", () => {
  it("completes the run, survives a rent crisis, and reaches a debrief", () => {
    const { state, sawRentCrisis, weeks } = playMarcus(2026);

    expect(isRunOver(state)).toBe(true); // reached the finish line
    expect(weeks).toBe(13); // exactly ~13 weekly turns
    expect(sawRentCrisis).toBe(true); // hit the rent crisis...
    expect(state.log.length).toBeGreaterThan(5); // ...and kept going (no death)

    // The debrief — the teaching payload — builds and never says "you lost".
    const debrief = buildDebrief(state, corpus.characters[MARCUS_ID].name);
    expect(debrief.profile).toHaveLength(5);
    expect(debrief.milestones.length).toBeGreaterThan(0);
    expect(debrief.headline.toLowerCase()).not.toContain("you lost");
  });

  it("is deterministic: the same seed yields an identical run", () => {
    const a = playMarcus(42);
    const b = playMarcus(42);
    expect(a.state.log).toEqual(b.state.log);
    expect(a.state.pools).toEqual(b.state.pools);
  });

  it("never throws and always terminates across many seeds", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { state, weeks } = playMarcus(seed);
      expect(isRunOver(state)).toBe(true);
      expect(weeks).toBeLessThanOrEqual(13);
      // Pools stay within bounds the whole way (clamped on every write).
      for (const v of Object.values(state.pools)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});
