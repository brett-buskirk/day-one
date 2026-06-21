import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, eligibleActions } from "./index";

// Gating for the transportation/housing content added in the content-breadth pass.
describe("transportation + housing content gating", () => {
  const eligibleIds = (characterId: string) =>
    eligibleActions(createRun(corpus, characterId, { seed: 1 }), corpus).map((e) => e.id);

  it("offers a bike to a low-transportation build", () => {
    expect(eligibleIds("ray")).toContain("evt_get_bike"); // Ray starts with no transport
  });

  it("hides license restoration from a tech-gap (long-timer) build", () => {
    // Ray was inside 24 years; a 'suspended license' framing doesn't fit (tech_gap).
    expect(eligibleIds("ray")).not.toContain("evt_license_restore");
  });

  it("offers license restoration to a recent build that can't drive", () => {
    expect(eligibleIds("marcus")).toContain("evt_license_restore");
  });

  it("offers recovery housing to an in-recovery build", () => {
    // Marcus starts in recovery support, on a couch, with no registry bar.
    expect(eligibleIds("marcus")).toContain("evt_recovery_housing");
  });

  it("routes registry builds away from open housing (incl. recovery housing)", () => {
    // Theo carries a registry requirement → open-market housing is gated off.
    expect(eligibleIds("theo")).not.toContain("evt_recovery_housing");
  });

  it("housing rungs retire once you've climbed to them (the ladder)", () => {
    const base = createRun(corpus, "marcus", { seed: 1 });
    expect(base.tracks.housing.readiness).toBe(2); // couch = rank 2
    const ids = (s: typeof base) => eligibleActions(s, corpus).map((e) => e.id);
    expect(ids(base)).toContain("evt_housing_search"); // transitional offered from the couch
    // In transitional housing (rank 3): the transitional rungs retire, the rental remains.
    const inTransitional = { ...base, tracks: { ...base.tracks, housing: { status: "transitional", readiness: 3 } } };
    expect(ids(inTransitional)).not.toContain("evt_housing_search");
    expect(ids(inTransitional)).not.toContain("evt_recovery_housing");
    expect(ids(inTransitional)).toContain("evt_own_place");
    // In a real rental (rank 4): the rental rung retires too.
    const inRental = { ...base, tracks: { ...base.tracks, housing: { status: "rental", readiness: 4 } } };
    expect(ids(inRental)).not.toContain("evt_own_place");
  });
});
