import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, beginTurn } from "./index";
import { HOME_DETENTION_FEE } from "./tuning";

describe("home detention", () => {
  it("Dana starts on home detention — a standing-slot tax and the fee flag", () => {
    const dana = createRun(corpus, "dana", { seed: 1 });
    expect(dana.flags.owes_home_detention_fees).toBe(true);
    expect(dana.standingSlots).toBeGreaterThanOrEqual(1); // the restriction eats a day
    // A build not on home detention doesn't owe it:
    expect(createRun(corpus, "marcus", { seed: 1 }).flags.owes_home_detention_fees).toBeFalsy();
  });

  it("the monitoring fee drains money every week (from week 2)", () => {
    const dana = createRun(corpus, "dana", { seed: 1 });
    const at = { ...dana, turn: 2, pools: { ...dana.pools, money: 50 } };
    expect(beginTurn(at, corpus).pools.money).toBe(50 - HOME_DETENTION_FEE);
  });

  it("a surprise home visit is scheduled for supervised builds, not the unsupervised one", () => {
    const dana = createRun(corpus, "dana", { seed: 1 }); // on probation
    expect(dana.scheduled.some((x) => x.event === "evt_home_visit")).toBe(true);
    const cal = createRun(corpus, "cal", { seed: 1 }); // supervision: none
    expect(cal.scheduled.some((x) => x.event === "evt_home_visit")).toBe(false);
  });
});
