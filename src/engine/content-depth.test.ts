import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, eligibleActions, resolveChoice } from "./index";

// The v1.8.0 content-depth batch: new actions gated on what a build has earned, a predatory
// loan that comes due later, and a reunifying-only arrears notice.
describe("content-depth events gate on what a build has earned", () => {
  it("gig work needs a phone; civic return needs an ID; a small joy needs a little money", () => {
    const base = createRun(corpus, "marcus", { seed: 1 });
    const eligible = (flags: Record<string, boolean>, pools: Record<string, number> = {}) =>
      eligibleActions(
        { ...base, flags: { ...base.flags, ...flags }, pools: { ...base.pools, ...pools } },
        corpus,
      ).map((e) => e.id);

    expect(eligible({ has_phone: false })).not.toContain("evt_gig_work");
    expect(eligible({ has_phone: true })).toContain("evt_gig_work");
    expect(eligible({ has_state_id: false })).not.toContain("evt_civic_return");
    expect(eligible({ has_state_id: true })).toContain("evt_civic_return");
    expect(eligible({}, { money: 5 })).not.toContain("evt_small_joy");
    expect(eligible({}, { money: 50 })).toContain("evt_small_joy");
  });

  it("taking the predatory loan schedules its reckoning a few weeks out", () => {
    const base = createRun(corpus, "marcus", { seed: 1 });
    const offer = corpus.events["evt_predatory_offer"];
    const take = offer.choices.find((c) => c.id === "take_the_cash")!;
    const after = resolveChoice(base, offer, take, corpus);
    const loan = after.scheduled.find((s) => s.event === "evt_loan_due");
    expect(loan).toBeDefined();
    expect(loan!.onTurn).toBeGreaterThan(after.turn); // it comes due later, not the same week
  });

  it("the arrears notice is scheduled for a reunifying build only", () => {
    const tasha = createRun(corpus, "tasha", { seed: 1 }); // reunifying
    const marcus = createRun(corpus, "marcus", { seed: 1 }); // not
    expect(tasha.scheduled.some((s) => s.event === "evt_arrears_notice")).toBe(true);
    expect(marcus.scheduled.some((s) => s.event === "evt_arrears_notice")).toBe(false);
  });
});
