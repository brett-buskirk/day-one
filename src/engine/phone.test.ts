import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, beginTurn, eligibleActions, isChoiceUnlocked } from "./index";
import { PHONE_PLAN_FEE } from "./tuning";

const eligibleIds = (s: ReturnType<typeof createRun>) =>
  new Set(eligibleActions(s, corpus).map((e) => e.id));

// Phase 1: a phone is a recurring *cost* (the plan), not a hard gate. Some come home
// with one (and the bill), some don't; the Lifeline subsidized phone carries no bill.
describe("the phone (a recurring cost, not a gate)", () => {
  it("some builds come home with a phone (+ a plan bill), some without", () => {
    const gloria = createRun(corpus, "gloria", { seed: 1 });
    expect(gloria.flags.has_phone).toBe(true);
    expect(gloria.flags.owes_phone_plan).toBe(true);
    expect(createRun(corpus, "marcus", { seed: 1 }).flags.has_phone).toBeFalsy();
  });

  it("phone-less builds can get one; Lifeline grants a phone with no monthly bill", () => {
    expect(eligibleIds(createRun(corpus, "marcus", { seed: 1 })).has("evt_get_phone")).toBe(true);
    const lifeline = corpus.events["evt_get_phone"].choices.find((c) => c.id === "lifeline_program")!;
    expect(lifeline.outcomes.some((o) => o.effects?.flags?.has_phone === true)).toBe(true);
    expect(lifeline.outcomes.some((o) => o.effects?.flags?.owes_phone_plan === true)).toBe(false);
  });

  it("the plan charges monthly, and the phone is shut off if you can't pay", () => {
    const base = createRun(corpus, "marcus", { seed: 1 });
    const atTurn4 = (money: number) =>
      beginTurn(
        {
          ...base,
          turn: 4,
          flags: {
            ...base.flags,
            has_phone: true,
            owes_phone_plan: true,
            has_job: false, // isolate the phone plan from the wage and other fees
            has_benefits: false,
            has_transit_pass: false,
            owes_supervision_fees: false,
            owes_home_detention_fees: false,
          },
          pools: { ...base.pools, money },
        },
        corpus
      );
    const paid = atTurn4(60);
    expect(paid.pools.money).toBe(60 - PHONE_PLAN_FEE);
    expect(paid.flags.has_phone).toBe(true);
    const broke = atTurn4(0);
    expect(broke.flags.has_phone).toBe(false);
    expect(broke.flags.owes_phone_plan).toBe(false);
  });

  it("a phone unlocks remote legwork ('Work the phone') — a soft edge, not a gate", () => {
    // Phase 2: the phone *pays off* but never blocks. The action is offered with a phone,
    // absent without one — but the phone-less still have every in-person path.
    expect(eligibleIds(createRun(corpus, "gloria", { seed: 1 })).has("evt_work_the_phone")).toBe(true);
    expect(eligibleIds(createRun(corpus, "marcus", { seed: 1 })).has("evt_work_the_phone")).toBe(false);
  });

  it("'Work the phone' swaps its choices by job state — hunt when jobless, maintain when employed", () => {
    const e = corpus.events["evt_work_the_phone"];
    const chase = e.choices.find((c) => c.id === "chase_leads")!;
    const maintain = e.choices.find((c) => c.id === "maintain_job")!;
    const base = createRun(corpus, "gloria", { seed: 1 }); // has a phone

    const jobless = { ...base, flags: { ...base.flags, has_job: false } };
    expect(isChoiceUnlocked(jobless, chase)).toBe(true);
    expect(isChoiceUnlocked(jobless, maintain)).toBe(false);

    const employed = { ...base, flags: { ...base.flags, has_job: true } };
    expect(isChoiceUnlocked(employed, chase)).toBe(false); // no more job-hunting once working
    expect(isChoiceUnlocked(employed, maintain)).toBe(true);
  });
});
