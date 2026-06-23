import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, beginTurn, endTurn, eligibleActions } from "./index";
import { HOME_DETENTION_FEE } from "./tuning";

describe("home detention", () => {
  it("Dana's supervision *is* home detention — its own status, with its own check-in", () => {
    expect(corpus.characters.dana.supervision.type).toBe("home_detention");
    const dana = createRun(corpus, "dana", { seed: 1 });
    expect(dana.tracks.legal.status).toBe("home_detention"); // a first-class status, not probation
    const due = new Set(eligibleActions(dana, corpus).map((e) => e.id));
    expect(due).toContain("evt_home_detention_checkin"); // her own check-in, not the probation one
    expect(due).not.toContain("evt_probation_checkin");
    expect(dana.flags.owes_home_detention_fees).toBe(true);
    expect(dana.flags.owes_supervision_fees).toBeFalsy(); // not both — home detention only
    expect(dana.standingSlots).toBeGreaterThanOrEqual(1); // the restriction eats a day
    // Missing the check-in files a home-detention violation (its own, not "probation"):
    const ended = endTurn(dana, corpus);
    expect(ended.scheduled.some((x) => x.event === "evt_home_detention_violation")).toBe(true);
    // A build not on home detention doesn't owe the fee:
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
