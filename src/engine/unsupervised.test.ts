import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, eligibleActions, dueObligations } from "./index";

// The max-out build (Cal): no supervision, and the engine should reflect that
// straight from the origin data — full week, no check-ins, no fees.
describe("unsupervised (max-out) build — Cal", () => {
  const cal = () => createRun(corpus, "cal", { seed: 1 });

  it("starts legally unsupervised", () => {
    expect(cal().tracks.legal.status).toBe("unsupervised");
  });

  it("carries no supervision slot tax — a full week of slots", () => {
    const s = cal();
    expect(s.standingSlots).toBe(0);
    expect(s.slots).toBe(s.baseSlots);
  });

  it("is never handed a parole or probation check-in", () => {
    const s = cal();
    const actionable = [
      ...eligibleActions(s, corpus).map((e) => e.id),
      ...dueObligations(s, corpus).map((e) => e.id),
    ];
    expect(actionable).not.toContain("evt_parole_checkin");
    expect(actionable).not.toContain("evt_probation_checkin");
  });

  it("owes no supervision fees", () => {
    expect(cal().flags.owes_supervision_fees).toBeFalsy();
  });
});
