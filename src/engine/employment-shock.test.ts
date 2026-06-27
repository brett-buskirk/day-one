import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, beginTurn, resolveChoice } from "./index";

// A promotion-or-layoff shock for employed builds (real job volatility). Scheduled at
// chargen, but beginTurn holds it until has_job — so it lands while employed, or not at all.
describe("employment shock (promotion or layoff)", () => {
  it("waits for a job — fires only while employed, otherwise re-queues", () => {
    const base = createRun(corpus, "marcus", { seed: 1 });
    const at6 = (hasJob: boolean) => ({
      ...base,
      turn: 6,
      flags: { ...base.flags, has_job: hasJob },
      scheduled: [{ event: "evt_promotion", onTurn: 6 }],
    });

    const unemployed = beginTurn(at6(false), corpus);
    expect(unemployed.pending).not.toContain("evt_promotion"); // doesn't fire with no job
    expect(unemployed.scheduled.some((s) => s.event === "evt_promotion")).toBe(true); // waits

    const employed = beginTurn(at6(true), corpus);
    expect(employed.pending).toContain("evt_promotion"); // lands once employed
  });

  it("a promotion raises the weekly paycheck", () => {
    const base = createRun(corpus, "marcus", { seed: 1 });
    const wageRun = (promoted: boolean) =>
      beginTurn(
        { ...base, turn: 6, scheduled: [], flags: { ...base.flags, has_job: true, promoted } },
        corpus,
      );
    expect(wageRun(true).pools.money).toBeGreaterThan(wageRun(false).pools.money);
  });

  it("a layoff ends employment", () => {
    const base = createRun(corpus, "gloria", { seed: 1 });
    const employed = { ...base, flags: { ...base.flags, has_job: true } };
    const layoff = corpus.events["evt_layoff"];
    const takeHit = layoff.choices.find((c) => c.id === "take_the_hit")!;
    expect(resolveChoice(employed, layoff, takeHit, corpus).flags.has_job).toBe(false);
  });
});
