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
});
