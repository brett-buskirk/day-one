// Registry employment wall (DESIGN §8): the registry requirement reshapes
// employment as well as housing.

import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, eligibleActions, isChoiceUnlocked, resolveChoice } from "./engine";
import { buildDebrief } from "./debrief";
import type { GameState } from "./types";

const resolveById = (s: GameState, eventId: string, choiceId: string) => {
  const e = corpus.events[eventId];
  return resolveChoice(s, e, e.choices.find((c) => c.id === choiceId)!, corpus);
};

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

describe("decision-quality tags (§10)", () => {
  it("records the chosen path's quality on the log entry", () => {
    let s = createRun(corpus, "marcus", { seed: 1 });
    s = resolveById(s, "evt_parole_checkin", "make_checkin"); // durable
    expect(s.log[s.log.length - 1].quality).toBe("durable");
    s = resolveById(s, "evt_dmv_state_id", "try_anyway"); // desperate
    expect(s.log[s.log.length - 1].quality).toBe("desperate");
  });

  it("leaves untagged (non-fork) choices unmarked", () => {
    let s = createRun(corpus, "marcus", { seed: 1 });
    s = resolveById(s, "evt_day_labor", "work_the_day"); // single-choice, untagged
    expect(s.log[s.log.length - 1].quality).toBeUndefined();
  });

  it("the debrief tallies durable vs desperate from the log", () => {
    let s = createRun(corpus, "marcus", { seed: 1 });
    s = resolveById(s, "evt_parole_checkin", "make_checkin"); // durable
    s = resolveById(s, "evt_dmv_state_id", "try_anyway"); // desperate
    const d = buildDebrief(s, "Marcus");
    expect(d.decisions.durable).toBeGreaterThanOrEqual(1);
    expect(d.decisions.desperate).toBeGreaterThanOrEqual(1);
  });
});
