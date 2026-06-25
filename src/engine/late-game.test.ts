import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, eligibleActions } from "./index";

const ids = (s: ReturnType<typeof createRun>) => new Set(eligibleActions(s, corpus).map((e) => e.id));

// Second-stage content: things to do once the basics are handled, so builds that stabilize
// early aren't left idling. Gated on stability so they don't clutter the survival phase.
describe("late-game content (for builds that stabilize)", () => {
  it("court debt bites as soon as you're earning; the enrichment arcs wait a few weeks", () => {
    const fresh = createRun(corpus, "marcus", { seed: 1 }); // no job yet
    const before = ids(fresh);
    for (const id of ["evt_court_debt", "evt_health_deferred", "evt_give_back"]) {
      expect(before.has(id)).toBe(false);
    }

    // Employed in week 1: court debt is live (it bites once earning); the enrichment arcs aren't.
    const earlyEmployed = ids({ ...fresh, turn: 1, flags: { ...fresh.flags, has_job: true } });
    expect(earlyEmployed.has("evt_court_debt")).toBe(true);
    expect(earlyEmployed.has("evt_health_deferred")).toBe(false);
    expect(earlyEmployed.has("evt_give_back")).toBe(false);

    // Employed and a few weeks in (turn >= 6): the enrichment arcs open too.
    const stable = ids({ ...fresh, turn: 6, flags: { ...fresh.flags, has_job: true } });
    for (const id of ["evt_health_deferred", "evt_give_back"]) expect(stable.has(id)).toBe(true);
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

  it("mending family ties opens once stable — employed and a few weeks in", () => {
    const fresh = createRun(corpus, "marcus", { seed: 1 });
    expect(ids(fresh).has("evt_mend_family")).toBe(false); // no job
    // Employed but week 1 — still the survival phase, not yet.
    expect(ids({ ...fresh, turn: 1, flags: { ...fresh.flags, has_job: true } }).has("evt_mend_family")).toBe(false);
    // Employed and a few weeks in — open.
    expect(ids({ ...fresh, turn: 6, flags: { ...fresh.flags, has_job: true } }).has("evt_mend_family")).toBe(true);
  });
});
