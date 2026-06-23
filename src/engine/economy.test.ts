import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, beginTurn, resolveChoice, eligibleActions } from "./index";
import { WEEKLY_WAGE } from "./tuning";

const eligibleIds = (s: ReturnType<typeof createRun>) =>
  new Set(eligibleActions(s, corpus).map((e) => e.id));

// A job has to actually pay — without a recurring wage, landing one was an economic
// dead-end (it retires day labor but paid nothing). Income comes after the ID, so it
// never loosens the early money gate.
describe("the job economy", () => {
  it("a job pays a weekly wage; no job, no wage", () => {
    const base = createRun(corpus, "marcus", { seed: 1 });
    // Turn 2 = no monthly tick and nothing scheduled — isolate the wage.
    const employed = { ...base, turn: 2, flags: { ...base.flags, has_job: true }, pools: { ...base.pools, money: 40 } };
    expect(beginTurn(employed, corpus).pools.money).toBe(40 + WEEKLY_WAGE);
    const jobless = { ...base, turn: 2, pools: { ...base.pools, money: 40 } };
    expect(beginTurn(jobless, corpus).pools.money).toBe(40);
  });

  it("a survival gig ('whatever pays') pays but doesn't lock you into a no-pay job", () => {
    const s0 = createRun(corpus, "marcus", { seed: 1 });
    const s = { ...s0, flags: { ...s0.flags, has_state_id: true } }; // unlock the onboarding event
    const e = corpus.events["evt_apply_job_onboarding"];
    const gig = e.choices.find((c) => c.id === "apply_broadly")!;
    const after = resolveChoice(s, e, gig, corpus);
    expect(after.flags.has_job).toBeFalsy(); // a gig, not a job
    expect(after.pools.money).toBeGreaterThan(s.pools.money); // it still paid this week
    expect(eligibleIds(after).has("evt_day_labor")).toBe(true); // day labor still open
    // The real job isn't locked out — its gate (has_job == false) still holds, so it's
    // back next turn (this turn it's just hidden by the once-per-turn rule).
    expect(eligibleIds({ ...after, actedThisTurn: [] }).has("evt_apply_job_onboarding")).toBe(true);
  });

  it("the real dev job still grants has_job (→ the weekly wage)", () => {
    const onboard = corpus.events["evt_apply_job_onboarding"].choices.find((c) => c.id === "onboard_dev")!;
    expect(onboard.outcomes.some((o) => o.effects?.flags?.has_job === true)).toBe(true);
  });

  it("the dev onboarding is web-dev-only; everyone else gets the generic job path", () => {
    const withId = (id: string) => {
      const s = createRun(corpus, id, { seed: 1 });
      return eligibleIds({ ...s, flags: { ...s.flags, has_state_id: true } });
    };
    // Marcus (web-dev cert) → the dev gig, not the generic path:
    expect(withId("marcus").has("evt_apply_job_onboarding")).toBe(true);
    expect(withId("marcus").has("evt_get_hired")).toBe(false);
    // Tasha (a CNA, no web-dev cert) → generic steady work, never the nonsensical dev gig:
    expect(withId("tasha").has("evt_get_hired")).toBe(true);
    expect(withId("tasha").has("evt_apply_job_onboarding")).toBe(false);
  });
});
