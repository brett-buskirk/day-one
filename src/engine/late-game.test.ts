import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, eligibleActions } from "./index";

const ids = (s: ReturnType<typeof createRun>) => new Set(eligibleActions(s, corpus).map((e) => e.id));

// Second-stage content: things to do once the basics are handled, so builds that stabilize
// early aren't left idling. Gated on stability so they don't clutter the survival phase.
describe("late-game content (for builds that stabilize)", () => {
  it("the job-gated 'second stage' appears once employed, not before", () => {
    const STAGE2 = ["evt_court_debt", "evt_health_deferred", "evt_give_back"];
    const fresh = createRun(corpus, "marcus", { seed: 1 }); // no job yet
    const before = ids(fresh);
    for (const id of STAGE2) expect(before.has(id)).toBe(false);

    const employed = { ...fresh, flags: { ...fresh.flags, has_job: true } };
    const after = ids(employed);
    for (const id of STAGE2) expect(after.has(id)).toBe(true);
  });

  it("record sealing is a late milestone — needs an ID, good standing, and clean time", () => {
    const base = createRun(corpus, "marcus", { seed: 1 });
    const withStanding = (turn: number) => ({
      ...base,
      turn,
      flags: { ...base.flags, has_state_id: true },
      tracks: { ...base.tracks, legal: { ...base.tracks.legal, readiness: 60 } },
    });
    expect(ids(withStanding(5)).has("evt_record_sealing")).toBe(false); // too early (turn < 9)
    expect(ids(withStanding(10)).has("evt_record_sealing")).toBe(true); // earned it
  });

  it("early termination needs supervision, good standing, and clean time", () => {
    const base = createRun(corpus, "marcus", { seed: 1 }); // on parole
    const supervised = (turn: number) => ({
      ...base,
      turn,
      tracks: { ...base.tracks, legal: { ...base.tracks.legal, readiness: 70 } },
    });
    expect(ids(supervised(6)).has("evt_off_supervision")).toBe(false); // too early
    expect(ids(supervised(11)).has("evt_off_supervision")).toBe(true); // earned it
    // An already-unsupervised build (Cal: supervision none) never sees it:
    const cal = createRun(corpus, "cal", { seed: 1 });
    const calLate = { ...cal, turn: 11, tracks: { ...cal.tracks, legal: { ...cal.tracks.legal, readiness: 70 } } };
    expect(ids(calLate).has("evt_off_supervision")).toBe(false);
  });

  it("mending family ties opens once stable (employed), not before", () => {
    const fresh = createRun(corpus, "marcus", { seed: 1 });
    expect(ids(fresh).has("evt_mend_family")).toBe(false);
    expect(ids({ ...fresh, flags: { ...fresh.flags, has_job: true } }).has("evt_mend_family")).toBe(true);
  });
});
