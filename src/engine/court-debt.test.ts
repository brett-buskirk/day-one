import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, beginTurn, endTurn, eligibleActions, isRunOver } from "./index";
import { COURT_SUMMONS_AFTER } from "./tuning";

// Court debt (LFOs) shouldn't be free to ignore: once you're earning and haven't set up a
// payment plan, the court garnishes your paycheck *every week* — and letting it ride
// escalates to a bench warrant. A plan = compliance = none of it fires.
describe("court debt (LFOs) — ignoring it has teeth", () => {
  const garnished = (s: ReturnType<typeof createRun>) =>
    s.log.some((l) => l.choiceId === "court_garnishment");

  it("the weekly garnishment hits only the employed who haven't set up a plan", () => {
    const base = createRun(corpus, "marcus", { seed: 1 });
    expect(base.flags.owes_court_debt).toBe(true);

    const atWeek = (extra: Record<string, boolean>) =>
      beginTurn(
        {
          ...base,
          turn: 3, // any week past the first — the bite is weekly, not monthly
          flags: { ...base.flags, has_benefits: false, owes_supervision_fees: false, owes_home_detention_fees: false, ...extra },
          pools: { ...base.pools, money: 60 },
        },
        corpus
      );

    const ignored = atWeek({ has_job: true, on_payment_plan: false });
    const compliant = atWeek({ has_job: true, on_payment_plan: true });
    const noJob = atWeek({ has_job: false });

    expect(garnished(ignored)).toBe(true); // employed + ignoring -> garnished
    expect(garnished(compliant)).toBe(false); // a plan keeps it off your check
    expect(garnished(noJob)).toBe(false); // no wages to garnish
    expect(compliant.pools.money).toBeGreaterThan(ignored.pools.money); // compliance is cheaper
  });

  it("sustained ignoring escalates to a bench warrant (evt_court_summons)", () => {
    let s = createRun(corpus, "marcus", { seed: 1 });
    s = {
      ...s,
      flags: { ...s.flags, has_job: true, on_payment_plan: false, has_benefits: false, owes_supervision_fees: false, owes_home_detention_fees: false },
      pools: { ...s.pools, money: 100 },
    };
    for (let i = 0; i < COURT_SUMMONS_AFTER + 3 && !isRunOver(s); i++) {
      s = beginTurn(s, corpus); // the weekly garnishment lands here
      s = endTurn(s, corpus);
    }
    expect(s.log.filter((l) => l.choiceId === "court_garnishment").length).toBeGreaterThanOrEqual(COURT_SUMMONS_AFTER);
    const summons =
      s.scheduled.some((x) => x.event === "evt_court_summons") ||
      s.pending.includes("evt_court_summons") ||
      s.completed.includes("evt_court_summons");
    expect(summons).toBe(true);
  });

  it("setting up a payment plan retires the court-debt action — you've handled it", () => {
    const base = createRun(corpus, "marcus", { seed: 1 });
    const employed = { ...base, flags: { ...base.flags, has_job: true } };
    expect(eligibleActions(employed, corpus).some((e) => e.id === "evt_court_debt")).toBe(true);
    const onPlan = { ...employed, flags: { ...employed.flags, on_payment_plan: true } };
    expect(eligibleActions(onPlan, corpus).some((e) => e.id === "evt_court_debt")).toBe(false);
  });
});
