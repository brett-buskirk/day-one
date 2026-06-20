// The Longtimer (Ray) + the tech-gap and mental-health rules.

import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import {
  createRun,
  beginTurn,
  endTurn,
  eligibleActions,
  isChoiceUnlocked,
  resolveChoice,
} from "./engine";
import type { GameState } from "./types";

const eligibleIds = (s: GameState) => new Set(eligibleActions(s, corpus).map((e) => e.id));
const resolveById = (s: GameState, eventId: string, choiceId: string) => {
  const e = corpus.events[eventId];
  return resolveChoice(s, e, e.choices.find((c) => c.id === choiceId)!, corpus);
};

describe("the Longtimer build (Ray)", () => {
  it("derives the long-stretch barriers from the origin", () => {
    const ray = createRun(corpus, "ray", { seed: 1, mode: "empathy", hardFail: true });
    expect(ray.flags.registry_required).toBe(true);
    expect(ray.flags.tech_gap).toBe(true); // 24 years inside ≥ threshold
    expect(ray.flags.chronic_mental_health).toBe(true);
    expect(ray.tracks.relationships.status).toBe("isolated");
    expect(ray.pools.morale).toBeLessThan(20); // two decades inside
    expect(ray.flags.has_cert_hvac).toBe(true); // skills are real
  });

  it("a chronic mental-health condition schedules an early crisis", () => {
    let s = createRun(corpus, "ray", { seed: 1 });
    expect(s.scheduled.some((x) => x.event === "evt_mental_health_crisis")).toBe(true);
    while (s.turn < 3) s = beginTurn(endTurn(s, corpus), corpus);
    expect(s.pending).toContain("evt_mental_health_crisis");
  });
});

describe("the technology gap walls off skilled work until it's closed", () => {
  it("the skilled job route is locked while the gap is open, then opens", () => {
    // Give Ray an ID + résumé so only the tech gap is in question.
    let s = createRun(corpus, "ray", { seed: 1, mode: "empathy", hardFail: true });
    s = { ...s, flags: { ...s.flags, has_state_id: true, has_resume: true } };

    const jobReg = corpus.events["evt_job_registry"];
    const fairChance = jobReg.choices.find((c) => c.id === "second_chance_employer")!;
    expect(isChoiceUnlocked(s, fairChance)).toBe(false); // tech gap blocks it

    expect(eligibleIds(s)).toContain("evt_digital_literacy"); // the way to close it
    s = resolveById(s, "evt_digital_literacy", "take_the_class");
    expect(s.flags.tech_gap).toBe(false);
    expect(isChoiceUnlocked(s, fairChance)).toBe(true); // now the door is open
    expect(eligibleIds(s)).not.toContain("evt_digital_literacy"); // and it retires
  });

  it("builds without a long stretch inside have no tech gap", () => {
    expect(createRun(corpus, "marcus", { seed: 1 }).flags.tech_gap).toBeFalsy();
  });
});

describe("mental-health crisis from the morale floor", () => {
  it("counseling is available to chronic builds and steadies morale", () => {
    const ray = createRun(corpus, "ray", { seed: 1 });
    expect(eligibleIds(ray)).toContain("evt_counseling");
    const after = resolveById(ray, "evt_counseling", "keep_the_appointment");
    expect(after.pools.morale).toBeGreaterThan(ray.pools.morale);
  });

  it("morale crossing the floor schedules a mental-health crisis", () => {
    let s = createRun(corpus, "marcus", { seed: 1 }); // morale 40, no chronic flag
    s = { ...s, pools: { ...s.pools, morale: 8 } }; // crashed this week
    s = endTurn(s, corpus);
    expect(s.scheduled.some((x) => x.event === "evt_mental_health_crisis")).toBe(true);
  });
});
