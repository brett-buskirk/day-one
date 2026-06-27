import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, eligibleActions } from "./index";

// Hector — the 10th build: a justice-involved veteran. The VA is his distinctive support
// (benefits + healthcare at chargen); PTSD, a service injury, and self-medication are the wounds.
describe("the veteran build (Hector)", () => {
  const hector = createRun(corpus, "hector", { seed: 1 });

  it("comes home with the VA's support and the war's wounds", () => {
    expect(hector.flags.veteran).toBe(true);
    expect(hector.flags.has_benefits).toBe(true); // VA stipend
    expect(hector.flags.has_clinic).toBe(true); // VA healthcare
    expect(hector.flags.chronic_mental_health).toBe(true); // PTSD
    expect(hector.flags.in_recovery_support).toBe(true); // self-medication -> recovery
    expect(hector.flags.has_state_id).toBe(true); // kept his ID — his walls are elsewhere
  });

  it("unlocks the VSO + VA-claim content; other builds don't see it", () => {
    const his = eligibleActions(hector, corpus).map((e) => e.id);
    expect(his).toContain("evt_vso_support");
    expect(his).toContain("evt_va_claim");
    const marcus = eligibleActions(createRun(corpus, "marcus", { seed: 1 }), corpus).map((e) => e.id);
    expect(marcus).not.toContain("evt_vso_support");
    expect(marcus).not.toContain("evt_va_claim");
  });
});
