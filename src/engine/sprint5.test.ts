// Registry employment wall (DESIGN §8): the registry requirement reshapes
// employment as well as housing.

import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, eligibleActions, isChoiceUnlocked } from "./engine";
import type { GameState } from "./types";

// Both job events gate on has_state_id; grant it to inspect the employment paths.
const withId = (id: string, opts: Parameters<typeof createRun>[2]): GameState => {
  const s = createRun(corpus, id, opts);
  return { ...s, flags: { ...s.flags, has_state_id: true } };
};
const eligibleIds = (s: GameState) => new Set(eligibleActions(s, corpus).map((e) => e.id));

describe("registry employment wall (§8)", () => {
  it("a non-registry build with an ID gets the open hiring path", () => {
    const marcus = eligibleIds(withId("marcus", { seed: 1 }));
    expect(marcus).toContain("evt_apply_job_onboarding");
    expect(marcus).not.toContain("evt_job_registry");
  });

  it("a registry build with an ID faces the registry job event instead", () => {
    const theo = eligibleIds(withId("theo", { seed: 1, mode: "empathy", hardFail: true }));
    expect(theo).toContain("evt_job_registry");
    expect(theo).not.toContain("evt_apply_job_onboarding");
  });

  it("the fair-chance route is gated behind doing the résumé workshop", () => {
    const s = withId("theo", { seed: 1, mode: "empathy", hardFail: true });
    const event = corpus.events["evt_job_registry"];
    const secondChance = event.choices.find((c) => c.id === "second_chance_employer")!;
    const openMarket = event.choices.find((c) => c.id === "apply_broadly")!;

    expect(isChoiceUnlocked(s, secondChance)).toBe(false); // no résumé yet → locked
    expect(isChoiceUnlocked(s, openMarket)).toBe(true); // always tryable (and mostly denied)

    const withResume = { ...s, flags: { ...s.flags, has_resume: true } };
    expect(isChoiceUnlocked(withResume, secondChance)).toBe(true);
  });

  it("cash day labor stays open to registry builds as the survival floor", () => {
    const theo = eligibleIds(createRun(corpus, "theo", { seed: 1 }));
    expect(theo).toContain("evt_day_labor"); // no ID needed, no background check
  });
});
