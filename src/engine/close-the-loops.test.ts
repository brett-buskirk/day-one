import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, beginTurn } from "./index";

// v1.8.0 "close the loops": the layoff's one-time cushion became a few-week unemployment bridge
// with a benefits cliff, and the arrears one-shot became a recurring child-support drain that a
// payment plan can ease.
describe("recurring unemployment benefit", () => {
  const base = createRun(corpus, "marcus", { seed: 1 });
  const onUI = (extra: Record<string, boolean> = {}) => ({
    ...base,
    turn: 6,
    scheduled: [],
    pending: [] as string[],
    flags: { ...base.flags, has_job: false, on_unemployment: true, ...extra },
  });

  it("pays a weekly check while you're between jobs", () => {
    const before = onUI();
    expect(beginTurn(before, corpus).pools.money).toBeGreaterThan(before.pools.money);
  });

  it("ends the moment you land work again (and clears the flag)", () => {
    expect(beginTurn(onUI({ has_job: true }), corpus).flags.on_unemployment).toBe(false);
  });

  it("stops the week the benefits-cliff card is up — it can't be farmed", () => {
    const before = { ...onUI(), pending: ["evt_ui_expires"] };
    expect(beginTurn(before, corpus).pools.money).toBe(before.pools.money); // no check that week
  });
});

describe("recurring child support", () => {
  it("a reunifying build owes it; a payment plan eases the monthly bite", () => {
    const tasha = createRun(corpus, "tasha", { seed: 1 });
    expect(tasha.flags.owes_child_support).toBe(true);
    const atTick = (plan: boolean) =>
      beginTurn(
        {
          ...tasha,
          turn: 8,
          scheduled: [],
          pending: [],
          pools: { ...tasha.pools, money: 80 }, // headroom so the drain difference shows, not a floor
          flags: { ...tasha.flags, child_support_plan: plan },
        },
        corpus,
      );
    expect(atTick(true).pools.money).toBeGreaterThan(atTick(false).pools.money); // the plan costs less
  });

  it("a non-reunifying build owes no child support", () => {
    expect(createRun(corpus, "marcus", { seed: 1 }).flags.owes_child_support).toBeFalsy();
  });
});
