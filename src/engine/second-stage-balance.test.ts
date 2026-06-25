import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import {
  createRun,
  beginTurn,
  endTurn,
  resolveChoice,
  eligibleActions,
  pendingEvents,
  isRunOver,
} from "./index";

const ARCS = ["evt_give_back", "evt_health_deferred", "evt_mend_family"];

// UX pass 3: these "second stage" arcs gated on has_job alone, so they opened the instant
// a job landed — in week 1, cluttering the survival phase. They now also require turn >= 6.
describe("second stage opens a few weeks in, not the first employed week", () => {
  it("the enrichment arcs stay closed early (even employed) and open by turn 6", () => {
    const base = createRun(corpus, "gloria", { seed: 1 });
    const employed = (turn: number) => ({ ...base, turn, flags: { ...base.flags, has_job: true } });

    const early = new Set(eligibleActions(employed(4), corpus).map((e) => e.id));
    for (const id of ARCS) expect(early.has(id), `${id} should be closed at turn 4`).toBe(false);

    const later = new Set(eligibleActions(employed(6), corpus).map((e) => e.id));
    for (const id of ARCS) expect(later.has(id), `${id} should be open at turn 6`).toBe(true);
  });
});

// UX pass 3 (verify): the custody hearing (week 9) needs housing.readiness >= 3
// (transitional). Transitional housing is a 65%-per-attempt repeatable action ("waitlisted —
// check back" is a retry, not a multi-week block), so a housing-first player clears it well
// before week 9. This guards that the best path stays reachable.
describe("the custody hearing's housing gate is reachable before week 9", () => {
  it("a housing-first Tasha reaches transitional housing (readiness >= 3) by week 9", () => {
    const housing = corpus.events["evt_housing_search"];
    const apply = housing.choices.find((c) => c.id === "apply_transitional")!;
    for (const seed of [1, 3, 7, 13, 42]) {
      let s = createRun(corpus, "tasha", { seed });
      let guard = 0;
      while (!isRunOver(s) && s.turn < 9 && (s.tracks.housing.readiness ?? 0) < 3 && guard++ < 40) {
        // clear any forced incidents so the week proceeds
        let g2 = 0;
        while (s.pending.length > 0 && g2++ < 12) {
          const inc = pendingEvents(s, corpus)[0];
          s = resolveChoice(s, inc, inc.choices[inc.choices.length - 1], corpus);
        }
        // housing-first: apply to transitional whenever it's open
        if (eligibleActions(s, corpus).some((e) => e.id === "evt_housing_search")) {
          s = resolveChoice(s, housing, apply, corpus);
        }
        s = endTurn(s, corpus);
        if (!isRunOver(s)) s = beginTurn(s, corpus);
      }
      expect(
        s.tracks.housing.readiness ?? 0,
        `tasha seed ${seed} stalled at readiness ${s.tracks.housing.readiness} by turn ${s.turn}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});
