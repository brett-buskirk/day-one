// Sprint 3 — modes, archetypes, persistence/export hooks (DESIGN §8, §10, §13).

import { describe, it, expect } from "vitest";
import { corpus, archetypes } from "../content/corpus";
import { createRun, serializeRun, loadRun } from "./engine";
import { buildDebrief } from "./debrief";

describe("archetypes", () => {
  it("offers three builds in a deliberate order", () => {
    expect(archetypes.map((a) => a.id)).toEqual(["marcus", "renae", "theo"]);
  });

  it("every archetype chargens into a valid, in-bounds run", () => {
    for (const a of archetypes) {
      const s = createRun(corpus, a.id, { seed: 1 });
      expect(s.characterId).toBe(a.id);
      for (const v of Object.values(s.pools)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("the registry deep-end build (§8)", () => {
  it("sets the registry barrier flag and lands harder", () => {
    const s = createRun(corpus, "theo", { seed: 1, mode: "empathy", hardFail: true });
    expect(s.flags.registry_required).toBe(true);
    expect(s.tracks.housing.status).toBe("shelter");
    expect(s.tracks.relationships.status).toBe("isolated");
    expect(s.config.hardFail).toBe(true);
  });

  it("does not schedule rent for a non-rent-bearing (shelter) landing", () => {
    const s = createRun(corpus, "theo", { seed: 1 });
    expect(s.scheduled.some((x) => x.event === "evt_rent_due")).toBe(false);
  });

  it("a supported build keeps rent (couch) and lands easier than Marcus", () => {
    const renae = createRun(corpus, "renae", { seed: 1 });
    const marcus = createRun(corpus, "marcus", { seed: 1 });
    expect(renae.scheduled.some((x) => x.event === "evt_rent_due")).toBe(true);
    expect(renae.pools.social_capital).toBeGreaterThan(marcus.pools.social_capital);
    expect(renae.pools.money).toBeGreaterThan(marcus.pools.money);
    expect(renae.flags.registry_required).toBeUndefined();
  });
});

describe("mode-aware debrief distinguishes the two audiences (§10)", () => {
  it("training surfaces resources; empathy surfaces reflection prompts", () => {
    const training = buildDebrief(createRun(corpus, "marcus", { seed: 1, mode: "training" }), "Marcus");
    const empathy = buildDebrief(createRun(corpus, "theo", { seed: 1, mode: "empathy", hardFail: true }), "Theo");
    expect(training.framing.showResources).toBe(true);
    expect(empathy.framing.prompts.length).toBeGreaterThan(0);
  });
});

describe("resource-pointer hook (§10)", () => {
  it("the corpus carries a resources array (empty by default)", () => {
    expect(Array.isArray(corpus.resources)).toBe(true);
  });
});

describe("run export/import (§13)", () => {
  it("a serialized run re-imports to an identical state", () => {
    const s = createRun(corpus, "theo", { seed: 123, mode: "empathy", hardFail: true });
    expect(loadRun(serializeRun(s))).toEqual(s);
  });
});
