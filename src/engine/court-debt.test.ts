import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, beginTurn, eligibleActions } from "./index";

// Court debt (LFOs) shouldn't be free to ignore: once you're earning and haven't set up a
// payment plan, the court garnishes your wages each month. A plan = compliance = no garnish.
describe("court debt (LFOs) — ignoring it has teeth", () => {
  const garnished = (s: ReturnType<typeof createRun>) =>
    s.log.some((l) => l.choiceId === "court_garnishment");

  it("everyone owes it; the garnishment hits only the employed who haven't set up a plan", () => {
    const base = createRun(corpus, "marcus", { seed: 1 });
    expect(base.flags.owes_court_debt).toBe(true);

    const atTurn4 = (extra: Record<string, boolean>) =>
      beginTurn(
        {
          ...base,
          turn: 4, // a monthly tick
          flags: { ...base.flags, has_benefits: false, owes_supervision_fees: false, owes_home_detention_fees: false, ...extra },
          pools: { ...base.pools, money: 60 },
        },
        corpus
      );

    const ignored = atTurn4({ has_job: true, on_payment_plan: false });
    const compliant = atTurn4({ has_job: true, on_payment_plan: true });
    const noJob = atTurn4({ has_job: false });

    expect(garnished(ignored)).toBe(true); // employed + ignoring -> garnished
    expect(garnished(compliant)).toBe(false); // a plan keeps it off your check
    expect(garnished(noJob)).toBe(false); // no wages to garnish
    // Compliance is cheaper than getting garnished (same wage in, no forced bite out):
    expect(compliant.pools.money).toBeGreaterThan(ignored.pools.money);
  });

  it("setting up a payment plan retires the court-debt action — you've handled it", () => {
    const base = createRun(corpus, "marcus", { seed: 1 });
    const employed = { ...base, flags: { ...base.flags, has_job: true } };
    expect(eligibleActions(employed, corpus).some((e) => e.id === "evt_court_debt")).toBe(true);
    const onPlan = { ...employed, flags: { ...employed.flags, on_payment_plan: true } };
    expect(eligibleActions(onPlan, corpus).some((e) => e.id === "evt_court_debt")).toBe(false);
  });
});
